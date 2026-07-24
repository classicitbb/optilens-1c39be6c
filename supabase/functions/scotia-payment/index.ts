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
//   SCOTIA_CURRENCY        ISO numeric, e.g. "840" USD (default "840")
// ============================================================

import { z } from "npm:zod@3.25.76";
import {
  createCorsPolicy,
  getCorsHeaders,
  handleCorsPreflight,
  rejectDisallowedOrigin,
} from "../_shared/http/cors.ts";
import {
  ALWAYS_HASH_ALGORITHM,
  DEFAULT_CHECKOUT_OPTION,
  GATEWAY_URLS,
  classifyScotiaResponse,
  computeExtendedHash,
} from "../_shared/scotia/ipgConnect.ts";
// Config resolution (StoreID/SharedSecret lookup) is shared with scotia-return
// so both functions resolve credentials identically. See _shared/scotia/config.ts.
import { getScotiaConfig as getConfig } from "../_shared/scotia/config.ts";

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
  // The page hosting the iframe — REQUIRED for IFRAME mode (manual page 13).
  hostURI: z.string().url().optional(),
  // Your internal order reference for support/reconciliation (oid).
  orderId: z.string().min(1).optional(),
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
  response: z.record(z.string()),
});

const bodySchema = z.discriminatedUnion("action", [prepareSchema, validateSchema]);

// ── Helpers ────────────────────────────────────────────────────────────────
function normalizeAmount(v: string | number): string {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid chargetotal");
  return n.toFixed(2);
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

  try {
    if (parsed.action === "validate") {
      const result = await classifyScotiaResponse(parsed.response, cfg.sharedSecret);
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

    // action === "prepare"
    const p = parsed;
    const formParams: Record<string, string> = {
      chargetotal: normalizeAmount(p.chargetotal),
      checkoutoption: DEFAULT_CHECKOUT_OPTION,
      currency: cfg.currency,
      hash_algorithm: ALWAYS_HASH_ALGORITHM,
      responseFailURL: p.responseFailURL,
      responseSuccessURL: p.responseSuccessURL,
      storename: cfg.storeId,
      timezone: cfg.timezone,
      txndatetime: txnDateTime(cfg.timezone),
      txntype: "sale",
    };

    // IFRAME mode requires hostURI (manual page 13).
    if (p.hostURI) formParams.hostURI = p.hostURI;
    // Support reference for reconciliation (shown to support as oid).
    if (p.orderId) formParams.oid = p.orderId;

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
