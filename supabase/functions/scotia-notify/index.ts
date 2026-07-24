// ============================================================
// scotia-notify — Scotia eCom+ (Fiserv IPG Connect) S2S notification receiver
// ------------------------------------------------------------
// PUBLIC, verify_jwt=false. Fiserv posts the transaction outcome
// server-to-server to the `notificationURL` we sign into the prepare form.
// Unlike scotia-return (which is driven by the buyer's browser and only
// fires when the buyer completes the return trip), this webhook fires as
// soon as the gateway finishes processing — even if the buyer closes the
// tab, loses network, or the return POST is delayed.
//
// Authenticity: no Supabase session on this request. Trust is established
// entirely by recomputing the response HMAC with our SharedSecret before
// touching any DB rows. Settlement is idempotent — the underlying RPCs
// tolerate being called more than once with the same gateway payload, so
// if scotia-return already settled the row, this webhook is a safe no-op.
//
// Response: ALWAYS return 200 to Fiserv unless the body is completely
// unparseable. A 5xx here would make Fiserv retry indefinitely, but we
// don't want retries to mask our own downstream failures — those are
// logged instead and surfaced through the polling UI on /order/:id.
// ============================================================

import { classifyScotiaResponse } from "../_shared/scotia/ipgConnect.ts";
import { getScotiaConfig, supabaseAdmin } from "../_shared/scotia/config.ts";

function ok(body: Record<string, unknown> = { received: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    // Version probe (safe to expose — no secrets).
    return ok({ name: "scotia-notify", version: "2026-07-24.1" });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Fiserv posts application/x-www-form-urlencoded; some test tools post JSON.
  let response: Record<string, string> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = await req.json();
      for (const [k, v] of Object.entries(body ?? {})) response[k] = String(v);
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries()) response[k] = String(v);
    }
  } catch (err) {
    console.error("scotia-notify: failed to parse notification body", err);
    return ok({ received: false, reason: "unparseable" });
  }

  const oid = (response.oid ?? "").trim();
  if (!oid) {
    console.error("scotia-notify: notification missing oid", response);
    return ok({ received: false, reason: "missing_oid" });
  }

  try {
    const cfg = await getScotiaConfig();
    if (!cfg.sharedSecret) {
      console.error("scotia-notify: Scotia gateway not configured (missing SharedSecret)");
      return ok({ received: false, reason: "not_configured" });
    }

    const result = await classifyScotiaResponse(response, cfg.sharedSecret);
    if (!result.hashValid) {
      console.error("scotia-notify: response hash did not validate", {
        oid,
        ...result.debugHash,
      });
      // Do NOT settle. Still return 200 so Fiserv doesn't retry a payload
      // we've deemed inauthentic.
      return ok({ received: true, settled: false, reason: "bad_hash" });
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
      save_token: !!result.hosteddataid,
      currency: result.currency,
      chargetotal: result.chargetotal,
      source: "notification",
    };

    if (oid.startsWith("STMT-")) {
      const paymentId = oid.slice("STMT-".length);
      const { error } = await supabaseAdmin.rpc("settle_statement_payment", {
        p_payment_id: paymentId,
        p_gateway: gatewayPayload,
      });
      if (error) {
        console.error("scotia-notify: settle_statement_payment failed", { paymentId, error });
        return ok({ received: true, settled: false, reason: "rpc_error" });
      }
      return ok({ received: true, settled: true, flow: "statement", approved: result.approved });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", oid)
      .single();

    if (orderError || !order?.user_id) {
      console.error("scotia-notify: order not found for oid", { oid, orderError });
      return ok({ received: true, settled: false, reason: "order_not_found" });
    }

    const { error: settleError } = await supabaseAdmin.rpc("settle_scotia_payment", {
      p_order_id: oid,
      p_gateway: gatewayPayload,
      p_actor_user_id: order.user_id,
    });
    if (settleError) {
      console.error("scotia-notify: settle_scotia_payment failed", { oid, settleError });
      return ok({ received: true, settled: false, reason: "rpc_error" });
    }

    return ok({ received: true, settled: true, flow: "order", approved: result.approved });
  } catch (err) {
    console.error("scotia-notify: unexpected error", err);
    return ok({ received: true, settled: false, reason: "unexpected_error" });
  }
});
