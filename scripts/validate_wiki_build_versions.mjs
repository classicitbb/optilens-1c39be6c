#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wikiPath = path.join(ROOT, "src", "data", "wikiContent.ts");

const raw = fs.readFileSync(wikiPath, "utf8");
const articleRegex = /\{\s*id:\s*"([^"]+)",[\s\S]*?content:\s*`([\s\S]*?)`/g;
const buildVersionRegex = /-\s*\*\*Build version:\*\*\s*([^\n]+)/i;
const draftRegex = /-\s*\*\*Draft:\*\*\s*(yes|true|draft)\b/i;
const placeholderRegex = /^(0\.0\.0(?:[-+].*)?|x\.x\.x|tbd|unknown|placeholder)$/i;

const failures = [];
let match;

while ((match = articleRegex.exec(raw)) !== null) {
  const articleId = match[1];
  const content = match[2];
  const buildVersionMatch = content.match(buildVersionRegex);
  if (!buildVersionMatch) continue;

  const version = buildVersionMatch[1].trim();
  const isDraft = draftRegex.test(content);
  if (placeholderRegex.test(version) && !isDraft) {
    failures.push({ articleId, version });
  }
}

if (failures.length > 0) {
  console.error("Wiki build version validation failed. Placeholder versions require explicit Draft: Yes metadata.");
  for (const failure of failures) {
    console.error(` - ${failure.articleId}: ${failure.version}`);
  }
  process.exit(1);
}

console.log("Wiki build version validation passed.");
