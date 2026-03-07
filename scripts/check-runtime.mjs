#!/usr/bin/env node

import { execSync } from "node:child_process";

const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_NPM_MAJOR = 10;

function parseMajor(version, label) {
  const normalized = String(version ?? "").trim().replace(/^v/, "");
  const major = Number.parseInt(normalized.split(".")[0], 10);

  if (!Number.isFinite(major)) {
    throw new Error(`Unable to parse ${label} version from '${version}'.`);
  }

  return major;
}

function resolveNpmVersion() {
  const userAgentVersion = process.env.npm_config_user_agent?.match(/npm\/(\d+\.\d+\.\d+)/)?.[1];
  if (userAgentVersion) {
    return userAgentVersion;
  }

  try {
    return execSync("npm --version", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function fail(message) {
  console.error(`\n❌ Runtime version check failed.\n${message}\n`);
  console.error("Expected runtime:");
  console.error(`- Node: ${REQUIRED_NODE_MAJOR}.x`);
  console.error(`- npm: ${REQUIRED_NPM_MAJOR}.x\n`);
  console.error("Please run 'nvm use' (or install the pinned versions) and try again.\n");
  process.exit(1);
}

const nodeVersion = process.versions.node;
const npmVersion = resolveNpmVersion();

if (!npmVersion) {
  fail("npm version is unavailable. Please run this project with npm so the runtime check can validate your environment.");
}

try {
  const nodeMajor = parseMajor(nodeVersion, "Node");
  const npmMajor = parseMajor(npmVersion, "npm");

  if (nodeMajor !== REQUIRED_NODE_MAJOR || npmMajor !== REQUIRED_NPM_MAJOR) {
    fail(`Detected Node ${nodeVersion} and npm ${npmVersion}.`);
  }

  console.log(`✅ Runtime check passed (Node ${nodeVersion}, npm ${npmVersion}).`);
} catch (error) {
  fail(error instanceof Error ? error.message : "Unknown runtime check error.");
}
