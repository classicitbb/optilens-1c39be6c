#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "Lockfile policy check",
    command: "npm",
    args: ["run", "qa:lockfiles"],
  },
  {
    name: "Documentation symmetry guard",
    command: "npm",
    args: ["run", "qa:doc-symmetry"],
  },
  {
    name: "Release ledger drift check",
    command: "npm",
    args: ["run", "qa:release-ledger"],
  },
  {
    name: "Vercel security header sync",
    command: "npm",
    args: ["run", "qa:vercel-headers"],
  },
  {
    name: "Wiki build version validation",
    command: "npm",
    args: ["run", "qa:wiki-build-version"],
  },
];

for (const check of checks) {
  console.log(`\n==> ${check.name}`);
  const result = spawnSync(check.command, check.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nPR checks passed.");
