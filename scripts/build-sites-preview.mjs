#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stagingRoot = path.join(root, ".sites-preview");
const clientDir = path.join(stagingRoot, "dist", "client");
const serverDir = path.join(stagingRoot, "dist", "server");

await rm(stagingRoot, { recursive: true, force: true });
await mkdir(clientDir, { recursive: true });

const build = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--outDir", clientDir, "--emptyOutDir"],
  { cwd: root, env: process.env, stdio: "inherit" },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

await mkdir(serverDir, { recursive: true });
await mkdir(path.join(stagingRoot, ".openai"), { recursive: true });
await cp(path.join(root, ".openai", "hosting.json"), path.join(stagingRoot, ".openai", "hosting.json"));

await writeFile(
  path.join(serverDir, "index.js"),
  `export default {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status === 404 && request.method === "GET" && acceptsHtml) {
      const indexUrl = new URL("/index.html", request.url);
      response = await env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return response;
  },
};
`,
  "utf8",
);

console.log(`Sites preview build created at ${stagingRoot}`);
