import fs from "node:fs";
import path from "node:path";

type ConvertOptions = {
  schemaName: string;
};

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

  out.push("", "SET FOREIGN_KEY_CHECKS = 1;", "");
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

