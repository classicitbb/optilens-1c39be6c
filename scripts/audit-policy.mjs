#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HIGH_SEVERITIES = new Set(["high", "critical"]);
const repoRoot = process.cwd();
const exceptionsPath = path.join(repoRoot, "security", "dependency-audit-exceptions.json");
const lockfilePath = path.join(repoRoot, "package-lock.json");

const today = new Date().toISOString().slice(0, 10);
const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
const exceptions = loadExceptions();
const audit = runNpmAuditJson();

const findings = buildFindings(audit.vulnerabilities ?? {});
const activeExceptions = new Map(
  exceptions.exceptions
    .filter((item) => item.expiresOn >= today)
    .map((item) => [String(item.id), item]),
);

const unexceptedHigh = findings.filter(
  (finding) => HIGH_SEVERITIES.has(finding.severity) && !activeExceptions.has(String(finding.id)),
);

if (findings.length === 0) {
  console.log("✅ npm audit reported no vulnerabilities.");
  process.exit(0);
}

console.log("Dependency vulnerability summary:");
for (const finding of findings) {
  const exception = activeExceptions.get(String(finding.id));
  const exceptionText = exception
    ? ` | exception until ${exception.expiresOn} (${exception.reason})`
    : "";
  console.log(
    `- [${finding.severity}] ${finding.name} (${finding.id}) scope=${finding.scope} title="${finding.title}"${exceptionText}`,
  );
}

if (unexceptedHigh.length > 0) {
  console.error("\n❌ High/Critical vulnerabilities found without an active exception:");
  for (const finding of unexceptedHigh) {
    console.error(`  - ${finding.name} (${finding.id}) severity=${finding.severity}`);
  }
  process.exit(1);
}

console.log("\n✅ No unexcepted high/critical vulnerabilities.");
process.exit(0);

function loadExceptions() {
  if (!fs.existsSync(exceptionsPath)) {
    throw new Error(`Missing exception file at ${exceptionsPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(exceptionsPath, "utf8"));
  if (!Array.isArray(parsed.exceptions)) {
    throw new Error("security/dependency-audit-exceptions.json must contain an exceptions array.");
  }
  return parsed;
}

function runNpmAuditJson() {
  try {
    const output = execFileSync("npm", ["audit", "--json"], { encoding: "utf8" });
    return JSON.parse(output);
  } catch (error) {
    const stdout = error.stdout?.toString() ?? "";
    if (!stdout.trim()) {
      throw error;
    }
    return JSON.parse(stdout);
  }
}

function buildFindings(vulnerabilityMap) {
  const results = [];
  for (const vuln of Object.values(vulnerabilityMap)) {
    const advisories = vuln.via.filter((via) => typeof via === "object");
    for (const advisory of advisories) {
      results.push({
        id: advisory.source,
        name: vuln.name,
        severity: advisory.severity,
        title: advisory.title,
        scope: deriveScope(vuln.nodes ?? []),
      });
    }
  }
  return dedupeFindings(results);
}

function deriveScope(nodes) {
  let hasProdNode = false;
  let hasDevNode = false;

  for (const node of nodes) {
    const packageMeta = lockfile.packages?.[node];
    if (!packageMeta) {
      hasProdNode = true;
      continue;
    }
    if (packageMeta.dev) {
      hasDevNode = true;
    } else {
      hasProdNode = true;
    }
  }

  if (hasProdNode) {
    return hasDevNode ? "runtime+dev" : "runtime";
  }
  return "dev-only";
}

function dedupeFindings(findings) {
  const deduped = new Map();
  for (const finding of findings) {
    const key = `${finding.id}:${finding.scope}`;
    if (!deduped.has(key)) {
      deduped.set(key, finding);
    }
  }
  return [...deduped.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
