#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildSecurityHeaders } from "./securityHeaders.mjs";

const repoRoot = process.cwd();
const vercelConfigPath = path.join(repoRoot, "vercel.json");
const checkOnly = process.argv.includes("--check");
const config = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8"));

const desiredHeaders = [
  {
    source: "/(.*)",
    headers: Object.entries(buildSecurityHeaders("enforce")).map(([key, value]) => ({
      key,
      value,
    })),
  },
];

const desiredConfig = {
  ...config,
  headers: desiredHeaders,
};

const current = `${JSON.stringify(config, null, 2)}\n`;
const desired = `${JSON.stringify(desiredConfig, null, 2)}\n`;

if (current === desired) {
  console.log("✅ vercel.json security headers are synchronized.");
  process.exit(0);
}

if (checkOnly) {
  console.error("❌ vercel.json security headers are out of sync with security/http-header-policy.json.");
  console.error("   Run `node scripts/sync_vercel_security_headers.mjs` to update them.");
  process.exit(1);
}

fs.writeFileSync(vercelConfigPath, desired);
console.log("✅ Updated vercel.json security headers from security/http-header-policy.json.");
