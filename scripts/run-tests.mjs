import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== "--runInBand");
const require = createRequire(import.meta.url);
const vitestPackageJson = require.resolve("vitest/package.json");
const vitestEntrypoint = path.join(path.dirname(vitestPackageJson), "vitest.mjs");

const result = spawnSync(
  process.execPath,
  [vitestEntrypoint, "run", "--coverage", "--passWithNoTests=false", ...passthroughArgs],
  { stdio: "inherit" }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
