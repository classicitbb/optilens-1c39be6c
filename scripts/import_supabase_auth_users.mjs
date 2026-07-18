#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function printUsage() {
  console.log(`Usage:
  node scripts/import_supabase_auth_users.mjs --file exports/auth-users.csv [--dry-run] [--out tmp/auth-user-id-map.csv]

Required environment:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY

Expected CSV columns:
  id,email,phone,raw_user_meta_data,raw_app_meta_data,password_hash,email_confirmed_at,phone_confirmed_at

Notes:
  - id is preserved when present.
  - password_hash is optional and only works if the source export includes it.
  - without password_hash, users should complete a password reset/invite flow before signing in.`);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function parseJsonCell(value, fallback = {}) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return fallback;
  }
}

const help = process.argv.includes("--help") || process.argv.includes("-h");
if (help) {
  printUsage();
  process.exit(0);
}

const file = readArg("--file");
const out = readArg("--out") ?? path.join("tmp", "auth-user-id-map.csv");
const dryRun = process.argv.includes("--dry-run");

if (!file) {
  console.error("Missing --file.");
  printUsage();
  process.exit(1);
}

if (!existsSync(file)) {
  console.error(`Cannot find ${file}.`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!dryRun && (!supabaseUrl || !serviceKey)) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY are required.");
  process.exit(1);
}

const rows = parseCsv(readFileSync(file, "utf8"));
if (rows.length < 2) {
  console.error("CSV must include a header row and at least one user row.");
  process.exit(1);
}

const headers = rows[0].map((header) => header.trim());
const records = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));

const client = dryRun
  ? null
  : createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

mkdirSync(path.dirname(out), { recursive: true });
const output = createWriteStream(out, { flags: "w" });
output.write(["old_id", "new_id", "email", "status", "message"].join(",") + "\n");

let ok = 0;
let failed = 0;

for (const record of records) {
  const oldId = record.id?.trim();
  const email = record.email?.trim();
  const phone = record.phone?.trim();

  if (!email && !phone) {
    failed += 1;
    output.write([oldId, "", "", "skipped", "missing email and phone"].map(csvEscape).join(",") + "\n");
    continue;
  }

  const attributes = {
    ...(oldId ? { id: oldId } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(record.password_hash?.trim() ? { password_hash: record.password_hash.trim() } : {}),
    user_metadata: parseJsonCell(record.raw_user_meta_data || record.user_metadata),
    app_metadata: parseJsonCell(record.raw_app_meta_data || record.app_metadata),
  };

  if (email) attributes.email_confirm = true;
  if (phone) attributes.phone_confirm = true;

  if (dryRun) {
    ok += 1;
    output.write([oldId, oldId, email, "dry-run", "not created"].map(csvEscape).join(",") + "\n");
    continue;
  }

  const { data, error } = await client.auth.admin.createUser(attributes);
  if (error) {
    failed += 1;
    output.write([oldId, "", email, "error", error.message].map(csvEscape).join(",") + "\n");
    continue;
  }

  ok += 1;
  output.write([oldId, data.user?.id ?? "", email, "created", ""].map(csvEscape).join(",") + "\n");
}

output.end();
console.log(`Auth import complete. Created/dry-run: ${ok}. Failed/skipped: ${failed}. Map: ${out}`);

if (failed > 0) {
  process.exit(1);
}
