// Statement card-payment receipt.
//
// Previously queued from Postgres via the removed `enqueue_email` helper,
// which made settlement fail for payments the gateway had already approved.
// Receipts now go out here, after settlement has committed, and any failure
// is logged rather than thrown so money taken is never lost to an email bug.

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
  "Please note: this payment will only be reflected on your statement after it is reconciled with the bank, which takes 3-5 business days.";

export async function sendStatementPaymentReceipt(
  admin: AdminClient,
  paymentId: string,
): Promise<void> {
  try {
    const { data: payment, error } = await admin
      .from("account_payments")
      .select("id,user_id,account_number,statement_id,amount,currency,status,gateway_oid,created_at")
      .eq("id", paymentId)
      .maybeSingle();
    if (error || !payment) return;
    if (!["settled", "confirmed"].includes(String(payment.status))) return;

    const messageId = `statement-payment-receipt-${paymentId}`;
    const { data: alreadySent } = await admin
      .from("email_send_log")
      .select("id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (alreadySent) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("email,full_name")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    const recipient = String(profile?.email ?? "").trim();
    if (!recipient) return;

    const currency = String(payment.currency ?? "BBD").toUpperCase() === "052"
      ? "BBD"
      : String(payment.currency ?? "BBD").toUpperCase();
    const amount = `${currency} $${Number(payment.amount ?? 0).toFixed(2)}`;
    const account = String(payment.account_number ?? "");
    const statement = String(payment.statement_id ?? "");
    const reference = String(payment.gateway_oid ?? payment.id);
    const name = String(profile?.full_name ?? "there");

    const subject = `Payment received — ${amount}`;
    const html = `<h1>Thank you for your payment</h1>
<p>Hi ${escapeHtml(name)},</p>
<p>We have received your card payment of <strong>${escapeHtml(amount)}</strong>.</p>
<ul>
  ${account ? `<li>Account: ${escapeHtml(account)}</li>` : ""}
  ${statement ? `<li>Statement: ${escapeHtml(statement)}</li>` : ""}
  <li>Reference: ${escapeHtml(reference)}</li>
</ul>
<p>${escapeHtml(RECONCILIATION_NOTE)}</p>
<p>Classic Visions</p>`;
    const text = `Thank you for your payment

Hi ${name},

We have received your card payment of ${amount}.
${account ? `Account: ${account}\n` : ""}${statement ? `Statement: ${statement}\n` : ""}Reference: ${reference}

${RECONCILIATION_NOTE}

Classic Visions`;

    await sendManagedEmail(admin, {
      messageId,
      to: recipient,
      from: "Classic Visions Accounts <accounts@classicvisions.net>",
      subject,
      html,
      text,
      label: "statement-payment-receipt",
      idempotencyKey: messageId,
    });
  } catch (err) {
    console.error("sendStatementPaymentReceipt failed", { paymentId, err });
  }
}
