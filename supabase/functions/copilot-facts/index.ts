// Read-only endpoint backing Settings → Integrations → AI Agents: returns
// the Copilot's formatted platform facts and both live system prompts
// (admin Portal Copilot + public support assistant), admin-only. No writes,
// no side effects — this only reflects what the two AI surfaces already run.
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import { renderPlatformFactsMarkdown } from "../_shared/copilot/platformFactsMarkdown.ts";
import { ADMIN_COPILOT_SYSTEM_PROMPT, PUBLIC_ASSISTANT_SYSTEM_PROMPT } from "../_shared/copilot/prompts.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "GET, POST, OPTIONS",
});

const json = (req: Request, body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req, corsPolicy) },
  });

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const disallowedOrigin = rejectDisallowedOrigin(req, corsPolicy);
  if (disallowedOrigin) return disallowedOrigin;

  const authContext = await requirePrivilegedAccess(req, getCorsHeaders(req, corsPolicy), {
    allowedRoles: ["admin"],
    sourceFunction: "copilot-facts",
  });
  if (authContext instanceof Response) return authContext;

  return json(req, {
    platformFactsMarkdown: renderPlatformFactsMarkdown(),
    adminSystemPrompt: ADMIN_COPILOT_SYSTEM_PROMPT,
    publicSystemPrompt: PUBLIC_ASSISTANT_SYSTEM_PROMPT,
    generatedAt: new Date().toISOString(),
  }, 200);
});
