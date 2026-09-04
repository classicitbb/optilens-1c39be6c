// ============================================================
// scotia-payment — Scotia eCom+ (Fiserv IPG Connect) Edge Function
// ------------------------------------------------------------
// SCAFFOLD / NON-PRODUCTION. Behind the VITE_SCOTIA_ENABLED frontend flag.
// The SharedSecret never leaves this function. The browser only ever
// receives the fully-built, already-hashed set of form parameters.
//
// Actions (POST JSON: { action, ... }):
//   • "prepare"  → build the form params + hashExtended for a sale.
//                  Supports: direct sale, tokenization (assignToken /
//                  hosteddataid), MSI (numberOfInstallments), and
//                  scheduled recurring charges.
//   • "validate" → recompute the response hash for a gateway callback
//                  and classify approval / soft vs hard decline.
//
// Credentials (Supabase function secrets — NOT committed):
//   SCOTIA_STORE_ID        store id (starts with "62…" in prod)
//   SCOTIA_SHARED_SECRET   HMAC key
//   SCOTIA_ENV             "test" | "production"  (default "test")
//   SCOTIA_TIMEZONE        IANA tz, e.g. "America/Barbados" (default)
//   SCOTIA_CURRENCY        ISO numeric, e.g. "052" BBD (default "052")
// ============================================================

import { z } from "npm:zod@^4.4.3";
import {
  createCorsPolicy,
  getCorsHeaders,
  handleCorsPreflight,
  rejectDisallowedOrigin,
} from "../_shared/http/cors.ts";
import { requireAuthenticatedUser, type AuthContext } from "../_shared/http/auth.ts";
import {
  ALWAYS_HASH_ALGORITHM,
  DEFAULT_CHECKOUT_OPTION,
  GATEWAY_URLS,
  classifyScotiaResponse,
  computeExtendedHash,
} from "../_shared/scotia/ipgConnect.ts";
// Config resolution (StoreID/SharedSecret lookup) is shared with scotia-return
// so both functions resolve credentials identically. See _shared/scotia/config.ts.
import { getScotiaConfig as getConfig, supabaseAdmin, type ScotiaConfig } from "../_shared/scotia/config.ts";
import {
  classifyProbeHtml,
  logScotiaEvent,
  probeSnippet,
} from "../_shared/scotia/events.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

// ── Request schemas ────────────────────────────────────────────────────────
const prepareSchema = z.object({
  action: z.literal("prepare"),
  // Amount as a decimal string or number; normalized to 2dp below.
  chargetotal: z.union([z.string(), z.number()]),
  // Where the gateway sends the buyer back (must be your own HTTPS URLs).
  responseSuccessURL: z.string().url(),
  responseFailURL: z.string().url(),
  // Server-to-server webhook target (Fiserv posts outcome directly here,
  // independent of the buyer's browser return). Optional — the caller can
  // omit it and this function will derive the default scotia-notify URL.
  notificationURL: z.string().url().optional(),
  // Your internal order reference for support/reconciliation (oid).
  orderId: z.string().min(1).optional(),
  // Admin-only reachability probe (Integrations page). Skips order ownership
  // check because no real order exists; requires the caller to have the
  // 'admin' role. The signed form is discarded by the caller — never posted.
  testMode: z.boolean().optional(),
  // ── Tokenization (manual pages 22–23) ──
  assignToken: z.boolean().optional(),          // save a new card → returns hosteddataid
  hosteddataid: z.string().min(1).optional(),   // reuse a saved token (CVV-only flow)
  // ── MSI / months-without-interest (manual pages 20–21) ──
  numberOfInstallments: z.number().int().positive().optional(),
  installmentsInterest: z.boolean().optional(),
  installmentDelayMonths: z.number().int().positive().optional(),
  // ── Scheduled recurring charges (manual page 24) ──
  recurringInstallmentCount: z.number().int().positive().optional(),
  recurringInstallmentPeriod: z.enum(["day", "week", "month", "year"]).optional(),
  recurringInstallmentFrequency: z.number().int().positive().optional(),
  recurringComments: z.string().optional(),
  ponumber: z.string().optional(), // MANDATORY for recurring; contract number
});

const validateSchema = z.object({
  action: z.literal("validate"),
  // The raw POST parameters received at responseSuccessURL / responseFailURL.
  response: z.record(z.string(), z.string()),
});

// Admin-only IPG health check: sign a real minimum-amount sale form and POST
// it to the gateway from the server, then classify the HTML that comes back.
// Nothing is charged — the hosted page is only rendered, never completed.
const probeSchema = z.object({
  action: z.literal("probe"),
});

const bodySchema = z.discriminatedUnion("action", [prepareSchema, validateSchema, probeSchema]);


// ── Helpers ────────────────────────────────────────────────────────────────
function normalizeAmount(v: string | number): string {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid chargetotal");
  return n.toFixed(2);
}

function amountsMatch(left: string | number | null, right: string | number): boolean {
  const leftAmount = Number(left);
  const rightAmount = Number(right);
  return Number.isFinite(leftAmount)
    && Number.isFinite(rightAmount)
    && Math.abs(leftAmount - rightAmount) < 0.005;
}

/**
 * A gateway signature proves that Scotia returned the fields we sent; it does
 * not prove that the browser was allowed to start the payment in the first
 * place. Bind every prepare request to the authenticated owner's pending
 * payment record before signing an `oid` for the gateway.
 */
async function assertPaymentOwnership(
  orderId: string | undefined,
  chargetotal: string | number,
  authContext: AuthContext,
): Promise<string | null> {
  if (!orderId) return "An order reference is required to start a Scotia payment.";

  if (orderId.startsWith("STMT-")) {
    const paymentId = orderId.slice("STMT-".length);
    const { data, error } = await authContext.supabaseUserClient
      .from("account_payments")
      .select("id, amount, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (error || !data || data.status !== "pending" || !amountsMatch(data.amount, chargetotal)) {
      return "This statement payment is not available for this account.";
    }
    return null;
  }

  if (orderId.startsWith("WALKIN-")) {
    const paymentId = orderId.slice("WALKIN-".length);
    const { data, error } = await (authContext.supabaseUserClient as any)
      .from("walk_in_payments")
      .select("id, amount, status, payment_reference")
      .eq("id", paymentId)
      .maybeSingle();
    const isStaff = await requireAdmin(authContext) || await authContext.supabaseAdminClient
      .rpc("has_edit_role", { _user_id: authContext.user.id })
      .then(({ data, error: roleError }) => !roleError && !!data);

    if (
      !isStaff || error || !data || data.status !== "pending"
      || data.payment_reference !== orderId || !amountsMatch(data.amount, chargetotal)
    ) {
      return "This walk-in payment is not available.";
    }
    return null;
  }

  const { data: order, error: orderError } = await authContext.supabaseUserClient
    .from("orders")
    .select("id, total_amount, status, checkout_method")
    .eq("id", orderId)
    .maybeSingle();

  if (
    orderError || !order || order.checkout_method !== "scotia_ecom"
    || !["pending", "pending_payment"].includes(order.status)
    || !amountsMatch(order.total_amount, chargetotal)
  ) {
    return "This order is not available for Scotia payment.";
  }

  const { data: payment, error: paymentError } = await authContext.supabaseUserClient
    .from("order_payments")
    .select("amount, provider, status")
    .eq("order_id", orderId)
    .eq("provider", "scotia")
    .maybeSingle();

  if (
    paymentError || !payment || !["initiated", "failed"].includes(payment.status)
    || !amountsMatch(payment.amount, chargetotal)
  ) {
    return "This order does not have a retryable Scotia payment.";
  }

  return null;
}

/** Current time in `YYYY:MM:DD-hh:mm:ss` for the configured timezone. */
function txnDateTime(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}:${get("month")}:${get("day")}-${get("hour")}:${get("minute")}:${get("second")}`;
}

function json(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req, corsPolicy) },
  });
}

/** The always-present sale fields, shared by checkout prepares and the probe. */
function baseSaleParams(cfg: ScotiaConfig, opts: {
  chargetotal: string;
  responseSuccessURL: string;
  responseFailURL: string;
}): Record<string, string> {
  return {
    chargetotal: opts.chargetotal,
    checkoutoption: DEFAULT_CHECKOUT_OPTION,
    // Required by the Scotia hosted-page contract for this site. The store is
    // set up for Barbados dollars (052); keep this fixed even if an old
    // credential-store row still has another value.
    currency: "052",
    language: "en_GB",
    hash_algorithm: ALWAYS_HASH_ALGORITHM,
    responseFailURL: opts.responseFailURL,
    responseSuccessURL: opts.responseSuccessURL,
    storename: cfg.storeId,
    timezone: cfg.timezone,
    txndatetime: txnDateTime(cfg.timezone),
    txntype: "sale",
  };
}

/**
 * Admin IPG health check. Signs a real minimum-amount sale form and POSTs it
 * to the gateway server-side. A healthy store answers with the hosted payment
 * page; a store that Fiserv has not enabled for Connect answers with the
 * generic error page instead. Nothing is charged either way.
 */
async function runProbe(cfg: ScotiaConfig, req: Request): Promise<Response> {
  const origin = req.headers.get("origin") ?? "https://classicvisions.net";
  const returnUrl = `${origin.replace(/\/$/, "")}/checkout`;
  const formParams = baseSaleParams(cfg, {
    chargetotal: "1.00",
    responseSuccessURL: returnUrl,
    responseFailURL: returnUrl,
  });
  formParams.oid = `PROBE-${Date.now()}`;
  const hashExtended = await computeExtendedHash(formParams, cfg.sharedSecret);
  const endpointUrl = GATEWAY_URLS[cfg.env];

  const body = new URLSearchParams({ ...formParams, hashExtended });
  let status = 0;
  let html = "";
  try {
    const gatewayResponse = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    status = gatewayResponse.status;
    html = await gatewayResponse.text();
  } catch (err) {
    await logScotiaEvent(supabaseAdmin, {
      kind: "probe",
      outcome: "error",
      oid: formParams.oid,
      storeId: cfg.storeId,
      env: cfg.env,
      endpointUrl,
      notes: `Gateway unreachable: ${String(err)}`,
    });
    return json({
      accepted: false,
      classification: "http_error",
      httpStatus: null,
      detail: `Could not reach the gateway: ${String(err)}`,
      snippet: "",
      storeId: cfg.storeId,
      environment: cfg.env,
      currency: cfg.currency,
      checkedAt: new Date().toISOString(),
    }, 200, req);
  }

  const verdict = classifyProbeHtml(status, html);
  const snippet = probeSnippet(html);

  await logScotiaEvent(supabaseAdmin, {
    kind: "probe",
    outcome: verdict.accepted ? "ok" : verdict.classification === "http_error" ? "error" : "declined",
    oid: formParams.oid,
    storeId: cfg.storeId,
    env: cfg.env,
    endpointUrl,
    httpStatus: status,
    failRc: verdict.failRc,
    failReason: verdict.detail,
    amount: Number(formParams.chargetotal),
    currency: cfg.currency,
    notes: "Admin IPG health check",
  });

  return json({
    accepted: verdict.accepted,
    classification: verdict.classification,
    httpStatus: status,
    detail: verdict.detail,
    failRc: verdict.failRc,
    snippet,
    storeId: cfg.storeId,
    environment: cfg.env,
    currency: cfg.currency,
    checkedAt: new Date().toISOString(),
  }, 200, req);
}

async function requireAdmin(authContext: AuthContext): Promise<boolean> {
  const { data: isAdmin, error } = await authContext.supabaseAdminClient.rpc(
    "has_role",
    { _user_id: authContext.user.id, _role: "admin" },
  );
  return !error && !!isAdmin;
}


// ── Handler ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const disallowed = rejectDisallowedOrigin(req, corsPolicy);
  if (disallowed) return disallowed;

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

  const cfg = await getConfig();
  if (!cfg.storeId || !cfg.sharedSecret) {
    // Scaffold safety: never silently sign with empty credentials.
    return json({ error: "Scotia gateway not configured (missing StoreID / SharedSecret)." }, 503, req);
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    return json({ error: "Invalid request", detail: String(err) }, 400, req);
  }

  const authContext = await requireAuthenticatedUser(req, getCorsHeaders(req, corsPolicy));
  if (authContext instanceof Response) return authContext;

  try {
    if (parsed.action === "validate") {
      const result = await classifyScotiaResponse(parsed.response, cfg.sharedSecret, cfg.storeId);
      return json({
        hashValid: result.hashValid,
        approved: result.approved,
        softDecline: result.softDecline,
        associationResponseCode: result.associationResponseCode,
        failRc: result.failRc,
        oid: result.oid,
        hosteddataid: result.hosteddataid, // present when a token was created
      }, 200, req);
    }

    if (parsed.action === "probe") {
      if (!(await requireAdmin(authContext))) {
        return json({ error: "Admin role required for the gateway health check." }, 403, req);
      }
      return await runProbe(cfg, req);
    }

    // action === "prepare"
    const p = parsed;
    if (p.testMode) {
      if (!(await requireAdmin(authContext))) {
        return json({ error: "Admin role required for gateway test." }, 403, req);
      }

    } else {
      const ownershipError = await assertPaymentOwnership(p.orderId, p.chargetotal, authContext);
      if (ownershipError) return json({ error: ownershipError }, 403, req);
    }

    const formParams: Record<string, string> = baseSaleParams(cfg, {
      chargetotal: normalizeAmount(p.chargetotal),
      responseSuccessURL: p.responseSuccessURL,
      responseFailURL: p.responseFailURL,
    });

    // Support reference for reconciliation (shown to support as oid).
    if (p.orderId) formParams.oid = p.orderId;


    // Server-to-server webhook: Fiserv posts the outcome here directly, so
    // settlement doesn't depend on the buyer's browser completing the return
    // trip. Falls back to the deployed scotia-notify function under the same
    // Supabase project when the caller doesn't supply one.
    const notificationURL = p.notificationURL
      ?? (Deno.env.get("SUPABASE_URL")
        ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/scotia-notify`
        : undefined);
    if (notificationURL) formParams.transactionNotificationURL = notificationURL;

    // Tokenization
    if (p.assignToken) formParams.assignToken = "true";
    if (p.hosteddataid) formParams.hosteddataid = p.hosteddataid;

    // MSI
    if (p.numberOfInstallments) {
      formParams.numberOfInstallments = String(p.numberOfInstallments);
      formParams.installmentsInterest = String(p.installmentsInterest ?? false);
      if (p.installmentDelayMonths) {
        formParams.installmentDelayMonths = String(p.installmentDelayMonths);
      }
    }

    // Scheduled recurring charges
    if (p.recurringInstallmentCount) {
      formParams.recurringInstallmentCount = String(p.recurringInstallmentCount);
      formParams.recurringInstallmentPeriod = p.recurringInstallmentPeriod ?? "month";
      formParams.recurringInstallmentFrequency = String(p.recurringInstallmentFrequency ?? 1);
      if (p.recurringComments) formParams.recurringComments = p.recurringComments;
      // ponumber is MANDATORY for recurring (manual page 24).
      formParams.ponumber = p.ponumber ?? p.orderId ?? `CV-${Date.now()}`;
    } else if (p.ponumber) {
      formParams.ponumber = p.ponumber;
    }

    const hashExtended = await computeExtendedHash(formParams, cfg.sharedSecret);

    // Persist a minimal reconciliation event; signed form parameters and
    // gateway payloads must never be retained by this application.
    await logScotiaEvent(supabaseAdmin, {
      kind: "prepare",
      outcome: "ok",
      oid: formParams.oid ?? null,
      storeId: cfg.storeId,
      env: cfg.env,
      endpointUrl: GATEWAY_URLS[cfg.env],
      amount: Number(formParams.chargetotal),
      currency: cfg.currency,
      notes: p.testMode ? "Admin signed-form test" : "Checkout prepare",
    });

    return json({
      gatewayUrl: GATEWAY_URLS[cfg.env],
      // The browser auto-submits these as hidden inputs (incl. hashExtended).
      // SharedSecret is intentionally absent.
      formParams: { ...formParams, hashExtended },
    }, 200, req);

  } catch (err) {
    return json({ error: "Failed to prepare payment", detail: String(err) }, 500, req);
  }
});
