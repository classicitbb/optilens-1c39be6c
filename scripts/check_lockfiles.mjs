#!/usr/bin/env node
import { existsSync } from "node:fs";

const hasNpmLockfile = existsSync("package-lock.json");
const hasBunTextLockfile = existsSync("bun.lock");
const hasBunLockfile = existsSync("bun.lockb");

if (!hasNpmLockfile) {
  console.error("❌ Missing required npm lockfile: package-lock.json");
  process.exit(1);
}

if (hasBunTextLockfile || hasBunLockfile) {
  const bunLockfiles = [hasBunTextLockfile && "bun.lock", hasBunLockfile && "bun.lockb"]
    .filter(Boolean)
    .join(", ");
  console.error(`❌ Lockfile policy violation: both package-lock.json and ${bunLockfiles} exist.`);
  console.error("   This repository standardizes on npm. Remove Bun lockfiles and run npm ci.");
  process.exit(1);
}

console.log("✅ Lockfile policy check passed (npm lockfile only).");
