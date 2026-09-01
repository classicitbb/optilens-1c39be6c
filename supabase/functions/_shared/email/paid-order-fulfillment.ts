// Send a single, idempotent fulfillment notice only after a Scotia payment is
// settled. Both the browser return and the server notification webhook may
// reach this path, so the message id is deliberately stable per order.

import { sendManagedEmail } from "./managed-send.ts";

const FULFILLMENT_RECIPIENT = "orders@classicvisions.net";

type AdminClient = {
  from: (table: string) => any;
};

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

export async function queuePaidOrderFulfillmentEmail(admin: AdminClient, orderId: string): Promise<void> {
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,status,customer_name,contact_email,total_amount,shipping_address,checkout_method,created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order || order.status !== "confirmed") return;

  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("product_name,product_type,quantity,product_price")
    .eq("order_id", orderId);
  if (itemsError) return;

  const messageId = `paid-order-fulfillment-${orderId}`;
  const { data: alreadyQueued } = await admin
    .from("email_send_log")
    .select("id")
    .eq("message_id", messageId)
    .maybeSingle();
  if (alreadyQueued) return;

  const orderType = (items ?? []).some((item: { product_type?: string | null }) => item.product_type === "lens")
    ? "RX order"
    : "Stock order";
  const lines = (items ?? []).map((item: { product_name: string; quantity: number; product_price: number }) =>
    `<li>${escapeHtml(item.product_name)} × ${item.quantity} — $${(Number(item.product_price) * Number(item.quantity)).toFixed(2)}</li>`,
  ).join("");
  const subject = `${orderType} paid — ${orderId}`;
  const html = `<h1>${orderType} ready for fulfillment</h1><p>Order <strong>${escapeHtml(orderId)}</strong> has been paid through Scotia eCom+.</p><p>Customer: ${escapeHtml(order.customer_name ?? "Customer")} (${escapeHtml(order.contact_email ?? "no email")})</p><ul>${lines}</ul><p>Total: <strong>$${Number(order.total_amount ?? 0).toFixed(2)} USD</strong></p>`;
  const text = `${orderType} ready for fulfillment\nOrder: ${orderId}\nCustomer: ${order.customer_name ?? "Customer"} (${order.contact_email ?? "no email"})\nItems:\n${(items ?? []).map((item: { product_name: string; quantity: number; product_price: number }) => `- ${item.product_name} x ${item.quantity} - $${(Number(item.product_price) * Number(item.quantity)).toFixed(2)}`).join("\n")}\nTotal: $${Number(order.total_amount ?? 0).toFixed(2)} USD`;

  await sendManagedEmail(admin, {
    messageId,
    to: FULFILLMENT_RECIPIENT,
    from: "Classic Visions Orders <orders@classicvisions.net>",
    subject,
    html,
    text,
    label: "paid-order-fulfillment",
    idempotencyKey: messageId,
  });
}
