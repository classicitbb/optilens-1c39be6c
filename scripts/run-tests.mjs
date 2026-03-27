import { spawnSync } from "node:child_process";

const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== "--runInBand");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "--coverage", "--passWithNoTests=false", ...passthroughArgs],
  { stdio: "inherit" }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
