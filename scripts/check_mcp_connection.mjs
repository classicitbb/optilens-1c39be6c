// Anonymous, read-only connection check. Never accepts or prints bearer tokens.
import assert from "node:assert/strict";

try {
  const endpoint = new URL(process.env.MCP_SERVER_URL ?? "");
  assert.equal(endpoint.protocol, "https:", "MCP_SERVER_URL must use HTTPS");
  assert(!endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash,
    "MCP_SERVER_URL must not contain credentials, query parameters or a fragment");
  const base = endpoint.href.replace(/\/$/, "");
  const request = (url, options) => fetch(url, { ...options, redirect: "error", signal: AbortSignal.timeout(15000) });
  const metadataResponse = await request(`${base}/.well-known/oauth-protected-resource`);
  assert.equal(metadataResponse.status, 200, `OAuth metadata returned HTTP ${metadataResponse.status}`);
  const metadata = await metadataResponse.json();
  assert.equal(metadata.resource, base, "OAuth resource does not match MCP_SERVER_URL");
  assert(Array.isArray(metadata.authorization_servers) && metadata.authorization_servers.length > 0,
    "OAuth metadata has no authorization server");
  const response = await request(base, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "classic-visions-readiness", version: "1.0.0" },
    } }),
  });
  assert.equal(response.status, 401, `Expected OAuth challenge; received HTTP ${response.status}`);
  assert(response.headers.get("www-authenticate")?.includes("resource_metadata"), "OAuth challenge is missing resource metadata");
  console.log("PASS: HTTPS endpoint, OAuth metadata and anonymous authentication challenge. User sign-in and authorized tool calls remain unverified.");
} catch (error) {
  // Avoid printing request URLs or response bodies, which can contain infrastructure details.
  console.error(`MCP readiness failed: ${error instanceof TypeError ? "Invalid URL or network failure" : error.message}`);
  process.exitCode = 1;
}
