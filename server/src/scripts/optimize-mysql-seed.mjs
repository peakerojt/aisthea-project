import fs from "node:fs";
import path from "node:path";

const inputArg = process.argv[2] ?? "server/database/03_seed_data_standard_fixed.mysql.sql";
const outputArg =
  process.argv[3] ??
  inputArg.replace(/\.mysql\.sql$/i, ".mysql.bulk.sql");
const batchSize = Number.parseInt(process.argv[4] ?? "250", 10);

if (!Number.isFinite(batchSize) || batchSize <= 0) {
  console.error("Batch size must be a positive integer.");
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
const outputPath = path.resolve(outputArg);
const fileBuffer = fs.readFileSync(inputPath);
const hasBom =
  fileBuffer.length >= 3 &&
  fileBuffer[0] === 0xef &&
  fileBuffer[1] === 0xbb &&
  fileBuffer[2] === 0xbf;
const content = hasBom ? fileBuffer.subarray(3).toString("utf8") : fileBuffer.toString("utf8");
const lines = content.split(/\r?\n/);
const insertRegex = /^(INSERT INTO `[^`]+`\s*\([^)]+\)\s*VALUES\s*)(.+);$/;

const outputLines = [];
let currentPrefix = null;
let currentValues = [];
let originalInsertCount = 0;
let optimizedInsertCount = 0;
let groupedRowCount = 0;

function flushCurrentGroup() {
  if (!currentPrefix || currentValues.length === 0) {
    currentPrefix = null;
    currentValues = [];
    return;
  }

  outputLines.push(`${currentPrefix}${currentValues.join(",")};`);
  optimizedInsertCount += 1;
  groupedRowCount += currentValues.length;
  currentPrefix = null;
  currentValues = [];
}

for (const line of lines) {
  const match = line.match(insertRegex);

  if (!match) {
    flushCurrentGroup();
    outputLines.push(line);
    continue;
  }

  const [, prefix, values] = match;
  originalInsertCount += 1;

  if (currentPrefix !== prefix || currentValues.length >= batchSize) {
    flushCurrentGroup();
    currentPrefix = prefix;
  }

  currentValues.push(values);
}

flushCurrentGroup();

const outputContent = outputLines.join("\r\n");
const outputBuffer = hasBom
  ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(outputContent, "utf8")])
  : Buffer.from(outputContent, "utf8");

fs.writeFileSync(outputPath, outputBuffer);

console.log(
  JSON.stringify(
    {
      input: inputPath,
      output: outputPath,
      batchSize,
      originalInsertCount,
      optimizedInsertCount,
      groupedRowCount,
      reducedBy: originalInsertCount - optimizedInsertCount,
    },
    null,
    2,
  ),
);
