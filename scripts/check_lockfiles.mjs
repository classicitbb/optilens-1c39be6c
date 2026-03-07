#!/usr/bin/env node
import { existsSync } from "node:fs";

const hasNpmLockfile = existsSync("package-lock.json");
const hasBunLockfile = existsSync("bun.lockb");

if (!hasNpmLockfile) {
  console.error("❌ Missing required npm lockfile: package-lock.json");
  process.exit(1);
}

if (hasBunLockfile) {
  console.error("❌ Lockfile policy violation: both package-lock.json and bun.lockb exist.");
  console.error("   This repository standardizes on npm. Remove bun.lockb and run npm ci.");
  process.exit(1);
}

console.log("✅ Lockfile policy check passed (npm lockfile only).");
