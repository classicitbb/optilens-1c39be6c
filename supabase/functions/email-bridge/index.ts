// Server-side proxy to the office mail bridge (optilens-local via Cloudflare
// tunnel). Browsers call this function instead of the bridge directly, so the
// bridge's exact-origin CORS list no longer blocks preview/dev origins.
// The bridge still verifies the caller's own access token and role.
import { createCorsPolicy, DEV_ORIGIN_PATTERNS, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";

// Email also opens from localhost and Lovable preview hosts; the bridge still checks the caller's token and role.
const policy = createCorsPolicy({ originPatterns: DEV_ORIGIN_PATTERNS });
const BRIDGE = (Deno.env.get("EMAIL_BRIDGE_URL") ?? "https://mail-bridge.classicvisions.net").replace(/\/+$/, "");

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, policy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, policy);
  if (rejected) return rejected;
  const cors = getCorsHeaders(req, policy);

  const url = new URL(req.url);
  const marker = "/email-bridge";
  const rest = url.pathname.slice(url.pathname.indexOf(marker) + marker.length);
  if (!rest.startsWith("/api/email/")) {
    return new Response(JSON.stringify({ error: "Unknown mail bridge path." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Sign in again to use Email." }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const headers: Record<string, string> = { Authorization: auth };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetch(`${BRIDGE}${rest}${url.search}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    });
  } catch {
    return new Response(JSON.stringify({ error: "Can't reach the mail bridge. Check that the office server is online." }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
  }

  // When the office server or its tunnel is down, Cloudflare answers with a
  // full HTML error page (502/503/504/52x). Replace it with a short JSON
  // message so the Email screen can explain the outage instead of dumping HTML.
  const upstreamType = upstream.headers.get("content-type") ?? "";
  if (upstream.status >= 500 && !upstreamType.includes("application/json")) {
    await upstream.body?.cancel();
    return new Response(
      JSON.stringify({ error: "The office mail server is offline or restarting. Try again in a few minutes.", upstreamStatus: upstream.status }),
      { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const out = new Headers(cors);
  for (const name of ["content-type", "content-disposition", "content-length"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
});
