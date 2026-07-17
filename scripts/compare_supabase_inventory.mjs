#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function printUsage() {
  console.log(`Usage:
  node scripts/compare_supabase_inventory.mjs --source tmp/lovable-schema-inventory.json --target tmp/datamation-schema-inventory.json --out docs/supabase-schema-inventory-comparison.md

The JSON files should be the saved result of scripts/supabase_schema_inventory.sql.`);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function readInventory(file) {
  if (!existsSync(file)) {
    throw new Error(`Cannot find ${file}`);
  }

  const raw = readFileSync(file, "utf8").trim();
  const text = normalizeInventoryText(raw);
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${file} did not contain a JSON object`);
  }
  return parsed;
}

function normalizeInventoryText(raw) {
  if (raw.startsWith("{")) return raw;
  if (raw.startsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("| inventory_json")) {
    const lines = raw.split(/\r?\n/);
    const start = lines.findIndex((line) => line.trimStart().startsWith("| {"));
    if (start === -1) {
      throw new Error("Could not find JSON row in inventory table output.");
    }

    const jsonLines = lines.slice(start);
    jsonLines[0] = jsonLines[0].replace(/^\|\s?/, "");
    const last = jsonLines.length - 1;
    jsonLines[last] = jsonLines[last].replace(/\s?\|\s*$/, "");
    return jsonLines.join("\n");
  }

  const [firstLine, ...rest] = raw.split(/\r?\n/);
  if (firstLine?.trim() === "inventory_json") {
    const cell = rest.join("\n").trim();
    if (!cell.startsWith('"')) return cell;
    return cell.slice(1, -1).replaceAll('""', '"');
  }

  throw new Error("Unsupported inventory format. Expected raw JSON or an inventory_json one-column export.");
}

function keyBy(items, keyFn) {
  const map = new Map();
  for (const item of items ?? []) {
    map.set(keyFn(item), item);
  }
  return map;
}

function diffKeys(sourceMap, targetMap) {
  return {
    missing: [...sourceMap.keys()].filter((key) => !targetMap.has(key)).sort(),
    extra: [...targetMap.keys()].filter((key) => !sourceMap.has(key)).sort(),
  };
}

function table(headers, rows) {
  if (rows.length === 0) return "_None._\n";
  const escapedRows = rows.map((row) => row.map((cell) => String(cell ?? "").replaceAll("\n", "<br>")));
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...escapedRows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ].join("\n");
}

function section(title, sourceMap, targetMap) {
  const { missing, extra } = diffKeys(sourceMap, targetMap);
  return [
    `## ${title}`,
    "",
    `Source count: ${sourceMap.size}`,
    `Target count: ${targetMap.size}`,
    "",
    "### Missing in target",
    "",
    table(["Key"], missing.map((key) => [key])),
    "### Extra in target",
    "",
    table(["Key"], extra.map((key) => [key])),
  ].join("\n");
}

function changedColumns(sourceColumns, targetColumns) {
  const rows = [];
  for (const [key, source] of sourceColumns.entries()) {
    const target = targetColumns.get(key);
    if (!target) continue;

    const checks = [
      ["type", `${source.data_type}/${source.udt_name}`, `${target.data_type}/${target.udt_name}`],
      ["nullable", source.is_nullable, target.is_nullable],
      ["default", source.column_default ?? "", target.column_default ?? ""],
      ["identity", source.is_identity ?? "", target.is_identity ?? ""],
      ["generated", source.is_generated ?? "", target.is_generated ?? ""],
    ];

    for (const [field, sourceValue, targetValue] of checks) {
      if (sourceValue !== targetValue) {
        rows.push([key, field, sourceValue, targetValue]);
      }
    }
  }
  return rows;
}

const help = process.argv.includes("--help") || process.argv.includes("-h");
if (help) {
  printUsage();
  process.exit(0);
}

const sourceFile = readArg("--source");
const targetFile = readArg("--target");
const outFile = readArg("--out") ?? path.join("docs", "supabase-schema-inventory-comparison.md");

if (!sourceFile || !targetFile) {
  printUsage();
  process.exit(1);
}

const source = readInventory(sourceFile);
const target = readInventory(targetFile);

const sourceRelations = keyBy(source.relations, (r) => `${r.table_schema}.${r.table_name} (${r.relation_type})`);
const targetRelations = keyBy(target.relations, (r) => `${r.table_schema}.${r.table_name} (${r.relation_type})`);
const sourceColumns = keyBy(source.columns, (c) => `${c.table_schema}.${c.table_name}.${c.column_name}`);
const targetColumns = keyBy(target.columns, (c) => `${c.table_schema}.${c.table_name}.${c.column_name}`);
const sourceConstraints = keyBy(source.constraints, (c) => `${c.table_schema}.${c.table_name}.${c.constraint_name}`);
const targetConstraints = keyBy(target.constraints, (c) => `${c.table_schema}.${c.table_name}.${c.constraint_name}`);
const sourcePolicies = keyBy(source.policies, (p) => `${p.table_schema}.${p.table_name}.${p.policyname}`);
const targetPolicies = keyBy(target.policies, (p) => `${p.table_schema}.${p.table_name}.${p.policyname}`);
const sourceFunctions = keyBy(source.functions, (f) => `${f.function_schema}.${f.function_name}(${f.arguments})`);
const targetFunctions = keyBy(target.functions, (f) => `${f.function_schema}.${f.function_name}(${f.arguments})`);
const sourceBuckets = keyBy(source.storage_buckets, (b) => b.id ?? b.name);
const targetBuckets = keyBy(target.storage_buckets, (b) => b.id ?? b.name);

const changed = changedColumns(sourceColumns, targetColumns);

const markdown = [
  "# Supabase Schema Inventory Comparison",
  "",
  `Source inventory: \`${sourceFile}\``,
  `Target inventory: \`${targetFile}\``,
  `Generated: ${new Date().toISOString()}`,
  "",
  section("Relations", sourceRelations, targetRelations),
  section("Columns", sourceColumns, targetColumns),
  "## Changed Column Definitions",
  "",
  table(["Column", "Field", "Source", "Target"], changed),
  section("Constraints", sourceConstraints, targetConstraints),
  section("Policies", sourcePolicies, targetPolicies),
  section("Functions", sourceFunctions, targetFunctions),
  section("Storage Buckets", sourceBuckets, targetBuckets),
].join("\n");

writeFileSync(outFile, markdown);
console.log(`Wrote ${outFile}`);
