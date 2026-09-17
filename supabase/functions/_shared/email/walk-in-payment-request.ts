// Walk-in card-payment request.
//
// Sends the customer a one-time link to pay on their own device. The link token
// is generated and hashed by publish_walk_in_payment(); this module is the only
// place it appears in plaintext after that, and it is never logged.
//
// Hand-built HTML to match its sibling walk-in-payment-receipt.ts. Neither is in
// transactional-email-templates/registry.ts, and registering only one of the
// pair would be more confusing than registering neither.

import { sendManagedEmail } from "./managed-send.ts";

// deno-lint-ignore no-explicit-any
type AdminClient = { from: (table: string) => any };

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export async function sendWalkInPaymentRequest(
  admin: AdminClient,
  input: {
    paymentId: string;
    token: string;
    siteOrigin: string;
    /** Bumped on every re-send so a fresh link is never suppressed as a duplicate. */
    tokenVersion: number;
  },
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { data: payment, error } = await admin
      .from("walk_in_payments")
      .select("id,customer_name,customer_email,amount,currency,reason,link_expires_at,status")
      .eq("id", input.paymentId)
      .maybeSingle();
    if (error || !payment) return { sent: false, reason: "Payment not found." };
    if (String(payment.status) !== "pending") return { sent: false, reason: "Payment is no longer pending." };

    const to = String(payment.customer_email ?? "").trim();
    if (!to) return { sent: false, reason: "No customer email address." };

    const rawCurrency = String(payment.currency ?? "052").toUpperCase();
    const currency = rawCurrency === "052" ? "BBD" : rawCurrency;
    const amount = `${currency} $${Number(payment.amount ?? 0).toFixed(2)}`;
    const customer = String(payment.customer_name ?? "");
    const reason = String(payment.reason ?? "");
    const payUrl = `${input.siteOrigin.replace(/\/$/, "")}/pay?token=${encodeURIComponent(input.token)}`;
    const expires = payment.link_expires_at
      ? new Date(String(payment.link_expires_at)).toUTCString()
      : "";

    const messageId = `walk-in-payment-request-${input.paymentId}-${input.tokenVersion}`;

    const html = `
  <p>Hello${customer ? ` ${escapeHtml(customer)}` : ""},</p>
  <p>Classic Visions has requested a card payment of <strong>${escapeHtml(amount)}</strong>${
      reason ? ` for ${escapeHtml(reason)}` : ""
    }.</p>
  <p><a href="${escapeHtml(payUrl)}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600">Pay ${escapeHtml(amount)}</a></p>
  <p style="font-size:13px;color:#555">This link can only be used once${
      expires ? ` and expires on ${escapeHtml(expires)}` : ""
    }. If it stops working, ask us to send a new one.</p>
  <p style="font-size:13px;color:#555">Your card details are entered on Scotiabank&rsquo;s secure payment page. Classic Visions never sees or stores your card number.</p>
  <p style="font-size:13px;color:#555">If you were not expecting this, you can ignore this email &mdash; no payment will be taken.</p>
`;

    const text = `Hello${customer ? ` ${customer}` : ""},

Classic Visions has requested a card payment of ${amount}${reason ? ` for ${reason}` : ""}.

Pay here: ${payUrl}

This link can only be used once${expires ? ` and expires on ${expires}` : ""}.
Your card details are entered on Scotiabank's secure payment page; Classic Visions never sees or stores your card number.
If you were not expecting this, ignore this email — no payment will be taken.`;

    await sendManagedEmail(admin, {
      messageId,
      to,
      from: "Classic Visions Accounts <accounts@classicvisions.net>",
      subject: `Payment request — ${amount}`,
      html,
      text,
      label: "walk-in-payment-request",
      idempotencyKey: messageId,
    });

    return { sent: true };
  } catch (err) {
    // Never leak the token into logs.
    console.error("sendWalkInPaymentRequest failed", { paymentId: input.paymentId, err });
    return { sent: false, reason: "Could not send the payment request." };
  }
}
