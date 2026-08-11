// Gatekeeper outbound Rx-order sender.  This function never pulls job status;
// it only connects, refreshes the sender's contract list, and submits an
// explicitly released order while retaining Gatekeeper's immediate receipt.

import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

type GatekeeperContract = {
  hash_routing?: string;
  webrx_lab_id_origin?: string;
  webrx_retailer_name_origin?: string;
  origin_type?: string;
  webrx_lab_id_receiver?: string;
  webrx_retailer_name_receiver?: string;
  receiver_type?: string;
};

type GatekeeperCredentials = {
  environment: "staging" | "production";
  enabled: boolean;
  jwt_key: string;
  jwt_secret: string;
  auth_token: string | null;
  auth_token_expires_at: string | null;
  last_auth_refresh_at: string | null;
  receiver_lab_id: string;
  receiver_retailer_name: string;
  hash_routing: string;
};

type GatekeeperConnectionCredentials = Pick<GatekeeperCredentials, "environment" | "jwt_key" | "jwt_secret" | "auth_token" | "auth_token_expires_at" | "last_auth_refresh_at"> & {
  origin_lab_id: string;
  lab_name: string;
};

type Submission = {
  id: string;
  gatekeeper_order_id: number | null;
  payload: Record<string, unknown>;
};

const GATEKEEPER_BASE_URLS = {
  staging: "https://gatekeeper-staging.opticalonline.com",
  production: "https://gatekeeper.opticalonline.com",
} as const;

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req, corsPolicy) },
  });
}

function text(value: unknown, max = 255): string {
  return String(value ?? "").replace(/[\r\n:]/g, " ").trim().slice(0, max);
}

function numberText(value: unknown, field: string, fallback?: number): string {
  if (value === null || value === undefined || value === "") {
    if (fallback !== undefined) return fallback.toFixed(2);
    throw new Error(`${field} is required for Gatekeeper delivery.`);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`${field} must be numeric for Gatekeeper delivery.`);
  return numeric.toFixed(2);
}

function integerText(value: unknown, field: string, fallback = 0): string {
  if (value === null || value === undefined || value === "") return String(fallback);
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) throw new Error(`${field} must be a whole number for Gatekeeper delivery.`);
  return String(numeric);
}

function hashrefLine(key: string, value: unknown): string {
  return `${key}:${text(value)}`;
}

function gatekeeperDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Barbados",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}-${get("minute")}-${get("second")}`;
}

function buildHashref(submission: Submission, credentials: GatekeeperCredentials): string {
  const payload = submission.payload as any;
  const quote = payload.quote ?? {};
  const frame = payload.frame ?? {};
  const lens = Array.isArray(payload.lenses) ? payload.lenses[0] : null;
  const rx = lens?.rx ?? {};
  const codes = lens?.codes ?? {};
  if (!submission.gatekeeper_order_id) throw new Error("Gatekeeper order number has not been allocated.");
  if (!lens || !lens.alias || !codes.material_code || !codes.style_code || !codes.color_code) {
    throw new Error("A confirmed lens alias with material, style, and colour codes is required for Gatekeeper delivery.");
  }

  const isUncut = frame.is_uncut === true || frame.job_scope === "surface_only";
  const frameA = frame.a_mm;
  const frameB = frame.b_mm;
  const frameEd = frame.ed_mm;
  if (!isUncut && (frameA == null || frameB == null || frameEd == null)) {
    throw new Error("Frame A, B, and ED measurements are required for an edged Gatekeeper order.");
  }
  if (isUncut && frameEd == null) {
    throw new Error("Frame ED is required to derive the uncut diameter for Gatekeeper delivery.");
  }

  const orderId = String(submission.gatekeeper_order_id);
  const patientName = text(quote.contact_name || quote.customer_name, 255);
  if (!patientName) throw new Error("Patient name is required for Gatekeeper delivery.");
  const date = gatekeeperDate();
  const lines = [
    hashrefLine("file_version", "2.5"),
    "start_order",
    hashrefLine("agent_name", "optilens"),
    hashrefLine("agent_version", "1"),
    hashrefLine("lab_num", credentials.receiver_lab_id),
    hashrefLine("order_id", orderId),
    hashrefLine("cust_num", credentials.receiver_retailer_name),
    hashrefLine("cust_seq_num", orderId),
    hashrefLine("customer_po_num", quote.quote_number || orderId),
    hashrefLine("x_gk_order", orderId),
    hashrefLine("x_gk_guid", submission.id),
    hashrefLine("patient_name", patientName),
    hashrefLine("date_ordered", date),
    hashrefLine("instructions", quote.notes_customer || `CV Web order ${quote.quote_number || orderId}`),
    hashrefLine("frame_status", isUncut ? "LENSES ONLY" : "SUPPLIED"),
    hashrefLine("frame_tracing", "NO TRACE"),
    hashrefLine("frame_mounting", "STANDARD"),
    hashrefLine("frame_edge", isUncut ? "UNCUT" : "EDGED"),
    hashrefLine("frame_vendor", frame.brand),
    hashrefLine("frame_model", frame.model_colour),
  ];

  if (isUncut) {
    const diameter = Math.ceil(Number(frameEd));
    if (!Number.isFinite(diameter) || diameter < 30 || diameter > 80) {
      throw new Error("Frame ED must yield an uncut diameter between 30 and 80 mm for Gatekeeper delivery.");
    }
    lines.push(hashrefLine("x_uncut_by_diam", "Y"), hashrefLine("x_od_uncut_diam", diameter), hashrefLine("x_os_uncut_diam", diameter));
  } else {
    lines.push(
      hashrefLine("frame_a", numberText(frameA, "Frame A")),
      hashrefLine("frame_b", numberText(frameB, "Frame B")),
      hashrefLine("frame_ed", numberText(frameEd, "Frame ED")),
      hashrefLine("frame_dbl", numberText(frame.dbl_mm, "Frame DBL", 0)),
      hashrefLine("frame_bridge", numberText(frame.bridge_mm, "Frame bridge", 0)),
    );
  }

  const rightCylinder = numberText(rx.od_cyl, "OD cylinder", 0);
  const leftCylinder = numberText(rx.os_cyl, "OS cylinder", 0);
  const addLensFields = (side: "od" | "os", eyeRx: Record<string, unknown>, cylinder: string) => {
    const prefix = side === "od" ? "od" : "os";
    return [
      hashrefLine(`x_${prefix}_lens_alias`, lens.alias),
      hashrefLine(`x_lens_${prefix}_material_code`, codes.material_code),
      hashrefLine(`x_lens_${prefix}_material_desc`, codes.material_description),
      hashrefLine(`x_lens_${prefix}_style_code`, codes.style_code),
      hashrefLine(`x_lens_${prefix}_style_desc`, codes.style_description),
      hashrefLine(`x_lens_${prefix}_color_code`, codes.color_code),
      hashrefLine(`x_lens_${prefix}_color_desc`, codes.color_description),
      hashrefLine(`rx_${prefix}_sphere`, numberText(eyeRx[`${prefix}_sph`], `${prefix.toUpperCase()} sphere`)),
      hashrefLine(`rx_${prefix}_cylinder`, cylinder),
      hashrefLine(`rx_${prefix}_axis`, integerText(eyeRx[`${prefix}_axis`], `${prefix.toUpperCase()} axis`)),
      hashrefLine(`rx_${prefix}_far`, numberText(eyeRx[`${prefix}_fpd`], `${prefix.toUpperCase()} far PD`)),
      hashrefLine(`rx_${prefix}_prism`, "0.00"),
      hashrefLine(`rx_${prefix}_prism_dir`, "IN"),
      hashrefLine(`rx_${prefix}_prism2`, "0.00"),
      hashrefLine(`rx_${prefix}_prism2_dir`, "UP"),
    ];
  };
  lines.push(hashrefLine("rx_eye", "3"), ...addLensFields("od", rx, rightCylinder), ...addLensFields("os", rx, leftCylinder));
  if (Number(rx.od_add ?? 0) > 0 || Number(rx.os_add ?? 0) > 0) {
    lines.push(
      hashrefLine("rx_od_add", numberText(rx.od_add, "OD add")),
      hashrefLine("rx_os_add", numberText(rx.os_add, "OS add")),
      hashrefLine("rx_od_seg_height", numberText(rx.seg_height || rx.fitting_height, "OD segment height")),
      hashrefLine("rx_os_seg_height", numberText(rx.seg_height || rx.fitting_height, "OS segment height")),
      hashrefLine("x_rx_seg_height_qual", "1"),
    );
  }
  lines.push("end_order");
  return lines.join("\r\n");
}

function baseUrl(environment: "staging" | "production") {
  return GATEKEEPER_BASE_URLS[environment];
}

async function readJson(response: Response): Promise<any> {
  return await response.json().catch(() => ({}));
}

async function authenticate(environment: "staging" | "production", jwtKey: string, jwtSecret: string): Promise<string> {
  const url = new URL("/api/v2/auth_user", baseUrl(environment));
  url.searchParams.set("jwt_key", jwtKey);
  url.searchParams.set("jwt_secret", jwtSecret);
  const response = await fetch(url, { method: "POST" });
  const body = await readJson(response);
  if (!response.ok || !text(body?.auth_token)) throw new Error(`Gatekeeper authentication failed (HTTP ${response.status}).`);
  return String(body.auth_token);
}

async function contractsFor(environment: "staging" | "production", authToken: string): Promise<GatekeeperContract[]> {
  const response = await fetch(`${baseUrl(environment)}/api/v2/operations/contract_available`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(`Gatekeeper contract lookup failed (HTTP ${response.status}).`);
  const lab = body?.message?.lab ?? body?.lab ?? {};
  const contracts = lab.contractSending ?? body?.contractSending ?? [];
  if (!Array.isArray(contracts)) throw new Error("Gatekeeper returned an invalid contract list.");
  return contracts as GatekeeperContract[];
}

function sanitizeContracts(contracts: GatekeeperContract[]) {
  return contracts.map((contract) => ({
    origin_lab_id: text(contract.webrx_lab_id_origin),
    origin_retailer_name: text(contract.webrx_retailer_name_origin),
    receiver_lab_id: text(contract.webrx_lab_id_receiver),
    receiver_retailer_name: text(contract.webrx_retailer_name_receiver),
  }));
}

async function credentialsFor(authContext: any): Promise<GatekeeperCredentials> {
  const { data, error } = await authContext.supabaseAdminClient.rpc("get_gatekeeper_credentials");
  const config = (Array.isArray(data) ? data[0] : data) as GatekeeperCredentials | null;
  if (error || !config?.jwt_key || !config?.jwt_secret || !config?.receiver_lab_id || !config?.hash_routing) {
    throw new Error("Gatekeeper is not connected with an active sending contract.");
  }
  if (!config.enabled) throw new Error("Gatekeeper outbound delivery is disabled in Integrations.");
  return config;
}

async function connectionCredentialsFor(authContext: any): Promise<GatekeeperConnectionCredentials> {
  const { data, error } = await authContext.supabaseAdminClient.rpc("get_gatekeeper_connection_credentials");
  const config = (Array.isArray(data) ? data[0] : data) as GatekeeperConnectionCredentials | null;
  if (error || !config?.jwt_key || !config?.jwt_secret || !config?.origin_lab_id || !config?.lab_name) {
    throw new Error("Gatekeeper has not been connected yet.");
  }
  return config;
}

async function validAuthToken(authContext: any, config: Pick<GatekeeperCredentials, "environment" | "jwt_key" | "jwt_secret" | "auth_token" | "auth_token_expires_at" | "last_auth_refresh_at">): Promise<string> {
  const expiresAt = config.auth_token_expires_at ? Date.parse(config.auth_token_expires_at) : 0;
  if (config.auth_token && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) return config.auth_token;
  const refreshedAt = config.last_auth_refresh_at ? Date.parse(config.last_auth_refresh_at) : 0;
  if (Number.isFinite(refreshedAt) && Date.now() - refreshedAt < 12 * 60 * 60 * 1000) {
    throw new Error("Gatekeeper token is unavailable and may not be refreshed more than twice in 24 hours.");
  }
  const token = await authenticate(config.environment, config.jwt_key, config.jwt_secret);
  const { error } = await authContext.supabaseAdminClient.rpc("cache_gatekeeper_auth_token", {
    p_auth_token: token,
    p_actor_user_id: authContext.user.id,
  });
  if (error) throw new Error(`Gatekeeper token was created but could not be stored: ${error.message}`);
  return token;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const disallowedOrigin = rejectDisallowedOrigin(req, corsPolicy);
  if (disallowedOrigin) return disallowedOrigin;
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const authContext = await requirePrivilegedAccess(req, getCorsHeaders(req, corsPolicy), {
    allowedRoles: ["admin"], sourceFunction: "gatekeeper-orders",
  });
  if (authContext instanceof Response) return authContext;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const action = text(body?.action, 40);
  if (!body || !["connect", "refresh-contracts", "send"].includes(action)) {
    return json(req, { error: "Unsupported action." }, 400);
  }

  try {
    if (action === "connect") {
      const environment = body.environment === "production" ? "production" : "staging";
      const originLabId = text(body.originLabId, 30);
      const labName = text(body.labName, 100);
      const pinCode = text(body.pinCode, 100);
      if (!originLabId || !labName || !pinCode) return json(req, { error: "Origin lab ID, lab name, and the single-use PIN are required." }, 400);
      const pinUrl = new URL("/api/v1/legacy_orders/lab_access_with_pin", baseUrl(environment));
      pinUrl.searchParams.set("webrx_lab_id", originLabId);
      pinUrl.searchParams.set("pin_code", pinCode);
      const pinResponse = await fetch(pinUrl);
      const pinBody = await readJson(pinResponse);
      const lab = pinBody?.message?.lab ?? pinBody?.lab ?? {};
      if (!pinResponse.ok || !text(lab.jwt_key) || !text(lab.jwt_secret)) {
        throw new Error(`Gatekeeper did not accept the PIN (HTTP ${pinResponse.status}).`);
      }
      const authToken = await authenticate(environment, String(lab.jwt_key), String(lab.jwt_secret));
      const suppliedContracts = Array.isArray(lab.contractSending) ? lab.contractSending as GatekeeperContract[] : [];
      // Persist the single-use-PIN result before a separate contract lookup.
      // If Gatekeeper's second call is temporarily unavailable, the durable JWT
      // credentials remain available for a safe retry instead of being lost.
      const { error: credentialError } = await authContext.supabaseAdminClient.rpc("store_gatekeeper_connection", {
        p_environment: environment,
        p_origin_lab_id: text(lab.webrx_lab_id || originLabId, 30),
        p_lab_name: labName,
        p_jwt_key: String(lab.jwt_key),
        p_jwt_secret: String(lab.jwt_secret),
        p_auth_token: authToken,
        p_contracts: suppliedContracts,
        p_actor_user_id: authContext.user.id,
      });
      if (credentialError) throw new Error(`Gatekeeper credentials could not be saved: ${credentialError.message}`);
      const contracts = await contractsFor(environment, authToken);
      const { error } = await authContext.supabaseAdminClient.rpc("store_gatekeeper_connection", {
        p_environment: environment,
        p_origin_lab_id: text(lab.webrx_lab_id || originLabId, 30),
        p_lab_name: labName,
        p_jwt_key: String(lab.jwt_key),
        p_jwt_secret: String(lab.jwt_secret),
        p_auth_token: authToken,
        p_contracts: contracts,
        p_actor_user_id: authContext.user.id,
      });
      if (error) throw new Error(`Gatekeeper connected but credentials could not be saved: ${error.message}`);
      return json(req, { ok: true, contracts: sanitizeContracts(contracts) });
    }

    if (action === "refresh-contracts") {
      const config = await connectionCredentialsFor(authContext);
      const authToken = await validAuthToken(authContext, config);
      const contracts = await contractsFor(config.environment, authToken);
      const { error } = await authContext.supabaseAdminClient.rpc("replace_gatekeeper_contracts", {
        p_contracts: contracts,
        p_actor_user_id: authContext.user.id,
      });
      if (error) throw new Error(`Gatekeeper contracts could not be refreshed: ${error.message}`);
      return json(req, { ok: true, contracts: sanitizeContracts(contracts) });
    }

    const submissionId = text(body.submissionId, 64);
    if (!submissionId) return json(req, { error: "A submission ID is required." }, 400);
    const { data: claimed, error: claimError } = await authContext.supabaseAdminClient
      .from("rx_order_submissions")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .eq("id", submissionId)
      .eq("status", "approved")
      .eq("dispatch_provider", "gatekeeper")
      .select("id,gatekeeper_order_id,payload")
      .maybeSingle();
    if (claimError) throw new Error(`Could not claim Gatekeeper submission: ${claimError.message}`);
    if (!claimed) return json(req, { error: "Submission is not awaiting Gatekeeper delivery." }, 409);

    let receiptAccepted = false;

    try {
      const config = await credentialsFor(authContext);
      const authToken = await validAuthToken(authContext, config);
      const rxContent = buildHashref(claimed as Submission, config);
      const response = await fetch(`${baseUrl(config.environment)}/api/v2/orders/push_order_to_lab`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ order: { hash_routing: config.hash_routing, rx_content: rxContent, tr_content: "" } }),
      });
      const responseBody = await readJson(response);
      if (!response.ok || !responseBody?.message) {
        throw new Error(`Gatekeeper rejected the order (HTTP ${response.status}).`);
      }
      const receipt = responseBody.message;
      // Do not convert an externally accepted order into a retryable failure
      // if recording its local receipt happens to fail. A retry could create a
      // duplicate Rx at the lab.
      receiptAccepted = true;
      const { error } = await authContext.supabaseAdminClient.rpc("record_gatekeeper_result", {
        p_submission_id: submissionId,
        p_success: true,
        p_receipt: receipt,
      });
      if (error) throw new Error(`Gatekeeper accepted the order but the receipt could not be recorded: ${error.message}`);
      return json(req, { ok: true, receipt: { id: receipt.id ?? null, guid: receipt.guid ?? null, created_at: receipt.created_at ?? null } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!receiptAccepted) {
        await authContext.supabaseAdminClient.rpc("record_gatekeeper_result", {
          p_submission_id: submissionId, p_success: false, p_error_message: message,
        });
      }
      throw error;
    }
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Gatekeeper operation failed." }, 502);
  }
});
