import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/qbo/[...action]";

// Vercel only routes single-segment paths to api/qbo/[...action].ts, so every
// multi-segment gateway action needs a vercel.json rewrite to one segment.
const handlerSource = readFileSync("api/qbo/[...action].ts", "utf8");
const { rewrites } = JSON.parse(readFileSync("vercel.json", "utf8")) as { rewrites: { source: string; destination: string }[] };
const multiSegmentActions = [...handlerSource.matchAll(/action === "([a-z]+\/[a-z/]+)"/g)].map((m) => m[1]);

function run(action: string, init: { method?: string; headers?: Record<string, string>; query?: Record<string, string> } = {}) {
  const out = { status: 0, body: undefined as unknown };
  const res: Parameters<typeof handler>[1] = {
    status: (s) => { out.status = s; return res; },
    json: (b) => { out.body = b; },
    redirect: (s) => { out.status = s; },
    setHeader: () => undefined,
  };
  return handler({ method: init.method ?? "POST", query: { action, ...init.query }, headers: init.headers ?? {}, body: {} }, res).then(() => out);
}

describe("QBO gateway routing", () => {
  beforeEach(() => {
    vi.stubEnv("QBO_GATEWAY_ENVIRONMENT", "sandbox");
    vi.stubEnv("QBO_REDIRECT_URI", "https://qbo-sandbox.classicvisions.net/qbo/oauth/callback");
    vi.stubEnv("QBO_LOCAL_HANDOFF_TOKEN", "expected-token");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("QBO_LOVABLE_API_KEY", "k");
    vi.stubEnv("QBO_GATEWAY_RATE_LIMIT_SECRET", "s");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("true", { status: 200 })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("finds the multi-segment actions the handler serves", () => {
    expect(multiSegmentActions.sort()).toEqual(["commands/claim", "commands/result", "handoff/claim", "handoff/result", "oauth/callback"]);
  });

  it.each(multiSegmentActions)("rewrites /qbo/%s to a single-segment function path the handler resolves", async (action) => {
    const rule = rewrites.find((r) => r.source === `/qbo/${action}`);
    expect(rule, `missing vercel.json rewrite for /qbo/${action}`).toBeDefined();
    expect(rule!.destination).toMatch(/^\/api\/qbo\/[a-z-]+$/);
    const segment = rule!.destination.split("/").pop()!;

    // Reaching the action's own validation (401 bad token / 400 missing code)
    // rather than the 404 fallback proves the segment maps back to the action.
    const result = await run(segment, { headers: { "x-qbo-handoff-token": "wrong" } });
    expect(result.status).toBe(action === "oauth/callback" ? 400 : 401);
  });

  it("keeps single-segment actions working", async () => {
    expect((await run("disconnect")).status).toBe(200);
    expect((await run("nope")).status).toBe(404);
  });

  it("places the explicit rewrites before the generic /qbo/:action* rule", () => {
    const generic = rewrites.findIndex((r) => r.source === "/qbo/:action*");
    const lastExplicit = Math.max(...multiSegmentActions.map((a) => rewrites.findIndex((r) => r.source === `/qbo/${a}`)));
    expect(lastExplicit).toBeLessThan(generic);
  });
});
