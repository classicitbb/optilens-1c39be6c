// ============================================================
// scotia-return — Scotia eCom+ (Fiserv IPG Connect) redirect-back endpoint
// ------------------------------------------------------------
// PUBLIC, verify_jwt=false. test.ipg-online.com refuses to be embedded in a
// cross-origin iframe, so the integration uses "Direct Sale" mode (manual
// page 11): a full-page redirect to the gateway, which then POSTs the
// buyer's browser back here with the transaction result as form params
// (manual page 10). There is NO Supabase session on this request — the
// buyer's browser is being driven by Fiserv's auto-submitting return form,
// not by our app — so this function authenticates nothing and instead
// trusts the cryptographic response hash, exactly like the old `validate`
// action did, then settles the result via the service role.
//
// Routing (by the `oid` we sent at `prepare` time):
//   • "STMT-<account_payments.id>" → statement/balance payment
//                                      → settle_statement_payment (service role)
//   • "WALKIN-<walk_in_payments.id>" → staff walk-in payment
//                                      → settle_walk_in_payment (service role)
//   • otherwise, an orders.id (uuid) → checkout order
//                                      → settle_scotia_payment (service role)
//
// Always ends in a 302 redirect back into the SPA with a `scotia=` result
// flag — never renders JSON to the buyer's browser.
// ============================================================

import { classifyScotiaResponse } from "../_shared/scotia/ipgConnect.ts";
import { getScotiaConfig, siteOrigin, supabaseAdmin } from "../_shared/scotia/config.ts";
import { queuePaidOrderFulfillmentEmail } from "../_shared/email/paid-order-fulfillment.ts";
import { sendStatementPaymentReceipt } from "../_shared/email/statement-payment-receipt.ts";
import { sendWalkInPaymentReceipt } from "../_shared/email/walk-in-payment-receipt.ts";
import { logScotiaEvent } from "../_shared/scotia/events.ts";


const CHECKOUT_RETURN_PATH = "/order-complete";
const STATEMENT_RETURN_PATH = "/profile/statements";
const WALK_IN_RETURN_PATH = "/admin/settings/walk-in-payments";
const ORDER_COMPLETE_PATH = (orderId: string) => `/order/${orderId}`;

// The buyer may have started checkout on the apex site, the admin host, or a
// Lovable preview/published host. Fiserv POSTs back to the exact
// responseSuccessURL we signed, so the browser's origin is carried through as
// an `origin` query param on THIS request's URL. Honour it only when it is on
// the allowlist, otherwise fall back to the configured site origin.
const ALLOWED_RETURN_HOSTS = [
  "classicvisions.net",
  "www.classicvisions.net",
  "admin.classicvisions.net",
];
const ALLOWED_RETURN_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com"];

function resolveOrigin(req: Request): string {
  const requested = new URL(req.url).searchParams.get("origin");
  if (requested) {
    try {
      const url = new URL(requested);
      const host = url.hostname.toLowerCase();
      const allowed = url.protocol === "https:"
        && (ALLOWED_RETURN_HOSTS.includes(host)
          || ALLOWED_RETURN_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)));
      if (allowed) return url.origin;
      console.warn("scotia-return: ignoring non-allowlisted return origin", { requested });
    } catch {
      console.warn("scotia-return: ignoring malformed return origin", { requested });
    }
  }
  return siteOrigin();
}

function redirect(req: Request, path: string, params: Record<string, string>): Response {
  const url = new URL(path, resolveOrigin(req));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return redirect(req, CHECKOUT_RETURN_PATH, { scotia: "error" });
  }

  let response: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      response[key] = String(value);
    }
  } catch (err) {
    console.error("scotia-return: failed to parse gateway POST body", err);
    return redirect(req, CHECKOUT_RETURN_PATH, { scotia: "error" });
  }

  const oid = (response.oid ?? "").trim();
  const isStatementFlow = oid.startsWith("STMT-");
  const isWalkInFlow = oid.startsWith("WALKIN-");
  const returnPath = isStatementFlow
    ? STATEMENT_RETURN_PATH
    : isWalkInFlow ? WALK_IN_RETURN_PATH : CHECKOUT_RETURN_PATH;

  if (!oid) {
    console.error("scotia-return: gateway response missing oid", response);
    return redirect(req, returnPath, { scotia: "error" });
  }

  try {
    const cfg = await getScotiaConfig();
    if (!cfg.sharedSecret) {
      console.error("scotia-return: Scotia gateway not configured (missing SharedSecret)");
      return redirect(req, returnPath, { scotia: "error" });
    }

    const result = await classifyScotiaResponse(response, cfg.sharedSecret, cfg.storeId);

    if (!result.hashValid) {
      // Log only validation metadata; never emit the bank callback payload.
      console.error("scotia-return: response hash did not validate", { oid, ...result.debugHash });
      await logScotiaEvent(supabaseAdmin, {
        kind: "return",
        outcome: "hash_invalid",
        oid,
        storeId: cfg.storeId,
        env: cfg.env,
        failRc: result.failRc,
        failReason: "Response hash did not validate",
        amount: result.chargetotal ? Number(result.chargetotal) : null,
        currency: result.currency,
      });
      return redirect(req, returnPath, { scotia: "error" });
    }

    const gatewayPayload = {
      approved: result.approved,
      oid: result.oid,
      association_response_code: result.associationResponseCode,
      fail_rc: result.failRc,
      hosteddataid: result.hosteddataid,
      card_brand: response.ccbrand ?? response.paymentMethod ?? null,
      card_last4: (response.cardnumber ?? "").replace(/\D/g, "").slice(-4) || null,
      cardholder_name: response.bname ?? null,
      expiry_month: response.expmonth ? Number(response.expmonth) : null,
      expiry_year: response.expyear ? Number(response.expyear) : null,
      // hosteddataid is only ever present when the buyer's browser sent
      // assignToken=true at prepare time — its presence IS the save request.
      save_token: !!result.hosteddataid,
      currency: result.currency,
      chargetotal: result.chargetotal,
      gateway_transaction_id: response.ipgTransactionId ?? response.transaction_id ?? response.transactionId ?? null,
    };

    const outcome = result.approved ? "success" : "declined";

    // Keep only scalar reconciliation fields; never retain callback payloads.
    await logScotiaEvent(supabaseAdmin, {
      kind: "return",
      outcome: result.approved ? "ok" : "declined",
      oid,
      storeId: cfg.storeId,
      env: cfg.env,
      approved: result.approved,
      associationResponseCode: result.associationResponseCode,
      failRc: result.failRc,
      failReason: response.fail_reason ?? null,
      amount: result.chargetotal ? Number(result.chargetotal) : null,
      currency: result.currency,
    });


    if (isStatementFlow) {
      const paymentId = oid.slice("STMT-".length);
      const { error } = await supabaseAdmin.rpc("settle_statement_payment", {
        p_payment_id: paymentId,
        p_gateway: gatewayPayload,
      });
      if (error) {
        console.error("scotia-return: settle_statement_payment failed", { paymentId, error });
        return redirect(req, returnPath, { scotia: "error" });
      }
      const { data: settledPayment, error: savedCardLookupError } = await supabaseAdmin
        .from("account_payments")
        .select("card_saved_at")
        .eq("id", paymentId)
        .maybeSingle();
      if (savedCardLookupError) {
        console.error("scotia-return: saved-card status lookup failed", { paymentId, savedCardLookupError });
      }
      if (result.approved) {
        await sendStatementPaymentReceipt(supabaseAdmin as never, paymentId);
      }
      return redirect(req, returnPath, {
        scotia: outcome,
        ...(result.chargetotal ? { amt: String(result.chargetotal) } : {}),
        ...(settledPayment?.card_saved_at ? { card_saved: "true" } : {}),
      });
    }

    if (isWalkInFlow) {
      const paymentId = oid.slice("WALKIN-".length);
      const { error } = await supabaseAdmin.rpc("settle_walk_in_payment", {
        p_payment_id: paymentId,
        p_gateway: gatewayPayload,
      });
      if (error) {
        console.error("scotia-return: settle_walk_in_payment failed", { paymentId, error });
        return redirect(req, returnPath, { scotia: "error" });
      }
      if (result.approved) {
        await sendWalkInPaymentReceipt(supabaseAdmin as never, paymentId);
      }
      return redirect(req, returnPath, { scotia: outcome, payment: paymentId });
    }

    // Checkout order flow — settle_scotia_payment's ownership check trusts
    // the caller's p_actor_user_id, so look up the true owner via service
    // role (bypasses RLS) rather than trusting anything from the request.
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", oid)
      .single();

    if (orderError || !order?.user_id) {
      console.error("scotia-return: order not found for oid", { oid, orderError });
      return redirect(req, returnPath, { scotia: "error" });
    }

    const orderReturnPath = ORDER_COMPLETE_PATH(oid);

    const { error: settleError } = await supabaseAdmin.rpc("settle_scotia_payment", {
      p_order_id: oid,
      p_gateway: gatewayPayload,
      p_actor_user_id: order.user_id,
    });
    if (settleError) {
      console.error("scotia-return: settle_scotia_payment failed", { oid, settleError });
      return redirect(req, orderReturnPath, { scotia: "error" });
    }

    if (result.approved) {
      await queuePaidOrderFulfillmentEmail(supabaseAdmin as never, oid);
    }

    return redirect(req, orderReturnPath, { scotia: outcome });
  } catch (err) {
    console.error("scotia-return: unexpected error", err);
    return redirect(req, returnPath, { scotia: "error" });
  }
});
