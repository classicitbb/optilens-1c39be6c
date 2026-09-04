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
import { getScotiaConfig, supabaseAdmin, type ScotiaConfig } from "../_shared/scotia/config.ts";
import { logScotiaEvent } from "../_shared/scotia/events.ts";

import { queuePaidOrderFulfillmentEmail } from "../_shared/email/paid-order-fulfillment.ts";
import { sendStatementPaymentReceipt } from "../_shared/email/statement-payment-receipt.ts";
import { sendWalkInPaymentReceipt } from "../_shared/email/walk-in-payment-receipt.ts";

function ok(body: Record<string, unknown> = { received: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Minimal surface of the admin client that the handler actually calls.
 *  Extracted so unit tests can inject a fake without pulling supabase-js. */
export interface NotifyAdmin {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        single: () => Promise<{ data: { user_id?: string | null } | null; error: unknown }>;
      };
    };
  };
}

export interface NotifyDeps {
  getConfig: () => Promise<ScotiaConfig>;
  admin: NotifyAdmin;
}

/** Handler factory — accepts injected deps so tests can stub config + DB. */
export function makeHandler(deps: NotifyDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "GET") {
      return ok({ name: "scotia-notify", version: "2026-07-24.1" });
    }
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

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
      const cfg = await deps.getConfig();
      if (!cfg.sharedSecret) {
        console.error("scotia-notify: Scotia gateway not configured (missing SharedSecret)");
        return ok({ received: false, reason: "not_configured" });
      }

      const result = await classifyScotiaResponse(response, cfg.sharedSecret, cfg.storeId);
      if (!result.hashValid) {
        console.error("scotia-notify: response hash did not validate", {
          oid,
          ...result.debugHash,
        });
        await logScotiaEvent(supabaseAdmin, {
          kind: "notify",
          outcome: "hash_invalid",
          oid,
          storeId: cfg.storeId,
          env: cfg.env,
          failReason: "Response hash did not validate",
          responseParams: response,
        });
        return ok({ received: true, settled: false, reason: "bad_hash" });
      }

      // Diagnostics: exact parameters and failure code from the S2S callback.
      await logScotiaEvent(supabaseAdmin, {
        kind: "notify",
        outcome: result.approved ? "ok" : "declined",
        oid,
        storeId: cfg.storeId,
        env: cfg.env,
        approved: result.approved,
        associationResponseCode: result.associationResponseCode,
        failRc: result.failRc,
        failReason: response.fail_reason ?? null,
        responseParams: response,
      });


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
        gateway_transaction_id: response.ipgTransactionId ?? response.transaction_id ?? response.transactionId ?? null,
        source: "notification",
      };

      if (oid.startsWith("STMT-")) {
        const paymentId = oid.slice("STMT-".length);
        const { error } = await deps.admin.rpc("settle_statement_payment", {
          p_payment_id: paymentId,
          p_gateway: gatewayPayload,
        });
        if (error) {
          console.error("scotia-notify: settle_statement_payment failed", { paymentId, error });
          return ok({ received: true, settled: false, reason: "rpc_error" });
        }
        if (result.approved) {
          await sendStatementPaymentReceipt(deps.admin as never, paymentId);
        }
        return ok({ received: true, settled: true, flow: "statement", approved: result.approved });
      }

      if (oid.startsWith("WALKIN-")) {
        const paymentId = oid.slice("WALKIN-".length);
        const { error } = await deps.admin.rpc("settle_walk_in_payment", {
          p_payment_id: paymentId,
          p_gateway: gatewayPayload,
        });
        if (error) {
          console.error("scotia-notify: settle_walk_in_payment failed", { paymentId, error });
          return ok({ received: true, settled: false, reason: "rpc_error" });
        }
        if (result.approved) {
          await sendWalkInPaymentReceipt(deps.admin as never, paymentId);
        }
        return ok({ received: true, settled: true, flow: "walk_in", approved: result.approved });
      }

      const { data: order, error: orderError } = await deps.admin
        .from("orders")
        .select("user_id")
        .eq("id", oid)
        .single();

      if (orderError || !order?.user_id) {
        console.error("scotia-notify: order not found for oid", { oid, orderError });
        return ok({ received: true, settled: false, reason: "order_not_found" });
      }

      const { error: settleError } = await deps.admin.rpc("settle_scotia_payment", {
        p_order_id: oid,
        p_gateway: gatewayPayload,
        p_actor_user_id: order.user_id,
      });
      if (settleError) {
        console.error("scotia-notify: settle_scotia_payment failed", { oid, settleError });
        return ok({ received: true, settled: false, reason: "rpc_error" });
      }

      if (result.approved) {
        await queuePaidOrderFulfillmentEmail(deps.admin as never, oid);
      }

      return ok({ received: true, settled: true, flow: "order", approved: result.approved });
    } catch (err) {
      console.error("scotia-notify: unexpected error", err);
      return ok({ received: true, settled: false, reason: "unexpected_error" });
    }
  };
}

Deno.serve(makeHandler({
  getConfig: getScotiaConfig,
  admin: supabaseAdmin as unknown as NotifyAdmin,
}));
