#!/usr/bin/env node
// Bridge to the local DesignCraft install (print/share layout engine).
// Usage: node scripts/designcraft.mjs <doctor|export|mcp|app|...cli args>
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const DEFAULT_CLI = "C:\\Program Files\\DesignCraft\\designcraft-cli.exe";
const cli = process.env.DESIGNCRAFT_CLI?.trim() || DEFAULT_CLI;
const readRoot = path.resolve(process.env.DESIGNCRAFT_READ_ROOT || repoRoot);
const writeRoot = path.resolve(process.env.DESIGNCRAFT_WRITE_ROOT || path.join(repoRoot, "output", "designcraft"));
const appPort = process.env.DESIGNCRAFT_APP_PORT?.trim();

// Export presets: PDF options per intent. Format comes from the output extension.
const PRESETS = {
  print: { marks: true, bleed: true, standard: "x4" },
  share: { compressImages: true, tagged: true },
};
const FORMATS = new Set(["pdf", "html", "pptx", "epub", "idml"]);

function requireCli() {
  if (!existsSync(cli)) {
    console.error(`DesignCraft CLI not found at ${cli}. Install it or set DESIGNCRAFT_CLI.`);
    process.exit(1);
  }
}

function runCli(args, options = {}) {
  requireCli();
  return spawnSync(cli, args, { encoding: "utf8", ...options });
}

function passthrough(args) {
  requireCli();
  const child = spawn(cli, args, { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
}

function doctor() {
  const version = runCli(["--version"]);
  const ok = version.status === 0;
  console.log(`cli        ${cli} ${ok ? `(${version.stdout.trim()})` : "(missing)"}`);
  console.log(`read root  ${readRoot}`);
  console.log(`write root ${writeRoot}`);
  if (appPort) {
    const probe = runCli(["app", "--port", appPort, "file.presets"], { timeout: 5000 });
    console.log(`app port   ${appPort} ${probe.status === 0 ? "(reachable)" : "(not reachable — open DesignCraft first)"}`);
  } else {
    console.log("app port   not set (DESIGNCRAFT_APP_PORT); headless mode only");
  }
  process.exit(ok ? 0 : 1);
}

function exportDoc(argv) {
  const [input, preset, out] = argv;
  const opts = PRESETS[preset];
  const format = out ? path.extname(out).slice(1).toLowerCase() : "pdf";
  if (!input || !opts || !FORMATS.has(format)) {
    console.error(`usage: designcraft export <file|--sample> <${Object.keys(PRESETS).join("|")}> [out.${[...FORMATS].join("|")}]`);
    process.exit(2);
  }
  const target = path.resolve(
    out || path.join(writeRoot, `${input === "--sample" ? "sample" : path.basename(input, path.extname(input))}-${preset}.pdf`),
  );
  mkdirSync(path.dirname(target), { recursive: true });
  const source = input === "--sample" ? ["--sample"] : ["--in", path.resolve(input)];
  const pdfOptions = format === "pdf" ? ["--pdf-options", JSON.stringify(opts)] : [];
  passthrough(["run", ...source, ...pdfOptions, "--export", target]);
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "doctor":
    doctor();
    break;
  case "export":
    exportDoc(rest);
    break;
  case "mcp": {
    // Confine what an agent can read/write; --connect drives a running app instead.
    mkdirSync(writeRoot, { recursive: true });
    const connect = appPort ? ["--connect", appPort] : ["--automation-read-root", readRoot, "--automation-write-root", writeRoot];
    passthrough(["mcp", ...connect, ...rest]);
    break;
  }
  default:
    passthrough(process.argv.slice(2));
}
