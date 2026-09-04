// Walk-in card-payment receipt.
//
// Sent after settlement has committed, idempotent on the payment id, and never
// throws — a mail failure must not undo money that has already been taken.
//
// Delivers a payment receipt to the customer email when recorded, falling
// back to the staff member who created the payment if no customer email was
// provided (and sending a staff confirmation when both are available).

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
  options?: { force?: boolean },
): Promise<void> {
  try {
    const { data: payment, error } = await admin
      .from("walk_in_payments")
      .select(
        "id,created_by,customer_name,customer_email,order_reference,reason,amount,currency,status,gateway_oid,payment_reference,card_brand,card_last4",
      )
      .eq("id", paymentId)
      .maybeSingle();
    if (error || !payment) return;
    if (!["settled", "confirmed"].includes(String(payment.status))) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("email,full_name")
      .eq("user_id", payment.created_by)
      .maybeSingle();

    const customerEmail = String(payment.customer_email ?? "").trim();
    const staffEmail = String(profile?.email ?? "").trim();

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

    const recipientTasks: Array<{ to: string; messageId: string; subject: string; isCustomer: boolean }> = [];

    if (customerEmail) {
      const messageId = options?.force
        ? `walk-in-payment-receipt-${paymentId}-customer-${Date.now()}`
        : `walk-in-payment-receipt-${paymentId}-customer`;
      recipientTasks.push({
        to: customerEmail,
        messageId,
        subject: `Payment receipt — ${amount}`,
        isCustomer: true,
      });
    }

    if (staffEmail && staffEmail !== customerEmail) {
      const messageId = options?.force
        ? `walk-in-payment-receipt-${paymentId}-staff-${Date.now()}`
        : `walk-in-payment-receipt-${paymentId}-staff`;
      recipientTasks.push({
        to: staffEmail,
        messageId,
        subject: `Walk-in payment received — ${amount}`,
        isCustomer: false,
      });
    } else if (!customerEmail && staffEmail) {
      const messageId = options?.force
        ? `walk-in-payment-receipt-${paymentId}-${Date.now()}`
        : `walk-in-payment-receipt-${paymentId}`;
      recipientTasks.push({
        to: staffEmail,
        messageId,
        subject: `Walk-in payment received — ${amount}`,
        isCustomer: false,
      });
    }

    for (const task of recipientTasks) {
      if (!options?.force) {
        const { data: alreadySent } = await admin
          .from("email_send_log")
          .select("id")
          .eq("message_id", task.messageId)
          .maybeSingle();
        if (alreadySent) continue;
      }

      const greeting = task.isCustomer
        ? `<h1>Payment receipt</h1><p>Dear ${escapeHtml(customer || "Customer")}, thank you for your payment.</p>`
        : `<h1>Walk-in payment received</h1>`;

      const html = `${greeting}
<p>A card payment of <strong>${escapeHtml(amount)}</strong> was approved.</p>
<ul>
  ${customer ? `<li>Customer: ${escapeHtml(customer)}</li>` : ""}
  ${customerEmail ? `<li>Customer email: ${escapeHtml(customerEmail)}</li>` : ""}
  ${orderReference ? `<li>Order reference: ${escapeHtml(orderReference)}</li>` : ""}
  ${reason ? `<li>Reason: ${escapeHtml(reason)}</li>` : ""}
  ${card ? `<li>Card: ${escapeHtml(card)}</li>` : ""}
  <li>Reference: ${escapeHtml(reference)}</li>
</ul>
<p>${escapeHtml(RECONCILIATION_NOTE)}</p>
<p>Classic Visions</p>`;

      const textGreeting = task.isCustomer
        ? `Payment receipt\n\nDear ${customer || "Customer"}, thank you for your payment.`
        : `Walk-in payment received`;

      const text = `${textGreeting}

A card payment of ${amount} was approved.
${customer ? `Customer: ${customer}\n` : ""}${customerEmail ? `Customer email: ${customerEmail}\n` : ""}${orderReference ? `Order reference: ${orderReference}\n` : ""}${reason ? `Reason: ${reason}\n` : ""}${card ? `Card: ${card}\n` : ""}Reference: ${reference}

${RECONCILIATION_NOTE}

Classic Visions`;

      await sendManagedEmail(admin, {
        messageId: task.messageId,
        to: task.to,
        from: "Classic Visions Accounts <accounts@classicvisions.net>",
        subject: task.subject,
        html,
        text,
        label: "walk-in-payment-receipt",
        idempotencyKey: task.messageId,
      });
    }
  } catch (err) {
    console.error("sendWalkInPaymentReceipt failed", { paymentId, err });
  }
}
