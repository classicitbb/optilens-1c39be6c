// DHL Express MyDHL API configuration probe for the tracking and landed-cost
// integration surface.
// The Basic Auth credentials are decrypted only here, never returned to a
// browser, and are used solely for a non-mutating reference-data request.

import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

type DhlConfig = {
  account_number: string | null;
  api_username: string;
  api_password: string;
  environment: "test" | "production";
  enabled: boolean;
};

function json(req: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req, corsPolicy) },
  });
}

function basicAuthorization(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const disallowedOrigin = rejectDisallowedOrigin(req, corsPolicy);
  if (disallowedOrigin) return disallowedOrigin;
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const authContext = await requirePrivilegedAccess(req, getCorsHeaders(req, corsPolicy), {
    allowedRoles: ["admin"],
    sourceFunction: "dhl-express",
  });
  if (authContext instanceof Response) return authContext;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(req, { error: "Invalid JSON request body" }, 400);
  }
  const action = body?.action;
  if (!["test", "track", "landed-cost"].includes(String(action))) {
    return json(req, { error: "Unsupported action" }, 400);
  }

  const { data, error } = await authContext.supabaseAdminClient.rpc("get_dhl_express_credentials");
  const config = (Array.isArray(data) ? data[0] : data) as DhlConfig | null;
  if (error || !config?.account_number || !config.api_username || !config.api_password) {
    return json(req, { error: "DHL Express is not configured with an account number and Basic Auth credentials." }, 503);
  }
  if (action !== "test" && !config.enabled) {
    return json(req, { error: "DHL Express tracking and landed-cost services are disabled." }, 409);
  }

  const baseUrl = config.environment === "production"
    ? "https://express.api.dhl.com/mydhlapi"
    : "https://express.api.dhl.com/mydhlapi/test";

  const dhlHeaders = {
    Authorization: basicAuthorization(config.api_username, config.api_password),
    Accept: "application/json",
  };

  if (action === "track") {
    const trackingNumber = typeof body.shipmentTrackingNumber === "string" ? body.shipmentTrackingNumber.trim() : "";
    if (!/^[A-Za-z0-9-]{8,64}$/.test(trackingNumber)) {
      return json(req, { error: "A valid DHL shipment tracking number is required." }, 400);
    }

    try {
      const response = await fetch(`${baseUrl}/shipments/${encodeURIComponent(trackingNumber)}/tracking`, { headers: dhlHeaders });
      if (!response.ok) return json(req, { error: `DHL tracking request failed (HTTP ${response.status}).` }, 502);
      return json(req, { tracking: await response.json() }, 200);
    } catch {
      return json(req, { error: "Could not reach the DHL Express tracking service." }, 502);
    }
  }

  if (action === "landed-cost") {
    const request = body.request;
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      return json(req, { error: "A DHL landed-cost request payload is required." }, 400);
    }

    try {
      const response = await fetch(`${baseUrl}/landed-cost`, {
        method: "POST",
        headers: { ...dhlHeaders, "Content-Type": "application/json" },
        // Do not persist DHL's landed-cost response or the request. DHL's
        // terms prohibit storing or modifying this data, so it is returned
        // only to the admin's immediate on-demand request.
        body: JSON.stringify(request),
      });
      if (!response.ok) return json(req, { error: `DHL landed-cost request failed (HTTP ${response.status}).` }, 502);
      return json(req, { landedCost: await response.json() }, 200);
    } catch {
      return json(req, { error: "Could not reach the DHL Express landed-cost service." }, 502);
    }
  }

  let passed = false;
  let errorMessage: string | null = null;
  try {
    // DHL documents GET /reference-data as a read-only API endpoint. This
    // proves credentials and endpoint reachability without rating, creating a
    // shipment, allocating an identifier, or consuming a pickup.
    const response = await fetch(`${baseUrl}/reference-data`, {
      headers: {
        ...dhlHeaders,
      },
    });
    passed = response.ok;
    if (!passed) errorMessage = `DHL rejected the credentials or reference-data request (HTTP ${response.status}).`;
  } catch {
    errorMessage = "Could not reach the DHL Express API.";
  }

  const { error: recordError } = await authContext.supabaseAdminClient.rpc("record_dhl_express_test", {
    p_success: passed,
    p_error_message: errorMessage,
    p_actor_user_id: authContext.user.id,
  });
  if (recordError) return json(req, { error: "DHL test completed, but its status could not be recorded." }, 500);
  if (!passed) return json(req, { error: errorMessage }, 502);

  return json(req, { ok: true, environment: config.environment }, 200);
});
