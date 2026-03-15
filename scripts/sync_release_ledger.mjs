#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHANGELOG_PATH = path.join(ROOT, "CHANGELOG.md");
const RELEASE_NOTES_PATH = path.join(ROOT, "docs", "release-notes.md");
const WIKI_CONTENT_PATH = path.join(ROOT, "src", "data", "wikiContent.ts");

const mode = process.argv.includes("--check") ? "check" : "write";

const changelogRaw = fs.readFileSync(CHANGELOG_PATH, "utf8");
const wikiRaw = fs.readFileSync(WIKI_CONTENT_PATH, "utf8");
const releaseNotesRaw = fs.existsSync(RELEASE_NOTES_PATH)
  ? fs.readFileSync(RELEASE_NOTES_PATH, "utf8")
  : "# Release Notes\n\n";

function parseEntries(markdown) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let current = null;
  let section = null;

  const pushCurrent = () => {
    if (!current) return;
    for (const key of ["plan", "releaseNotes", "technicalChangelog"]) {
      current[key] = current[key].filter((line) => line.trim().length > 0);
    }
    entries.push(current);
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+?)\s+—\s+(.+)$/);
    if (headingMatch) {
      pushCurrent();
      current = {
        date: headingMatch[1].trim(),
        title: headingMatch[2].trim(),
        plan: [],
        releaseNotes: [],
        technicalChangelog: [],
      };
      section = null;
      continue;
    }

    if (!current) continue;

    if (/^###\s+Plan\s*$/.test(line)) {
      section = "plan";
      continue;
    }

    if (/^###\s+Release Notes\s*$/.test(line)) {
      section = "releaseNotes";
      continue;
    }

    if (/^###\s+(Technical Changelog|Changelog \(Human-readable\))\s*$/.test(line)) {
      section = "technicalChangelog";
      continue;
    }

    if (/^###\s+/.test(line)) {
      section = null;
      continue;
    }

    if (section) {
      current[section].push(line);
    }
  }

  pushCurrent();
  return entries;
}

function parseReleaseNotes(markdown) {
  const entries = parseEntries(markdown);
  const map = new Map();
  for (const entry of entries) {
    map.set(`${entry.date} — ${entry.title}`, entry.releaseNotes);
  }
  return map;
}

function toBullets(lines) {
  return lines.filter((line) => line.trim().startsWith("- "));
}

const changelogEntries = parseEntries(changelogRaw);
if (!changelogEntries.length) {
  throw new Error("No changelog entries found in CHANGELOG.md.");
}

const releaseNotesMap = parseReleaseNotes(releaseNotesRaw);
const mergedEntries = changelogEntries.map((entry) => {
  const key = `${entry.date} — ${entry.title}`;
  const releaseNotes = releaseNotesMap.get(key) ?? entry.releaseNotes;

  return {
    ...entry,
    plan: toBullets(entry.plan),
    releaseNotes: toBullets(releaseNotes),
    technicalChangelog: toBullets(entry.technicalChangelog),
  };
});

const generatedReleaseNotes = [
  "# Release Notes",
  "",
  "Summarized release outcomes for each major date-stamped update.",
  "",
  ...mergedEntries.flatMap((entry) => [
    `## ${entry.date} — ${entry.title}`,
    "",
    "### Release Notes",
    ...entry.releaseNotes,
    "",
  ]),
].join("\n").replace(/\n+$/, "\n");

const wikiLedgerMarkdown = [
  "Use this date-stamped format for every major feature release so operators can review plan, outcome, and key changes in one place.",
  "",
  ...mergedEntries.flatMap((entry) => [
    `## ${entry.date} — ${entry.title}`,
    "",
    "### Plan",
    ...entry.plan,
    "",
    "### Release Notes",
    ...entry.releaseNotes,
    "",
    "### Technical Changelog",
    ...entry.technicalChangelog,
    "",
  ]),
  "### Update Rule (Required)",
  "For each major feature update, append a new entry with:",
  "- Date (`YYYY-MM-DD`)",
  "- Plan (3–5 bullets)",
  "- Release Notes (what shipped)",
  "- Technical Changelog (what changed technically)",
].join("\n");

const escapedWikiLedgerMarkdown = wikiLedgerMarkdown
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const wikiRegex = /(id:\s*"major-update-ledger",[\s\S]*?content:\s*`)\s*[\s\S]*?(`,\n\s*\},)/;
const hasInlineWikiLedger = wikiRegex.test(wikiRaw);

const generatedWiki = hasInlineWikiLedger
  ? wikiRaw.replace(wikiRegex, `$1${escapedWikiLedgerMarkdown}$2`)
  : wikiRaw;

function writeIfNeeded(filePath, nextContent) {
  const current = fs.readFileSync(filePath, "utf8");
  const changed = current !== nextContent;

  if (mode === "write" && changed) {
    fs.writeFileSync(filePath, nextContent, "utf8");
  }

  return changed;
}

const releaseChanged = fs.existsSync(RELEASE_NOTES_PATH)
  ? writeIfNeeded(RELEASE_NOTES_PATH, generatedReleaseNotes)
  : (() => {
      if (mode === "write") {
        fs.mkdirSync(path.dirname(RELEASE_NOTES_PATH), { recursive: true });
        fs.writeFileSync(RELEASE_NOTES_PATH, generatedReleaseNotes, "utf8");
      }
      return true;
    })();

const wikiChanged = hasInlineWikiLedger ? writeIfNeeded(WIKI_CONTENT_PATH, generatedWiki) : false;

if (mode === "check" && (releaseChanged || wikiChanged)) {
  const outOfSyncTargets = [
    releaseChanged ? "docs/release-notes.md" : null,
    wikiChanged ? "src/data/wikiContent.ts" : null,
  ].filter(Boolean);

  console.error(
    `Release artifacts are out of sync (${outOfSyncTargets.join(", ")}). Run: npm run release-ledger:sync`,
  );
  process.exit(1);
}

console.log(
  mode === "check"
    ? "Release artifacts are in sync."
    : "Release notes and wiki ledger updated from changelog inputs.",
);
