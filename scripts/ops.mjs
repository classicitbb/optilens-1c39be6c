#!/usr/bin/env node
// Command-line access to systems outside this repo.
//   node scripts/ops.mjs qbo status
//   node scripts/ops.mjs optilens GET /api/auth/me
//   node scripts/ops.mjs pbx ping | status | channels | endpoints
//   node scripts/ops.mjs pbxgql '<graphql query>'
// Credentials come from environment variables only; nothing is stored here.
//   OPTILENS_QBO_GATEWAY_URL                 QuickBooks gateway root
//   OPTILENS_API_USER / OPTILENS_API_PASSWORD  OptiLens Local login (reached via `ssh ino` tunnel)
//   PBX_HOST (default 192.168.254.52), PBX_AMI_USER / PBX_AMI_SECRET  FreePBX AMI user
import net from "node:net";
import { spawn } from "node:child_process";

const [area, ...rest] = process.argv.slice(2);
const die = (m) => { console.error(m); process.exit(1); };

async function qbo([cmd]) {
  const base = process.env.OPTILENS_QBO_GATEWAY_URL;
  if (!base) die("OPTILENS_QBO_GATEWAY_URL is not set.");
  if (cmd !== "status") die("usage: qbo status");
  const r = await fetch(base, { redirect: "manual" });
  console.log(`${base} -> HTTP ${r.status} (environment: ${process.env.OPTILENS_QBO_ENVIRONMENT || "unset"})`);
  console.log((await r.text()).slice(0, 400));
}

async function optilens([method = "GET", path = "/api/auth/me", body]) {
  const { OPTILENS_API_USER: user, OPTILENS_API_PASSWORD: password } = process.env;
  if (!user || !password) die("Set OPTILENS_API_USER and OPTILENS_API_PASSWORD (an OptiLens Local login).");
  const port = 18080 + Math.floor(Math.random() * 1000);
  const tunnel = spawn("ssh", ["-o", "BatchMode=yes", "-N", "-L", `${port}:127.0.0.1:8080`, "ino"], { stdio: "ignore" });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; ; i++) {
      try { await fetch(`${base}/api/auth/bootstrap-state`); break; } catch { if (i > 25) die("SSH tunnel to OptiLens host did not come up."); await new Promise((r) => setTimeout(r, 300)); }
    }
    const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user, password }) });
    if (!login.ok) die(`Login failed: HTTP ${login.status}`);
    const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const r = await fetch(base + path, { method: method.toUpperCase(), headers: { cookie, "content-type": "application/json" }, body: body ? body : undefined });
    console.log(`HTTP ${r.status}`);
    console.log(await r.text());
  } finally { tunnel.kill(); }
}

const AMI_READ_ONLY = { ping: "Ping", status: "CoreStatus", channels: "CoreShowChannels", endpoints: "PJSIPShowEndpoints" };

function pbx([cmd = "ping"]) {
  const action = AMI_READ_ONLY[cmd];
  if (!action) die(`usage: pbx ${Object.keys(AMI_READ_ONLY).join(" | ")}  (read-only; calls are placed by the PBX agent)`);
  const host = process.env.PBX_HOST || "192.168.254.52";
  const { PBX_AMI_USER: user, PBX_AMI_SECRET: secret } = process.env;
  if (!user || !secret) die("Set PBX_AMI_USER and PBX_AMI_SECRET (an AMI user created in FreePBX > Settings > Asterisk Manager Users).");
  const sock = net.connect(5038, host);
  let out = "";
  sock.setEncoding("utf8");
  sock.on("data", (d) => { out += d; });
  sock.on("error", (e) => die(`AMI connection failed: ${e.message}`));
  sock.write(`Action: Login\r\nUsername: ${user}\r\nSecret: ${secret}\r\n\r\n`);
  setTimeout(() => sock.write(`Action: ${action}\r\n\r\nAction: Logoff\r\n\r\n`), 700);
  setTimeout(() => { console.log(out.replace(/Secret:.*\r?\n/g, "")); sock.destroy(); }, 2500);
}

// FreePBX GraphQL (read data such as extensions/CDR; it cannot place calls).
//   node scripts/ops.mjs pbxgql '{ fetchAllExtensions { totalCount } }'
async function pbxgql([query]) {
  const { PBX_API_CLIENT_ID: id, PBX_API_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) die("Set PBX_API_CLIENT_ID and PBX_API_CLIENT_SECRET (FreePBX Admin > API > Applications).");
  if (!query) die("usage: pbxgql '<graphql query>'");
  const base = `http://${process.env.PBX_HOST || "192.168.254.52"}:83/admin/api/api`;
  const t = await fetch(`${base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }) });
  if (!t.ok) die(`Token request failed: HTTP ${t.status}`);
  const { access_token } = await t.json();
  const r = await fetch(`${base}/gql`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${access_token}` }, body: JSON.stringify({ query }) });
  console.log(JSON.stringify(await r.json(), null, 2));
}

const areas = { qbo, optilens, pbx, pbxgql };
if (!areas[area]) die("usage: node scripts/ops.mjs <qbo|optilens|pbx> ...");
await areas[area](rest);
