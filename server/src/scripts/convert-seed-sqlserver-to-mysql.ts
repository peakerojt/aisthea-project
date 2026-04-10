import fs from "node:fs";
import path from "node:path";

type ConvertOptions = {
  schemaName: string;
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

function convertSqlServerSeedToMySql(input: string, opts: ConvertOptions): string {
  // Normalize newlines first
  let s = input.replace(/\r\n/g, "\n");

  const out: string[] = [];
  out.push(
    "-- =============================================================",
    "-- GENERATED FILE (MySQL)",
    "-- Source: server/database/03_seed_data_standard_fixed.sql (SQL Server)",
    `-- Target schema: ${opts.schemaName}`,
    "--",
    "-- Notes:",
    "-- - Removes SQL Server-only statements: USE [db], GO, PRINT, IF OBJECT_ID, DBCC CHECKIDENT, SET IDENTITY_INSERT",
    "-- - Keeps explicit identity values in INSERTs (MySQL allows inserting explicit AUTO_INCREMENT ids).",
    "-- - Converts bracket identifiers [X] -> `X`, removes dbo. prefix.",
    "-- - Converts Unicode string prefix N'...' -> '...'.",
    "-- =============================================================",
    "",
    `USE \`${opts.schemaName}\`;`,
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    ""
  );

  const lines = s.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const t = line.trim();

    if (!t) {
      out.push("");
      continue;
    }

    // Drop SQL Server batch separators and database selectors
    if (/^GO$/i.test(t)) continue;
    if (/^USE\s+\[.*\]\s*;?$/i.test(t)) continue;
    if (/^PRINT\s+/i.test(t)) continue;

    // Remove conditional deletes / identity reseed statements (we'll rely on raw DELETE/TRUNCATE if present).
    if (/^IF\s+OBJECT_ID\(/i.test(t)) {
      // Try to salvage the DELETE statement portion if it exists.
      const m = line.match(/DELETE\s+FROM\s+\[([^\]]+)\]\s*;?/i);
      if (m) {
        out.push(`DELETE FROM \`${m[1]}\`;`);
      }
      continue;
    }

    if (/^DBCC\s+CHECKIDENT/i.test(t)) {
      // Convert to MySQL AUTO_INCREMENT reset when possible.
      const m = line.match(/DBCC\s+CHECKIDENT\s*\(\s*'\[([^\]]+)\]'\s*,\s*RESEED\s*,\s*\d+\s*\)\s*;?/i);
      if (m) {
        out.push(`ALTER TABLE \`${m[1]}\` AUTO_INCREMENT = 1;`);
      }
      continue;
    }

    if (/^SET\s+IDENTITY_INSERT\s+/i.test(t)) {
      // MySQL doesn't support this; safe to remove (we keep explicit ids in INSERTs).
      continue;
    }

    // General conversions for remaining statements
    let converted = line;

    // dbo.Table -> Table
    converted = converted.replace(/\bdbo\./gi, "");

    // [Identifier] -> `Identifier`
    converted = converted.replace(/\[([^\]]+)\]/g, (_, name: string) => `\`${name}\``);

    // N'...' -> '...'
    converted = converted.replace(/\bN'([^']|'')*'/g, (m) => m.replace(/^N'/, "'"));

    // GETDATE() -> NOW()
    converted = converted.replace(/\bGETDATE\(\)/gi, "NOW()");

    out.push(converted);
  }

  out.push("", ...buildPostImportNormalizationBlock(), "", "SET FOREIGN_KEY_CHECKS = 1;", "");
  return out.join("\n");
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../..");
  const inputPath = path.resolve(repoRoot, "server/database/03_seed_data_standard_fixed.sql");
  const outputPath = path.resolve(repoRoot, "server/database/03_seed_data_standard_fixed.mysql.sql");

  const schemaName = process.env.MYSQL_SCHEMA?.trim() || "AISTHEA";

  const input = fs.readFileSync(inputPath, "utf8");
  const output = convertSqlServerSeedToMySql(input, { schemaName });
  fs.writeFileSync(outputPath, output, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Wrote: ${path.relative(repoRoot, outputPath)}`);
}

main();

