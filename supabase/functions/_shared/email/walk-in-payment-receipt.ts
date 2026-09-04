// Walk-in card-payment receipt.
//
// Mirrors statement-payment-receipt.ts: sent after settlement has committed,
// idempotent on the payment id, and never throws — a mail failure must not
// undo money that has already been taken.
//
// Walk-in payments carry no customer email (staff key in a name only), so the
// receipt goes to the staff member who created the payment.

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

const RECONCILIATION_NOTE =
  "Please note: this payment will only be reflected on the account after it is reconciled with the bank, which takes 3-5 business days.";

export async function sendWalkInPaymentReceipt(
  admin: AdminClient,
  paymentId: string,
): Promise<void> {
  try {
    const { data: payment, error } = await admin
      .from("walk_in_payments")
      .select(
        "id,created_by,customer_name,order_reference,reason,amount,currency,status,gateway_oid,payment_reference,card_brand,card_last4",
      )
      .eq("id", paymentId)
      .maybeSingle();
    if (error || !payment) return;
    if (!["settled", "confirmed"].includes(String(payment.status))) return;

    const messageId = `walk-in-payment-receipt-${paymentId}`;
    const { data: alreadySent } = await admin
      .from("email_send_log")
      .select("id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (alreadySent) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("email,full_name")
      .eq("user_id", payment.created_by)
      .maybeSingle();

    const recipient = String(profile?.email ?? "").trim();
    if (!recipient) return;

    const rawCurrency = String(payment.currency ?? "BBD").toUpperCase();
    const currency = rawCurrency === "052" ? "BBD" : rawCurrency;
    const amount = `${currency} $${Number(payment.amount ?? 0).toFixed(2)}`;
    const customer = String(payment.customer_name ?? "");
    const orderReference = String(payment.order_reference ?? "");
    const reason = String(payment.reason ?? "");
    const reference = String(payment.gateway_oid ?? payment.payment_reference ?? payment.id);
    const card = [payment.card_brand, payment.card_last4 ? `•••• ${payment.card_last4}` : ""]
      .filter(Boolean)
      .join(" ");

    const subject = `Walk-in payment received — ${amount}`;
    const html = `<h1>Walk-in payment received</h1>
<p>A card payment of <strong>${escapeHtml(amount)}</strong> was approved.</p>
<ul>
  ${customer ? `<li>Customer: ${escapeHtml(customer)}</li>` : ""}
  ${orderReference ? `<li>Order reference: ${escapeHtml(orderReference)}</li>` : ""}
  ${reason ? `<li>Reason: ${escapeHtml(reason)}</li>` : ""}
  ${card ? `<li>Card: ${escapeHtml(card)}</li>` : ""}
  <li>Reference: ${escapeHtml(reference)}</li>
</ul>
<p>${escapeHtml(RECONCILIATION_NOTE)}</p>
<p>Classic Visions</p>`;
    const text = `Walk-in payment received

A card payment of ${amount} was approved.
${customer ? `Customer: ${customer}\n` : ""}${orderReference ? `Order reference: ${orderReference}\n` : ""}${reason ? `Reason: ${reason}\n` : ""}${card ? `Card: ${card}\n` : ""}Reference: ${reference}

${RECONCILIATION_NOTE}

Classic Visions`;

    await sendManagedEmail(admin, {
      messageId,
      to: recipient,
      from: "Classic Visions Accounts <accounts@classicvisions.net>",
      subject,
      html,
      text,
      label: "walk-in-payment-receipt",
      idempotencyKey: messageId,
    });
  } catch (err) {
    console.error("sendWalkInPaymentReceipt failed", { paymentId, err });
  }
}
