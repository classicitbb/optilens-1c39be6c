#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DOC_MAP_PATH = "docs/ai/module-doc-index.json";
const DOC_OVERRIDE_LABEL = "docs-exception";
const DOC_OVERRIDE_PREFIX = "doc-symmetry-exception";

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    throw new Error(`git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }

  return (result.stdout || "").trim();
}

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function getDiffBaseRange() {
  const runningInCi = (process.env.CI ?? "").toLowerCase() === "true";

  if (!runningInCi) {
    return "HEAD";
  }

  const explicitBase = process.env.DOC_GUARD_BASE_REF?.trim();
  if (explicitBase) {
    return `${explicitBase}...HEAD`;
  }

  const githubBaseRef = process.env.GITHUB_BASE_REF?.trim();
  if (githubBaseRef) {
    const remoteRef = `origin/${githubBaseRef}`;
    const hasRemoteRef = spawnSync("git", ["rev-parse", "--verify", remoteRef], {
      stdio: "ignore",
    }).status === 0;

    if (hasRemoteRef) {
      return `${remoteRef}...HEAD`;
    }
  }

  const hasHeadParent = spawnSync("git", ["rev-parse", "--verify", "HEAD~1"], {
    stdio: "ignore",
  }).status === 0;

  return hasHeadParent ? "HEAD~1...HEAD" : "HEAD";
}

function listChangedFiles() {
  const baseRange = getDiffBaseRange();
  const args = ["diff", "--name-only", "--diff-filter=ACMR", baseRange];
  const diffOutput = runGit(args);
  const untrackedOutput = runGit(["ls-files", "--others", "--exclude-standard"]);

  const changed = [
    ...diffOutput.split("\n"),
    ...untrackedOutput.split("\n"),
  ]
    .map((entry) => toPosixPath(entry.trim()))
    .filter(Boolean);

  return [...new Set(changed)];
}

function wildcardToRegex(pattern) {
  const escaped = pattern
    .replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
    .replace(/\*\*/g, "@@DOUBLE_WILDCARD@@")
    .replace(/\*/g, "[^/]*")
    .replace(/@@DOUBLE_WILDCARD@@/g, ".*");

  return new RegExp(`^${escaped}$`);
}

function parseEnvList(...keys) {
  const values = [];
  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      continue;
    }

    values.push(
      ...value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  return new Set(values);
}

function hasOverrideViaMetadata() {
  const labels = parseEnvList("PR_LABELS", "GITHUB_PR_LABELS");
  const hasExceptionLabel = labels.has(DOC_OVERRIDE_LABEL);

  if (!hasExceptionLabel) {
    return false;
  }

  const body = `${process.env.PR_BODY ?? ""}\n${process.env.GITHUB_PR_BODY ?? ""}`.trim();
  const rationaleMatch = body.match(/Doc-Symmetry-Rationale\s*:\s*(.+)/i);

  return Boolean(rationaleMatch?.[1]?.trim());
}

function parseOverrideFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf8");
  const labelMatch = content.match(/Doc-Symmetry-Override\s*:\s*(.+)/i);
  const rationaleMatch = content.match(/Rationale\s*:\s*(.+)/i);

  if (!labelMatch || !rationaleMatch) {
    return null;
  }

  const labelValue = labelMatch[1].trim().toLowerCase();
  const rationaleValue = rationaleMatch[1].trim();

  if (labelValue !== "true" || !rationaleValue) {
    return null;
  }

  return {
    filePath,
    rationale: rationaleValue,
  };
}

function getOverrideRecord(changedFiles) {
  const candidateFiles = changedFiles.filter((filePath) => {
    const normalized = toPosixPath(filePath);
    return normalized.startsWith("docs/bugs/") && normalized.endsWith(".md");
  });

  for (const relativeFile of candidateFiles) {
    const fileName = path.basename(relativeFile).toLowerCase();
    if (!fileName.includes(DOC_OVERRIDE_PREFIX)) {
      continue;
    }

    const parsed = parseOverrideFile(relativeFile);
    if (parsed) {
      return parsed;
    }
  }

  if (hasOverrideViaMetadata()) {
    return {
      filePath: "PR metadata",
      rationale: "Doc exception label and rationale found in PR metadata.",
    };
  }

  return null;
}

function loadDocMap() {
  if (!existsSync(DOC_MAP_PATH)) {
    throw new Error(`Documentation map not found at ${DOC_MAP_PATH}`);
  }

  const json = readFileSync(DOC_MAP_PATH, "utf8");
  const parsed = JSON.parse(json);

  if (!Array.isArray(parsed.rules)) {
    throw new Error("Invalid documentation map: expected a rules array.");
  }

  return parsed;
}

function resolveRuleMatches(changedFiles, rules) {
  return changedFiles
    .filter((filePath) => !filePath.startsWith("docs/"))
    .map((filePath) => {
      const matchingRules = rules.filter((rule) => {
        const matcher = wildcardToRegex(rule.modulePathPattern);
        return matcher.test(filePath);
      });

      if (matchingRules.length === 0) {
        return null;
      }

      const requiredDocs = new Set();
      for (const rule of matchingRules) {
        for (const docPath of rule.requiredDocs ?? []) {
          requiredDocs.add(toPosixPath(docPath));
        }
      }

      return {
        filePath,
        requiredDocs,
      };
    })
    .filter(Boolean);
}

function main() {
  const map = loadDocMap();
  const changedFiles = listChangedFiles();

  if (changedFiles.length === 0) {
    console.log("No changed files detected for doc symmetry check.");
    return;
  }

  const changedSet = new Set(changedFiles.map((entry) => toPosixPath(entry)));
  const ruleMatches = resolveRuleMatches(changedFiles, map.rules);

  if (ruleMatches.length === 0) {
    console.log("No mapped code changes detected for doc symmetry check.");
    return;
  }

  const failures = [];

  for (const match of ruleMatches) {
    const missingDocs = [...match.requiredDocs].filter((docPath) => !changedSet.has(docPath));

    if (missingDocs.length > 0) {
      failures.push({
        filePath: match.filePath,
        missingDocs,
      });
    }
  }

  if (failures.length === 0) {
    console.log("Doc symmetry check passed.");
    return;
  }

  const overrideRecord = getOverrideRecord(changedFiles);
  if (overrideRecord) {
    console.warn(
      `Doc symmetry check bypassed via ${overrideRecord.filePath}. Rationale: ${overrideRecord.rationale}`,
    );
    return;
  }

  console.error("Doc symmetry check failed. Missing required documentation updates:");
  for (const failure of failures) {
    console.error(`\n- ${failure.filePath}`);
    for (const missingDoc of failure.missingDocs) {
      console.error(`  - ${missingDoc}`);
    }
  }

  console.error(
    `\nTo override in exceptional cases, add a changed file under docs/bugs/ with filename containing '${DOC_OVERRIDE_PREFIX}' and include:\nDoc-Symmetry-Override: true\nRationale: <required explanation>\nOr set PR label '${DOC_OVERRIDE_LABEL}' and include 'Doc-Symmetry-Rationale: ...' in PR body.`,
  );

  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`Doc symmetry check error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
