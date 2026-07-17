#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function printUsage() {
  console.log(`Usage:
  node scripts/render_supabase_inventory.mjs --file tmp/lovable-schema-inventory.json --out docs/lovable-schema-inventory.md`);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
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

function readInventory(file) {
  if (!existsSync(file)) throw new Error(`Cannot find ${file}`);
  return JSON.parse(normalizeInventoryText(readFileSync(file, "utf8").trim()));
}

function table(headers, rows) {
  if (rows.length === 0) return "_None._\n";
  return [
    `| ${headers.join(" |")} |`,
    `| ${headers.map(() => "---").join(" |")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("\n", "<br>").replaceAll("|", "\\|")).join(" |")} |`),
    "",
  ].join("\n");
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items ?? []) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function relationKey(row) {
  return `${row.table_schema}.${row.table_name}`;
}

function renderColumnType(column) {
  if (column.character_maximum_length) return `${column.data_type}(${column.character_maximum_length})`;
  if (column.numeric_precision && column.numeric_scale != null) return `${column.data_type}(${column.numeric_precision},${column.numeric_scale})`;
  return column.udt_schema && column.udt_schema !== "pg_catalog" ? `${column.udt_schema}.${column.udt_name}` : column.data_type;
}

const help = process.argv.includes("--help") || process.argv.includes("-h");
if (help) {
  printUsage();
  process.exit(0);
}

const file = readArg("--file");
const out = readArg("--out") ?? path.join("docs", "supabase-schema-inventory.md");
const title = readArg("--title") ?? (file?.toLowerCase().includes("datamation") ? "Datamation Supabase Schema Inventory" : "Lovable Cloud Schema Inventory");

if (!file) {
  printUsage();
  process.exit(1);
}

const inventory = readInventory(file);
const relations = [...(inventory.relations ?? [])].sort((a, b) => relationKey(a).localeCompare(relationKey(b)));
const columnsByRelation = groupBy(inventory.columns ?? [], (column) => `${column.table_schema}.${column.table_name}`);
const constraintsByRelation = groupBy(inventory.constraints ?? [], (constraint) => `${constraint.table_schema}.${constraint.table_name}`);
const indexesByRelation = groupBy(inventory.indexes ?? [], (index) => `${index.table_schema}.${index.table_name}`);
const policiesByRelation = groupBy(inventory.policies ?? [], (policy) => `${policy.table_schema}.${policy.table_name}`);
const triggersByRelation = groupBy(inventory.triggers ?? [], (trigger) => `${trigger.table_schema}.${trigger.table_name}`);

const summaryRows = relations.map((relation) => {
  const key = relationKey(relation);
  return [
    key,
    relation.relation_type,
    relation.rls_enabled ? "yes" : "no",
    relation.estimated_rows ?? "",
    (columnsByRelation.get(key) ?? []).length,
    (constraintsByRelation.get(key) ?? []).length,
    (indexesByRelation.get(key) ?? []).length,
    (policiesByRelation.get(key) ?? []).length,
  ];
});

const sections = [];
for (const relation of relations) {
  const key = relationKey(relation);
  const columns = [...(columnsByRelation.get(key) ?? [])].sort((a, b) => a.ordinal_position - b.ordinal_position);
  const constraints = constraintsByRelation.get(key) ?? [];
  const indexes = indexesByRelation.get(key) ?? [];
  const policies = policiesByRelation.get(key) ?? [];
  const triggers = triggersByRelation.get(key) ?? [];

  sections.push(
    `## ${key}`,
    "",
    `Type: ${relation.relation_type}`,
    `RLS enabled: ${relation.rls_enabled ? "yes" : "no"}`,
    `Estimated rows: ${relation.estimated_rows ?? "unknown"}`,
    "",
    "### Columns",
    "",
    table(
      ["#", "Column", "Type", "Nullable", "Default", "Identity", "Generated"],
      columns.map((column) => [
        column.ordinal_position,
        column.column_name,
        renderColumnType(column),
        column.is_nullable,
        column.column_default ?? "",
        column.is_identity ?? "",
        column.is_generated ?? "",
      ]),
    ),
    "### Constraints",
    "",
    table(
      ["Name", "Type", "Columns", "Foreign table", "Foreign columns"],
      constraints.map((constraint) => [
        constraint.constraint_name,
        constraint.constraint_type,
        (constraint.columns ?? []).join(", "),
        constraint.foreign_table_schema && constraint.foreign_table_name
          ? `${constraint.foreign_table_schema}.${constraint.foreign_table_name}`
          : "",
        (constraint.foreign_columns ?? []).join(", "),
      ]),
    ),
    "### Indexes",
    "",
    table(["Name", "Definition"], indexes.map((index) => [index.index_name, index.indexdef])),
    "### RLS Policies",
    "",
    table(
      ["Name", "Command", "Roles", "Using", "With check"],
      policies.map((policy) => [
        policy.policyname,
        policy.cmd,
        (policy.roles ?? []).join(", "),
        policy.qual ?? "",
        policy.with_check ?? "",
      ]),
    ),
    "### Triggers",
    "",
    table(
      ["Name", "Timing", "Event", "Orientation", "Statement"],
      triggers.map((trigger) => [
        trigger.trigger_name,
        trigger.action_timing,
        trigger.event_manipulation,
        trigger.action_orientation,
        trigger.action_statement,
      ]),
    ),
  );
}

const markdown = [
  `# ${title}`,
  "",
  `Source file: \`${file}\``,
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  table(
    ["Item", "Count"],
    [
      ["relations", inventory.relations?.length ?? 0],
      ["columns", inventory.columns?.length ?? 0],
      ["constraints", inventory.constraints?.length ?? 0],
      ["foreign keys", inventory.foreign_keys?.length ?? 0],
      ["indexes", inventory.indexes?.length ?? 0],
      ["RLS policies", inventory.policies?.length ?? 0],
      ["triggers", inventory.triggers?.length ?? 0],
      ["functions", inventory.functions?.length ?? 0],
      ["enum types", inventory.enum_values?.length ?? 0],
      ["extensions", inventory.extensions?.length ?? 0],
      ["publications", inventory.publications?.length ?? 0],
      ["storage buckets", inventory.storage_buckets?.length ?? 0],
    ],
  ),
  "## Relation Summary",
  "",
  table(
    ["Relation", "Type", "RLS", "Estimated rows", "Columns", "Constraints", "Indexes", "Policies"],
    summaryRows,
  ),
  "## Storage Buckets",
  "",
  table(
    ["Bucket", "Public", "File size limit", "Allowed MIME types"],
    (inventory.storage_buckets ?? []).map((bucket) => [
      bucket.id ?? bucket.name,
      bucket.public,
      bucket.file_size_limit ?? "",
      Array.isArray(bucket.allowed_mime_types) ? bucket.allowed_mime_types.join(", ") : bucket.allowed_mime_types ?? "",
    ]),
  ),
  "## Storage Object Counts",
  "",
  table(
    ["Bucket", "Object count"],
    (inventory.storage_object_counts ?? []).map((bucket) => [bucket.bucket_id, bucket.object_count]),
  ),
  ...sections,
].join("\n");

writeFileSync(out, markdown);
console.log(`Wrote ${out}`);
