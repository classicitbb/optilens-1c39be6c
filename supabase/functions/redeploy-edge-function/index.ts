import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";

// Lets an admin redeploy an allow-listed edge function from its current
// `main` source, without waiting on the Lovable agent. This only replaces
// what `supabase functions deploy <name>` would do — it does not change code.
//
// Requires a SUPABASE_MANAGEMENT_API_TOKEN secret: a Supabase personal access
// token (from a Supabase account with admin access to THIS project) scoped to
// the Management API. That's a different credential from
// SUPABASE_SERVICE_ROLE_KEY, which only reaches the Data API and cannot
// deploy functions. Until that secret exists, this returns a 501 explaining
// exactly what's missing.

const VERSION = "2026-07-28.1";
const GITHUB_REPO = "classicitbb/optilens-1c39be6c";
const GITHUB_BRANCH = "main";

type RedeployTarget = {
  entrypointPath: string;
  verifyJwt: boolean;
  files: string[];
};

// Each entry lists every source file (relative to supabase/functions/) the
// function needs so its relative imports still resolve after upload.
// verifyJwt must mirror supabase/config.toml for the same function — getting
// this wrong for live-data-gateway would 401 the on-prem agent in production.
const REDEPLOYABLE_FUNCTIONS: Record<string, RedeployTarget> = {
  "live-data-gateway": {
    entrypointPath: "live-data-gateway/index.ts",
    verifyJwt: false,
    files: [
      "live-data-gateway/index.ts",
      "_shared/http/auth.ts",
      "_shared/http/cors.ts",
      "_shared/security/auditLogger.ts",
    ],
  },
};

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

function json(req: Request, status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function fetchSourceFile(path: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/supabase/functions/${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "optilens-redeploy-edge-function" } });
  if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status} for ${path}`);
  return await res.text();
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejectedOrigin = rejectDisallowedOrigin(req, corsPolicy);
  if (rejectedOrigin) return rejectedOrigin;
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed." });

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const authContext = await requirePrivilegedAccess(req, corsHeaders, {
    allowedRoles: ["admin"],
    sourceFunction: "redeploy-edge-function",
  });
  if (authContext instanceof Response) return authContext;

  const body = await req.json().catch(() => null);
  if (body && typeof body === "object" && body.action === "version") {
    return json(req, 200, { name: "redeploy-edge-function", version: VERSION, supported: Object.keys(REDEPLOYABLE_FUNCTIONS) });
  }

  const functionName = body && typeof body === "object" && typeof body.function_name === "string" ? body.function_name : "";
  const target = REDEPLOYABLE_FUNCTIONS[functionName];
  if (!target) {
    return json(req, 400, {
      error: `Unknown or non-redeployable function: "${functionName}"`,
      supported: Object.keys(REDEPLOYABLE_FUNCTIONS),
    });
  }

  const managementToken = Deno.env.get("SUPABASE_MANAGEMENT_API_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const projectRef = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "";

  if (!managementToken || !projectRef) {
    const missing = [
      !managementToken ? "SUPABASE_MANAGEMENT_API_TOKEN" : null,
      !projectRef ? "a resolvable project ref (SUPABASE_URL did not match https://<ref>.supabase.co)" : null,
    ].filter((value): value is string => value !== null);
    return json(req, 501, {
      error: "Redeploy is not configured yet.",
      missing,
      detail: "Add SUPABASE_MANAGEMENT_API_TOKEN as an edge function secret — a Supabase personal access token generated from an account with admin access to this project's Management API (Account > Access Tokens in the Supabase dashboard). Once set, retry this request.",
    });
  }

  let files: Array<{ name: string; content: string }>;
  try {
    files = await Promise.all(
      target.files.map(async (path) => ({ name: path, content: await fetchSourceFile(path) })),
    );
  } catch (error) {
    return json(req, 502, {
      error: "Could not fetch the function source from GitHub.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const form = new FormData();
  form.append("metadata", JSON.stringify({
    name: functionName,
    entrypoint_path: target.entrypointPath,
    verify_jwt: target.verifyJwt,
  }));
  for (const file of files) {
    form.append("file", new File([file.content], file.name));
  }

  let deployRes: Response;
  try {
    deployRes = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${encodeURIComponent(functionName)}`,
      { method: "POST", headers: { Authorization: `Bearer ${managementToken}` }, body: form },
    );
  } catch (error) {
    return json(req, 502, { error: "Could not reach the Supabase Management API.", detail: error instanceof Error ? error.message : String(error) });
  }

  const resultText = await deployRes.text();
  if (!deployRes.ok) {
    return json(req, 502, {
      error: "Supabase rejected the deploy.",
      status: deployRes.status,
      detail: resultText.slice(0, 2000),
    });
  }

  return json(req, 200, { ok: true, function_name: functionName, deployed_at: new Date().toISOString() });
});
