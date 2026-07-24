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
//   • otherwise, an orders.id (uuid) → checkout order
//                                      → settle_scotia_payment (service role)
//
// Always ends in a 302 redirect back into the SPA with a `scotia=` result
// flag — never renders JSON to the buyer's browser.
// ============================================================

import { classifyScotiaResponse } from "../_shared/scotia/ipgConnect.ts";
import { getScotiaConfig, siteOrigin, supabaseAdmin } from "../_shared/scotia/config.ts";

const CHECKOUT_RETURN_PATH = "/checkout";
const STATEMENT_RETURN_PATH = "/profile/statements";

function redirect(path: string, params: Record<string, string>): Response {
  const url = new URL(path, siteOrigin());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return redirect(CHECKOUT_RETURN_PATH, { scotia: "error" });
  }

  let response: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      response[key] = String(value);
    }
  } catch (err) {
    console.error("scotia-return: failed to parse gateway POST body", err);
    return redirect(CHECKOUT_RETURN_PATH, { scotia: "error" });
  }

  const oid = (response.oid ?? "").trim();
  const isStatementFlow = oid.startsWith("STMT-");
  const returnPath = isStatementFlow ? STATEMENT_RETURN_PATH : CHECKOUT_RETURN_PATH;

  if (!oid) {
    console.error("scotia-return: gateway response missing oid", response);
    return redirect(returnPath, { scotia: "error" });
  }

  try {
    const cfg = await getScotiaConfig();
    if (!cfg.sharedSecret) {
      console.error("scotia-return: Scotia gateway not configured (missing SharedSecret)");
      return redirect(returnPath, { scotia: "error" });
    }

    const result = await classifyScotiaResponse(response, cfg.sharedSecret);

    if (!result.hashValid) {
      console.error("scotia-return: response hash did not validate", { oid });
      return redirect(returnPath, { scotia: "error" });
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
    };

    const outcome = result.approved ? "success" : "declined";

    if (isStatementFlow) {
      const paymentId = oid.slice("STMT-".length);
      const { error } = await supabaseAdmin.rpc("settle_statement_payment", {
        p_payment_id: paymentId,
        p_gateway: gatewayPayload,
      });
      if (error) {
        console.error("scotia-return: settle_statement_payment failed", { paymentId, error });
        return redirect(returnPath, { scotia: "error" });
      }
      return redirect(returnPath, { scotia: outcome });
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
      return redirect(returnPath, { scotia: "error" });
    }

    const { error: settleError } = await supabaseAdmin.rpc("settle_scotia_payment", {
      p_order_id: oid,
      p_gateway: gatewayPayload,
      p_actor_user_id: order.user_id,
    });
    if (settleError) {
      console.error("scotia-return: settle_scotia_payment failed", { oid, settleError });
      return redirect(returnPath, { scotia: "error", order: oid });
    }

    return redirect(returnPath, { scotia: outcome, order: oid });
  } catch (err) {
    console.error("scotia-return: unexpected error", err);
    return redirect(returnPath, { scotia: "error" });
  }
});
