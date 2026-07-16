#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const functionsDir = path.join(repoRoot, "supabase", "functions");

function printUsage() {
  console.log(`Usage:
  node scripts/deploy_supabase_functions.mjs --project-ref <ref> [--dry-run]
  node scripts/deploy_supabase_functions.mjs --project-ref <ref> --only contact-inquiry,innovations-sync

Environment:
  SUPABASE_PROJECT_REF may be used instead of --project-ref.
  SUPABASE_ACCESS_TOKEN must be available for non-interactive CLI deploys.`);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const help = process.argv.includes("--help") || process.argv.includes("-h");
if (help) {
  printUsage();
  process.exit(0);
}

const projectRef = readArg("--project-ref") ?? process.env.SUPABASE_PROJECT_REF;
const dryRun = process.argv.includes("--dry-run");
const only = readArg("--only");

if (!projectRef) {
  console.error("Missing --project-ref or SUPABASE_PROJECT_REF.");
  printUsage();
  process.exit(1);
}

if (!existsSync(functionsDir)) {
  console.error(`Cannot find ${path.relative(repoRoot, functionsDir)}.`);
  process.exit(1);
}

const requested = only
  ? new Set(
      only
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    )
  : null;

const functions = readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => !name.startsWith("_"))
  .filter((name) => !requested || requested.has(name))
  .sort();

if (requested) {
  const missing = [...requested].filter((name) => !functions.includes(name));
  if (missing.length > 0) {
    console.error(`Requested function folder(s) not found: ${missing.join(", ")}`);
    process.exit(1);
  }
}

if (functions.length === 0) {
  console.log("No function folders selected.");
  process.exit(0);
}

for (const functionName of functions) {
  const command = ["npx", "supabase", "functions", "deploy", functionName, "--project-ref", projectRef];
  if (dryRun) {
    console.log(command.join(" "));
    continue;
  }

  console.log(`Deploying ${functionName}...`);
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`Deploy failed for ${functionName}.`);
    process.exit(result.status ?? 1);
  }
}

console.log(
  dryRun
    ? `Dry run complete. Selected ${functions.length} Supabase function(s) for ${projectRef}.`
    : `Deployed ${functions.length} Supabase function(s) to ${projectRef}.`,
);
