// ============================================================
// walkin-pay — customer-device walk-in payments
// ------------------------------------------------------------
// Lets a customer pay on their OWN phone instead of handing a card across the
// counter. Three ways in:
//
//   assisted_link   staff publish a payment; the customer scans the counter QR
//                   and types the short claim code the cashier gives them
//   email_request   staff email a one-time tokenised link
//   self_serve      the customer scans the QR and enters their own amount
//
// WHY THIS IS A SEPARATE FUNCTION FROM scotia-payment
// scotia-payment runs with verify_jwt = true and is the single signing path for
// order checkout, statement payments AND staff walk-ins. Punching an
// unauthenticated branch through its assertPaymentOwnership() would put all
// three one logic slip away from a free form-signing oracle. This function is
// verify_jwt = false and authenticates by TOKEN in code — the same shape as
// scotia-return, scotia-notify and statement-document — so the blast radius
// stays inside walk-ins.
//
// The SharedSecret never leaves the server; the browser only ever receives the
// already-hashed form parameters. No PAN, CVV or expiry is accepted here: card
// entry happens on Scotia's hosted page exactly as it does for staff.
// ============================================================

import { z } from "npm:zod@^4.4.3";
import {
  createCorsPolicy,
  getCorsHeaders,
  handleCorsPreflight,
  rejectDisallowedOrigin,
} from "../_shared/http/cors.ts";
import { checkRateLimit, getClientIp } from "../_shared/http/rateLimit.ts";
import {
  GATEWAY_URLS,
  baseSaleParams,
  computeExtendedHash,
} from "../_shared/scotia/ipgConnect.ts";
import { getScotiaConfig, supabaseAdmin } from "../_shared/scotia/config.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

// Deliberately identical for wrong, expired, already-used and non-existent.
// Distinguishing them would turn this endpoint into an oracle for which codes
// are live.
const NOT_FOUND_MESSAGE =
  "We could not find that payment. Check the code with a member of staff, or ask them to send a new link.";

const linkRef = {
  token: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(20).optional(),
};

const resolveSchema = z.object({ action: z.literal("resolve"), ...linkRef });

const startSchema = z.object({
  action: z.literal("start"),
  ...linkRef,
  // The customer may add an address for their receipt if staff did not record one.
  customerEmail: z.string().email().max(200).optional(),
});

const selfServeSchema = z.object({
  action: z.literal("self-serve"),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().max(200).optional(),
  amount: z.union([z.string(), z.number()]),
  reason: z.string().max(500).optional(),
  turnstileToken: z.string().min(1).max(4000).optional(),
});

// Lets the public page render the real bounds and hide self-serve when it is off.
const settingsSchema = z.object({ action: z.literal("settings") });

const bodySchema = z.discriminatedUnion("action", [
  resolveSchema,
  startSchema,
  selfServeSchema,
  settingsSchema,
]);

function json(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req, corsPolicy) },
  });
}

/** We need to COUNT repeat callers, not identify them, so the IP is hashed. */
async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get("SCOTIA_SHARED_SECRET") ?? "walkin-pay";
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Durable, per-IP limiting. The in-memory limiter in _shared/http/rateLimit.ts
 * resets on every cold start, so it cannot bound an endpoint that signs real
 * gateway forms; it stays as a cheap first gate and this is the real one.
 * Returns true when the caller is over the limit.
 */
async function overRateLimit(
  ip: string,
  kind: "claim" | "self_serve",
  maxAttempts: number,
  windowMinutes: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("record_public_payment_attempt", {
    p_ip_hash: await hashIp(ip),
    p_kind: kind,
    p_max_attempts: maxAttempts,
    p_window_minutes: windowMinutes,
  });
  if (error) {
    // Fail closed: if we cannot count attempts we cannot bound abuse.
    console.error("walkin-pay: rate-limit accounting failed", error);
    return true;
  }
  return data === true;
}

/**
 * Cloudflare Turnstile, FAIL CLOSED.
 *
 * With no TURNSTILE_SECRET_KEY configured this returns false, which blocks the
 * self-serve flow entirely. That is deliberate: self-serve is the only path
 * where an anonymous stranger names their own amount, so it must not run
 * unprotected because a secret was never set. The assisted-link and
 * email-request flows never call this and are unaffected.
 */
async function turnstilePassed(token: string | undefined, ip: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("walkin-pay: TURNSTILE_SECRET_KEY is not configured; refusing self-serve");
    return false;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const outcome = await res.json() as { success?: boolean };
    return outcome.success === true;
  } catch (err) {
    console.error("walkin-pay: Turnstile verification failed", err);
    return false;
  }
}

const ALLOWED_RETURN_ORIGINS = [
  "https://classicvisions.net",
  "https://www.classicvisions.net",
];

/**
 * Where Fiserv sends the buyer's browser back to. Always the public
 * scotia-return function, carrying the SPA origin it should hand off to.
 * The origin is allowlisted here and again inside scotia-return, so a
 * customer-supplied Origin header cannot redirect the buyer off-site.
 */
function returnUrl(req: Request): string {
  const requested = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_RETURN_ORIGINS.includes(requested)
    || /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/.test(requested);
  const origin = allowed ? requested : (Deno.env.get("SCOTIA_SITE_ORIGIN") ?? ALLOWED_RETURN_ORIGINS[0]);
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/scotia-return?origin=${encodeURIComponent(origin)}`;
}

type ResolvedPayment = {
  id: string;
  payment_reference: string;
  customer_name: string;
  customer_email: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  origin: string;
};

/** Resolves a token or claim code. `redeem` marks it spent. */
async function resolveLink(
  ref: { token?: string; code?: string },
  redeem: boolean,
): Promise<ResolvedPayment | null> {
  const { data, error } = await supabaseAdmin.rpc("resolve_walk_in_payment_link", {
    p_token: ref.token ?? null,
    p_claim_code: ref.code ?? null,
    p_redeem: redeem,
  });
  if (error) {
    console.error("walkin-pay: link resolution failed", error);
    return null;
  }
  const rows = (data ?? []) as ResolvedPayment[];
  return rows.length > 0 ? rows[0] : null;
}

/** Builds the signed hosted-page form for an already-stored payment amount. */
async function signForm(
  paymentReference: string,
  amount: number,
  req: Request,
): Promise<{ gatewayUrl: string; formParams: Record<string, string> }> {
  const cfg = await getScotiaConfig();
  if (!cfg.sharedSecret || !cfg.storeId) {
    throw new Error("Card payments are not available right now.");
  }

  const url = returnUrl(req);
  const formParams = baseSaleParams(cfg, {
    chargetotal: amount.toFixed(2),
    responseSuccessURL: url,
    responseFailURL: url,
  });
  formParams.oid = paymentReference;
  // Server-to-server outcome, independent of whether the customer's browser
  // ever makes it back — a phone that dies mid-payment still settles.
  formParams.transactionNotificationURL =
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/scotia-notify`;
  formParams.hashExtended = await computeExtendedHash(formParams, cfg.sharedSecret);

  return { gatewayUrl: GATEWAY_URLS[cfg.env], formParams };
}

/** Only ever the four things a customer needs to recognise their own payment. */
const publicSummary = (payment: ResolvedPayment) => ({
  customerName: payment.customer_name,
  amount: Number(payment.amount),
  currency: payment.currency,
  reason: payment.reason,
  hasEmail: Boolean(payment.customer_email),
});

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const disallowed = rejectDisallowedOrigin(req, corsPolicy);
  if (disallowed) return disallowed;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, req);
  }

  const ip = getClientIp(req);
  const burst = checkRateLimit(ip, getCorsHeaders(req, corsPolicy), 40, 60_000);
  if (burst) return burst;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400, req);
  }

  try {
    if (body.action === "settings") {
      const { data } = await supabaseAdmin
        .from("walk_in_payment_settings")
        .select("self_serve_enabled,self_serve_min_amount,self_serve_max_amount")
        .maybeSingle();
      return json({
        selfServeEnabled: Boolean(data?.self_serve_enabled)
          // With no Turnstile secret the self-serve flow cannot run, so the page
          // should not offer it in the first place.
          && Boolean(Deno.env.get("TURNSTILE_SECRET_KEY")),
        minAmount: Number(data?.self_serve_min_amount ?? 20),
        maxAmount: Number(data?.self_serve_max_amount ?? 500),
      }, 200, req);
    }

    if (body.action === "resolve" || body.action === "start") {
      if (!body.token && !body.code) {
        return json({ error: NOT_FOUND_MESSAGE }, 404, req);
      }
      // Only typed codes are guessable, so only they consume the claim budget.
      if (body.code && await overRateLimit(ip, "claim", 10, 60)) {
        return json({
          error: "Too many attempts. Please wait a few minutes, or ask a member of staff for help.",
        }, 429, req);
      }

      const payment = await resolveLink(body, body.action === "start");
      if (!payment) return json({ error: NOT_FOUND_MESSAGE }, 404, req);

      if (body.action === "resolve") {
        return json({ payment: publicSummary(payment) }, 200, req);
      }

      if (body.customerEmail && !payment.customer_email) {
        await supabaseAdmin
          .from("walk_in_payments")
          .update({ customer_email: body.customerEmail })
          .eq("id", payment.id);
      }

      const prepared = await signForm(payment.payment_reference, Number(payment.amount), req);
      return json(prepared, 200, req);
    }

    // ── self-serve ──────────────────────────────────────────────────────────
    if (!await turnstilePassed(body.turnstileToken, ip)) {
      return json({
        error: "Self-service payment is unavailable right now. Please see a member of staff.",
      }, 503, req);
    }
    if (await overRateLimit(ip, "self_serve", 5, 60)) {
      return json({
        error: "Too many payment attempts. Please see a member of staff.",
      }, 429, req);
    }

    const amount = Number(typeof body.amount === "number" ? body.amount : String(body.amount).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Enter the amount you want to pay." }, 400, req);
    }

    // Bounds and the kill switch are enforced again in the database, so a caller
    // that reaches the RPC another way still cannot create an out-of-bounds intent.
    const { data: created, error: createError } = await supabaseAdmin.rpc(
      "create_self_serve_walk_in_payment",
      {
        p_amount: amount,
        p_customer_name: body.customerName,
        p_customer_email: body.customerEmail ?? null,
        p_reason: body.reason ?? null,
      },
    );
    if (createError || !created) {
      return json({ error: createError?.message ?? "Could not start the payment." }, 400, req);
    }

    const prepared = await signForm(
      (created as { payment_reference: string }).payment_reference,
      amount,
      req,
    );
    return json(prepared, 200, req);
  } catch (err) {
    console.error("walkin-pay: unhandled failure", err);
    return json({ error: err instanceof Error ? err.message : "Something went wrong." }, 500, req);
  }
});
