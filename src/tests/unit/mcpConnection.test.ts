import { describe, expect, it } from "vitest";
import { createSupabaseHandler } from "@lovable.dev/mcp-js/stacks/supabase";
import definition from "@/lib/mcp";

describe("Classic Visions MCP connection contract", () => {
  const handler = createSupabaseHandler(definition, { functionName: "mcp" });
  const endpoint = "https://example.test/functions/v1/mcp";
  it("exposes discovery metadata for the canonical MCP resource", async () => {
    const response = await handler(new Request(`${endpoint}/.well-known/oauth-protected-resource`));
    expect(response.status).toBe(200);
    const metadata = await response.json();
    expect(metadata.resource).toBe(endpoint);
    expect(metadata.authorization_servers).toHaveLength(1);
  });
  it("challenges unauthenticated MCP initialization instead of leaking tools or data", async () => {
    const response = await handler(new Request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
        protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "connection-check", version: "1.0.0" },
      } }),
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata");
  });
  it("registers all operational tools and the contact organization review once", () => {
    const names = definition.tools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(28);
    expect(names).toEqual(expect.arrayContaining(["whoami", "review_crm_organization", "admin_list_resources", "admin_write_record"]));
  });
});
