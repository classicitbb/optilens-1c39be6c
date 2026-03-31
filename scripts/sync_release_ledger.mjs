#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHANGELOG_PATH = path.join(ROOT, "CHANGELOG.md");
const RELEASE_NOTES_PATH = path.join(ROOT, "docs", "release-notes.md");
const RELEASE_MANIFEST_PATH = path.join(ROOT, "docs", "releases", "manifest", "current.json");
const WIKI_CONTENT_PATH = path.join(ROOT, "src", "data", "wikiContent.ts");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");

const mode = process.argv.includes("--check") ? "check" : "write";

const changelogRaw = fs.readFileSync(CHANGELOG_PATH, "utf8");
const wikiRaw = fs.readFileSync(WIKI_CONTENT_PATH, "utf8");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
const releaseNotesRaw = fs.existsSync(RELEASE_NOTES_PATH)
  ? fs.readFileSync(RELEASE_NOTES_PATH, "utf8")
  : "# Release Notes\n\n";
const releaseManifestRaw = fs.existsSync(RELEASE_MANIFEST_PATH)
  ? fs.readFileSync(RELEASE_MANIFEST_PATH, "utf8")
  : null;

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ENVIRONMENTS = new Set(["development", "test", "staging", "production"]);
const IMPACT_LEVELS = new Set(["low", "medium", "high"]);

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

function stripBulletPrefix(line) {
  return line.replace(/^\s*-\s+/, "").trim();
}

function extractPaths(text) {
  return [...text.matchAll(/`([^`]+\/(?:[^`]+))`/g)].map((match) => match[1]);
}

function filePathToModuleLabel(filePath) {
  const normalized = filePath.replace(/^\.?\/?/, "");
  const [first = "", second = "", third = ""] = normalized.split("/");

  if (first === "src" && second && third) {
    return `src/${second}/${third}`;
  }

  if (first === "src" && second) {
    return `src/${second}`;
  }

  if (first && second) {
    return `${first}/${second}`;
  }

  return first || "general";
}

function buildManifest(latestEntry) {
  const releaseDateTimeUtc = new Date(`${latestEntry.date}T00:00:00.000Z`).toISOString();
  const technicalLines = latestEntry.technicalChangelog.map(stripBulletPrefix);
  const moduleNames = Array.from(
    new Set(
      technicalLines
        .flatMap((line) => extractPaths(line))
        .map((filePath) => filePathToModuleLabel(filePath))
        .filter(Boolean),
    ),
  );

  const moduleImpact = (moduleNames.length ? moduleNames : ["general"]).map((module) => ({
    module,
    impact: "medium",
    notes: `Updated as part of ${latestEntry.title}.`,
  }));

  const releaseSummary = latestEntry.releaseNotes.length
    ? latestEntry.releaseNotes.map(stripBulletPrefix)
    : [latestEntry.title];

  return {
    semanticVersion: packageJson.version,
    releaseDateTimeUtc,
    environment: "production",
    releaseSummary,
    moduleImpact,
    migrationNotes: ["No manual data migration is required for this release."],
    hasBreakingChanges: false,
  };
}

function validateManifest(manifest) {
  const fail = (message) => {
    throw new Error(`Invalid release manifest (${RELEASE_MANIFEST_PATH}): ${message}`);
  };

  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    fail("manifest must be a JSON object");
  }

  if (typeof manifest.semanticVersion !== "string" || !SEMVER_REGEX.test(manifest.semanticVersion)) {
    fail("semanticVersion must be a valid semantic version string");
  }

  if (typeof manifest.releaseDateTimeUtc !== "string" || !ISO_DATETIME_REGEX.test(manifest.releaseDateTimeUtc)) {
    fail("releaseDateTimeUtc must be a UTC ISO-8601 datetime string");
  }

  const parsedDate = new Date(manifest.releaseDateTimeUtc);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString() !== manifest.releaseDateTimeUtc) {
    fail("releaseDateTimeUtc must round-trip as a valid UTC ISO datetime");
  }

  if (typeof manifest.environment !== "string" || !ENVIRONMENTS.has(manifest.environment)) {
    fail(`environment must be one of: ${Array.from(ENVIRONMENTS).join(", ")}`);
  }

  if (!Array.isArray(manifest.releaseSummary) || manifest.releaseSummary.length === 0) {
    fail("releaseSummary must be a non-empty array");
  }

  for (const [index, summaryLine] of manifest.releaseSummary.entries()) {
    if (typeof summaryLine !== "string" || summaryLine.trim().length === 0) {
      fail(`releaseSummary[${index}] must be a non-empty string`);
    }
  }

  if (!Array.isArray(manifest.moduleImpact) || manifest.moduleImpact.length === 0) {
    fail("moduleImpact must be a non-empty array");
  }

  for (const [index, item] of manifest.moduleImpact.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      fail(`moduleImpact[${index}] must be an object`);
    }

    if (typeof item.module !== "string" || item.module.trim().length === 0) {
      fail(`moduleImpact[${index}].module must be a non-empty string`);
    }

    if (typeof item.impact !== "string" || !IMPACT_LEVELS.has(item.impact)) {
      fail(`moduleImpact[${index}].impact must be one of: ${Array.from(IMPACT_LEVELS).join(", ")}`);
    }

    if (typeof item.notes !== "string" || item.notes.trim().length === 0) {
      fail(`moduleImpact[${index}].notes must be a non-empty string`);
    }
  }

  if (!Array.isArray(manifest.migrationNotes) || manifest.migrationNotes.length === 0) {
    fail("migrationNotes must be a non-empty array");
  }

  for (const [index, note] of manifest.migrationNotes.entries()) {
    if (typeof note !== "string" || note.trim().length === 0) {
      fail(`migrationNotes[${index}] must be a non-empty string`);
    }
  }

  if (typeof manifest.hasBreakingChanges !== "boolean") {
    fail("hasBreakingChanges must be a boolean");
  }
}

function writeIfNeeded(filePath, nextContent) {
  const current = fs.readFileSync(filePath, "utf8");
  const changed = current !== nextContent;

  if (mode === "write" && changed) {
    fs.writeFileSync(filePath, nextContent, "utf8");
  }

  return changed;
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

const latestEntry = mergedEntries[0];
const generatedManifest = buildManifest(latestEntry);
validateManifest(generatedManifest);

if (releaseManifestRaw) {
  const existingManifest = JSON.parse(releaseManifestRaw);
  validateManifest(existingManifest);
}

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
]
  .join("\n")
  .replace(/\n+$/, "\n");

const generatedManifestJson = `${JSON.stringify(generatedManifest, null, 2)}\n`;

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

const generatedWiki = hasInlineWikiLedger ? wikiRaw.replace(wikiRegex, `$1${escapedWikiLedgerMarkdown}$2`) : wikiRaw;

const releaseChanged = fs.existsSync(RELEASE_NOTES_PATH)
  ? writeIfNeeded(RELEASE_NOTES_PATH, generatedReleaseNotes)
  : (() => {
      if (mode === "write") {
        fs.mkdirSync(path.dirname(RELEASE_NOTES_PATH), { recursive: true });
        fs.writeFileSync(RELEASE_NOTES_PATH, generatedReleaseNotes, "utf8");
      }
      return true;
    })();

const manifestChanged = fs.existsSync(RELEASE_MANIFEST_PATH)
  ? writeIfNeeded(RELEASE_MANIFEST_PATH, generatedManifestJson)
  : (() => {
      if (mode === "write") {
        fs.mkdirSync(path.dirname(RELEASE_MANIFEST_PATH), { recursive: true });
        fs.writeFileSync(RELEASE_MANIFEST_PATH, generatedManifestJson, "utf8");
      }
      return true;
    })();

const wikiChanged = hasInlineWikiLedger ? writeIfNeeded(WIKI_CONTENT_PATH, generatedWiki) : false;

if (mode === "check" && (releaseChanged || manifestChanged || wikiChanged)) {
  const outOfSyncTargets = [
    releaseChanged ? "docs/release-notes.md" : null,
    manifestChanged ? "docs/releases/manifest/current.json" : null,
    wikiChanged ? "src/data/wikiContent.ts" : null,
  ].filter(Boolean);

  console.error(
    `Release artifacts are out of sync (${outOfSyncTargets.join(", ")}). Run: npm run release-ledger:sync`,
  );
  process.exit(1);
}

console.log(
  mode === "check"
    ? "Release artifacts are in sync and manifest schema is valid."
    : "Release notes, manifest, and wiki ledger updated from changelog inputs.",
);
