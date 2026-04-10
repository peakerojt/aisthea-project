import fs from "node:fs";
import path from "node:path";

type ParsedRow = {
  table: string;
  columns: string[];
  values: string[];
  source: string;
  order: number;
};

type BaselineTable = Map<string, Set<string>>;
type BaselineKeys = Map<string, Set<string>>;

const MYSQL_SCHEMA = process.env.MYSQL_SCHEMA?.trim() || "AISTHEA";
const SSMS_EXPORT_PATH =
  process.env.SSMS_EXPORT_PATH?.trim() || "D:\\SSMS\\scipt.sql";
const MYSQL_INSERT_MODE = process.env.MYSQL_INSERT_MODE?.trim() || "IGNORE";
const DEDUP_KEY_COLUMNS: Record<string, string[]> = {
  Attributes: ["AttributeId"],
  AttributeValues: ["ValueId"],
  Categories: ["CategoryId"],
  Products: ["ProductId"],
  ProductVariants: ["VariantId"],
  VariantAttributes: ["VariantId", "ValueId"],
  ProductImages: ["ImageId"],
};

function buildPostImportNormalizationBlock() {
  return [
    "-- Post-import normalization to keep legacy/derived tables aligned after SQL Server -> MySQL conversion.",
    "-- Keep legacy ProductVariants.StockQuantity aligned with the Inventory snapshot.",
    "UPDATE `ProductVariants` pv",
    "INNER JOIN `Inventory` i ON i.`VariantId` = pv.`VariantId`",
    "SET pv.`StockQuantity` = i.`AvailableQuantity`",
    "WHERE COALESCE(pv.`StockQuantity`, 0) <> COALESCE(i.`AvailableQuantity`, 0);",
    "",
    "-- Backfill missing VariantId references from SKU to reduce report drift after import.",
    "UPDATE `OrderItems` oi",
    "INNER JOIN `ProductVariants` pv ON pv.`SKU` = oi.`SKU`",
    "SET oi.`VariantId` = pv.`VariantId`",
    "WHERE oi.`VariantId` IS NULL;",
    "",
    "-- Align payment rows with completed refund outcomes imported from return/refund tables.",
    "UPDATE `Payments` p",
    "INNER JOIN `ReturnRequests` rr ON rr.`OrderId` = p.`OrderId`",
    "INNER JOIN `RefundTransactions` rt ON rt.`ReturnRequestId` = rr.`ReturnRequestId` AND rt.`Status` = 'COMPLETED'",
    "SET p.`Status` = 'REFUNDED'",
    "WHERE rr.`RefundStatus` = 'REFUNDED'",
    "  AND p.`Status` <> 'REFUNDED';",
    "",
    "-- Backfill manual shipment rows for shipping/delivered orders imported without Shipments.",
    "INSERT INTO `Shipments`",
    "  (`OrderId`, `Carrier`, `TrackingNumber`, `Eta`, `LastKnownLocation`, `CreatedAt`, `UpdatedAt`, `ShippingMode`, `Provider`, `ProviderOrderCode`, `ProviderStatus`, `DeliveryProofImages`, `DeliveryProofReviewed`)",
    "SELECT",
    "  o.`OrderId`,",
    "  'AISTHEA Manual Delivery',",
    "  NULL,",
    "  NULL,",
    "  NULL,",
    "  COALESCE(o.`UpdatedAt`, o.`CreatedAt`),",
    "  COALESCE(o.`UpdatedAt`, o.`CreatedAt`),",
    "  'manual',",
    "  NULL,",
    "  o.`OrderNumber`,",
    "  CASE",
    "    WHEN o.`Status` = 'Delivered' THEN 'DELIVERED'",
    "    WHEN o.`Status` = 'Shipping' THEN 'SHIPPING'",
    "    ELSE NULL",
    "  END,",
    "  '[]',",
    "  0",
    "FROM `Orders` o",
    "LEFT JOIN `Shipments` s ON s.`OrderId` = o.`OrderId`",
    "WHERE s.`OrderId` IS NULL",
    "  AND o.`Status` IN ('Shipping', 'Delivered');",
    "",
    "-- Ensure Inventory rows exist for variants referenced by open purchase orders.",
    "INSERT INTO `Inventory` (`VariantId`, `AvailableQuantity`, `ReservedQuantity`, `IncomingQuantity`, `UpdatedAt`)",
    "SELECT",
    "  pv.`VariantId`,",
    "  COALESCE(pv.`StockQuantity`, 0),",
    "  0,",
    "  poagg.`ExpectedIncoming`,",
    "  NOW()",
    "FROM `ProductVariants` pv",
    "INNER JOIN (",
    "  SELECT",
    "    poi.`VariantId`,",
    "    COALESCE(SUM(GREATEST(poi.`OrderedQty` - poi.`ReceivedQty`, 0)), 0) AS `ExpectedIncoming`",
    "  FROM `PurchaseOrderItems` poi",
    "  INNER JOIN `PurchaseOrders` po ON po.`PurchaseOrderId` = poi.`PurchaseOrderId`",
    "  WHERE po.`Status` IN ('PENDING', 'PARTIALLY_RECEIVED')",
    "  GROUP BY poi.`VariantId`",
    ") poagg ON poagg.`VariantId` = pv.`VariantId`",
    "LEFT JOIN `Inventory` i ON i.`VariantId` = pv.`VariantId`",
    "WHERE i.`VariantId` IS NULL;",
    "",
    "-- Keep Inventory.IncomingQuantity aligned with outstanding PO balances after import.",
    "UPDATE `Inventory` i",
    "LEFT JOIN (",
    "  SELECT",
    "    poi.`VariantId`,",
    "    COALESCE(SUM(GREATEST(poi.`OrderedQty` - poi.`ReceivedQty`, 0)), 0) AS `ExpectedIncoming`",
    "  FROM `PurchaseOrderItems` poi",
    "  INNER JOIN `PurchaseOrders` po ON po.`PurchaseOrderId` = poi.`PurchaseOrderId`",
    "  WHERE po.`Status` IN ('PENDING', 'PARTIALLY_RECEIVED')",
    "  GROUP BY poi.`VariantId`",
    ") poagg ON poagg.`VariantId` = i.`VariantId`",
    "SET i.`IncomingQuantity` = COALESCE(poagg.`ExpectedIncoming`, 0)",
    "WHERE COALESCE(i.`IncomingQuantity`, 0) <> COALESCE(poagg.`ExpectedIncoming`, 0);",
  ];
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const defaultMySqlBulkPath = path.resolve(
    repoRoot,
    "database/03_seed_data_standard_fixed.mysql.bulk.nobom.sql",
  );
  const outputPath = path.resolve(
    repoRoot,
    "database/03_seed_data_ssms_delta.mysql.sql",
  );

  const defaultMySqlRows = parseMySqlRows(
    fs.readFileSync(defaultMySqlBulkPath, "utf8"),
    "default-mysql-bulk",
  );
  const ssmsRows = parseSqlServerRows(
    fs.readFileSync(SSMS_EXPORT_PATH, "utf16le"),
    "ssms-export",
  );

  const { schemaBaseline, keyBaseline } = buildBaseline(defaultMySqlRows);
  const keptRows = filterRows(ssmsRows, schemaBaseline, keyBaseline);
  const sql = renderMySqlScript(keptRows);

  fs.writeFileSync(outputPath, sql, "utf8");

  const summary = summarizeRows(keptRows);
  console.log(`Wrote: ${path.relative(repoRoot, outputPath)}`);
  console.log(`Rows kept: ${keptRows.length}`);
  for (const [table, count] of summary) {
    console.log(`  ${table}: ${count}`);
  }
}

function parseSqlServerRows(content: string, source: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const insertPattern =
    /^INSERT(?:\s+INTO)?\s+(?:\[dbo\]\.)?\[([^\]]+)\]\s*\((.+?)\)\s*VALUES\s*\((.+)\)\s*;?\s*$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.toUpperCase().startsWith("INSERT")) continue;

    const match = trimmed.match(insertPattern);
    if (!match) continue;

    const table = match[1];
    const columns = splitValues(match[2]).map(stripIdentifier);
    const values = splitValues(match[3]);

    rows.push({
      table,
      columns,
      values,
      source,
      order: rows.length,
    });
  }

  return rows;
}

function parseMySqlRows(content: string, source: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const insertPattern =
    /^INSERT\s+INTO\s+`([^`]+)`\s*\((.+?)\)\s*VALUES\s*(.+)\s*;?\s*$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.toUpperCase().startsWith("INSERT INTO")) continue;

    const match = trimmed.match(insertPattern);
    if (!match) continue;

    const table = match[1];
    const columns = splitValues(match[2]).map(stripIdentifier);
    const tuples = splitTuples(match[3]);

    for (const tuple of tuples) {
      rows.push({
        table,
        columns,
        values: splitValues(tuple),
        source,
        order: rows.length,
      });
    }
  }

  return rows;
}

function buildBaseline(rows: ParsedRow[]): {
  schemaBaseline: Map<string, BaselineTable>;
  keyBaseline: BaselineKeys;
} {
  const schemaBaseline = new Map<string, BaselineTable>();
  const keyBaseline: BaselineKeys = new Map();

  for (const row of rows) {
    const tableMap = getOrCreate(schemaBaseline, row.table, () => new Map());
    const schemaKey = row.columns.join("|");
    const signatures = getOrCreate(tableMap, schemaKey, () => new Set());
    signatures.add(makeSignature(row.columns, row.columns, row.values));

    const keyColumns = DEDUP_KEY_COLUMNS[row.table];
    if (keyColumns && keyColumns.every((column) => row.columns.includes(column))) {
      const keySet = getOrCreate(keyBaseline, row.table, () => new Set());
      keySet.add(makeSignature(keyColumns, row.columns, row.values));
    }
  }

  return { schemaBaseline, keyBaseline };
}

function filterRows(
  rows: ParsedRow[],
  schemaBaseline: Map<string, BaselineTable>,
  keyBaseline: BaselineKeys,
): ParsedRow[] {
  const kept: ParsedRow[] = [];
  const seenFullRows = new Set<string>();

  for (const row of rows) {
    const fullSignature = `${row.table}::${makeSignature(
      row.columns,
      row.columns,
      row.values,
    )}`;

    if (seenFullRows.has(fullSignature)) {
      continue;
    }

    if (isDuplicate(row, schemaBaseline, keyBaseline)) {
      continue;
    }

    seenFullRows.add(fullSignature);
    kept.push(row);
  }

  return kept;
}

function isDuplicate(
  row: ParsedRow,
  schemaBaseline: Map<string, BaselineTable>,
  keyBaseline: BaselineKeys,
): boolean {
  const keyColumns = DEDUP_KEY_COLUMNS[row.table];
  if (keyColumns && keyColumns.every((column) => row.columns.includes(column))) {
    const keySet = keyBaseline.get(row.table);
    if (
      keySet &&
      keySet.has(makeSignature(keyColumns, row.columns, row.values))
    ) {
      return true;
    }
  }

  const tableMap = schemaBaseline.get(row.table);
  if (!tableMap) return false;

  for (const [schemaKey, signatures] of tableMap) {
    const compareColumns = schemaKey.split("|");
    if (!compareColumns.every((column) => row.columns.includes(column))) {
      continue;
    }

    const signature = makeSignature(compareColumns, row.columns, row.values);
    if (signatures.has(signature)) {
      return true;
    }
  }

  return false;
}

function renderMySqlScript(rows: ParsedRow[]): string {
  const out: string[] = [];
  const insertVerb =
    MYSQL_INSERT_MODE.toUpperCase() === "STRICT"
      ? "INSERT INTO"
      : "INSERT IGNORE INTO";

  out.push(
    "-- =============================================================",
    "-- GENERATED FILE (MySQL delta from SSMS export)",
    `-- Source export: ${SSMS_EXPORT_PATH}`,
    "-- Baseline excludes rows already found in:",
    "-- - server/database/03_seed_data_standard_fixed.mysql.bulk.nobom.sql",
    `-- Insert mode: ${insertVerb}`,
    "-- =============================================================",
    "",
    `USE \`${MYSQL_SCHEMA}\`;`,
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
  );

  const groups = groupConsecutiveRows(rows);
  for (const group of groups) {
    out.push(`-- ${group.table}: ${group.rows.length} row(s)`);

    const renderedRows = group.rows.map((row) => {
      const values = row.values.map(convertSqlServerValueToMySql).join(", ");
      return `(${values})`;
    });

    for (let index = 0; index < renderedRows.length; index += 200) {
      const chunk = renderedRows.slice(index, index + 200);
      out.push(
        `${insertVerb} \`${group.table}\` (${group.columns
          .map((column) => `\`${column}\``)
          .join(", ")}) VALUES ${chunk.join(",")};`,
      );
    }

    out.push("");
  }

  out.push(...buildPostImportNormalizationBlock(), "", "SET FOREIGN_KEY_CHECKS = 1;", "");
  return out.join("\n");
}

function groupConsecutiveRows(rows: ParsedRow[]) {
  const groups: { table: string; columns: string[]; rows: ParsedRow[] }[] = [];

  for (const row of rows) {
    const last = groups.at(-1);
    if (
      last &&
      last.table === row.table &&
      last.columns.join("|") === row.columns.join("|")
    ) {
      last.rows.push(row);
      continue;
    }

    groups.push({
      table: row.table,
      columns: row.columns,
      rows: [row],
    });
  }

  return groups;
}

function summarizeRows(rows: ParsedRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.table, (counts.get(row.table) || 0) + 1);
  }
  return [...counts.entries()];
}

function makeSignature(
  compareColumns: string[],
  rowColumns: string[],
  rowValues: string[],
): string {
  const columnIndexes = new Map<string, number>();
  rowColumns.forEach((column, index) => columnIndexes.set(column, index));

  return compareColumns
    .map((column) => {
      const index = columnIndexes.get(column);
      if (index === undefined) return `${column}=__MISSING__`;
      return `${column}=${normalizeValue(rowValues[index])}`;
    })
    .join("||");
}

function normalizeValue(token: string): string {
  let current = stripOuterCast(token.trim());

  if (/^NULL$/i.test(current)) {
    return "null";
  }

  if (/^N?'.*'$/s.test(current)) {
    let value = decodeSqlString(current);
    value = normalizeDateString(value);
    return `str:${value}`;
  }

  if (/^[+-]?\d+(?:\.\d+)?$/i.test(current)) {
    return `num:${normalizeNumber(current)}`;
  }

  return `raw:${current.replace(/\s+/g, " ").trim()}`;
}

function convertSqlServerValueToMySql(token: string): string {
  let current = stripOuterCast(token.trim());

  if (/^NULL$/i.test(current)) {
    return "NULL";
  }

  if (/^N?'.*'$/s.test(current)) {
    let value = decodeSqlString(current);
    value = normalizeDateString(value);
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (/^[+-]?\d+(?:\.\d+)?$/i.test(current)) {
    return normalizeNumber(current);
  }

  return current;
}

function stripOuterCast(token: string): string {
  let current = token.trim();

  while (/^CAST\s*\(/i.test(current) && current.endsWith(")")) {
    const inner = current.slice(current.indexOf("(") + 1, -1).trim();
    const splitIndex = findTopLevelAs(inner);
    if (splitIndex === -1) {
      break;
    }

    current = inner.slice(0, splitIndex).trim();
  }

  return current;
}

function findTopLevelAs(input: string): number {
  let depth = 0;
  let inString = false;

  for (let index = 0; index < input.length - 3; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "'") {
      if (inString && next === "'") {
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;

    if (
      depth === 0 &&
      input.slice(index, index + 4).toUpperCase() === " AS "
    ) {
      return index;
    }
  }

  return -1;
}

function splitTuples(input: string): string[] {
  const tuples: string[] = [];
  let depth = 0;
  let inString = false;
  let start = -1;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "'") {
      if (inString && next === "'") {
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "(") {
      if (depth === 0) start = index + 1;
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        tuples.push(input.slice(start, index));
        start = -1;
      }
    }
  }

  return tuples;
}

function splitValues(input: string): string[] {
  const values: string[] = [];
  let depth = 0;
  let inString = false;
  let buffer = "";

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "'") {
      buffer += char;
      if (inString && next === "'") {
        buffer += next;
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;

      if (char === "," && depth === 0) {
        values.push(buffer.trim());
        buffer = "";
        continue;
      }
    }

    buffer += char;
  }

  if (buffer.trim()) {
    values.push(buffer.trim());
  }

  return values;
}

function stripIdentifier(token: string): string {
  return token.trim().replace(/^[`[]|[`\]]$/g, "");
}

function decodeSqlString(token: string): string {
  const withoutPrefix = token.startsWith("N'") ? token.slice(2) : token.slice(1);
  return withoutPrefix.slice(0, -1).replace(/''/g, "'");
}

function normalizeDateString(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) {
    return value;
  }

  const normalized = value.replace("T", " ");
  return normalized
    .replace(/(\.\d{1,6})\d+$/, "$1")
    .replace(/\.0+$/, "");
}

function normalizeNumber(value: string): string {
  const normalized = value.trim().replace(/^\+/, "");
  if (!normalized.includes(".")) {
    return String(Number.parseInt(normalized, 10));
  }

  return normalized
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created = factory();
  map.set(key, created);
  return created;
}

main();
