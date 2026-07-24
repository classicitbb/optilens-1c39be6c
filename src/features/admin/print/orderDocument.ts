export type OrderPrintItem = {
  id: string;
  productName: string;
  productType?: string | null;
  unitPrice: number;
  quantity: number;
  variantLabel?: string | null;
  sku?: string | null;
};

export type OrderPrintData = {
  id: string;
  createdAt: string;
  totalAmount: number;
  status?: string | null;
  customerName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  shippingAddress?: Record<string, unknown> | null;
  checkoutMethod?: string | null;
  items: OrderPrintItem[];
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#039;");

const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const formatAddress = (address?: Record<string, unknown> | null) => {
  if (!address) return "";

  return [
    address.recipient,
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postal_code,
    address.country,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");
};

const formatCheckoutMethod = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatStatus = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const documentStyles = `
  @page { size: Letter portrait; margin: 6mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #0B1E35; }
  body { font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .order-page { width: 100%; max-width: 204mm; margin: 0 auto; }
  .order-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 2px solid #C89130; padding: 3mm 0 4mm; }
  .brand { font-size: 18px; font-weight: 800; letter-spacing: .015em; color: #0B1E35; }
  .brand-subtitle { margin-top: 3px; color: #5b6b7c; font-size: 9.5px; line-height: 1.45; }
  .document-title { color: #0B1E35; font-size: 22px; font-weight: 800; letter-spacing: .02em; text-align: right; }
  .meta { border-collapse: collapse; margin: 7px 0 0 auto; }
  .meta td { padding: 1px 0 1px 13px; text-align: right; white-space: nowrap; }
  .meta-label { color: #8a93a0; font-size: 8.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .meta-value { color: #0B1E35; font-size: 11px; font-weight: 700; }
  .summary { display: flex; justify-content: space-between; gap: 22px; align-items: flex-start; padding: 5mm 0 4mm; }
  .eyebrow { color: #1A8A9C; font-size: 8.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  .customer { margin-top: 5px; max-width: 110mm; font-size: 10px; line-height: 1.45; color: #5b6b7c; white-space: pre-line; }
  .customer strong { color: #0B1E35; font-size: 11px; }
  .total-callout { min-width: 42mm; text-align: right; }
  .total-amount { margin-top: 5px; color: #0B1E35; font-size: 22px; font-weight: 800; line-height: 1; white-space: nowrap; }
  table.items { width: 100%; border: 1px solid #e7e4db; border-collapse: separate; border-spacing: 0; border-radius: 7px; overflow: hidden; }
  .items th { background: #0B1E35; color: #F4F2ED; padding: 8px 10px; font-size: 8.5px; font-weight: 700; letter-spacing: .09em; text-align: left; text-transform: uppercase; }
  .items th.amount { color: #C89130; }
  .items th.numeric, .items td.numeric { text-align: right; white-space: nowrap; }
  .items td { border-bottom: 1px solid #f0ede6; color: #41525f; font-size: 10px; line-height: 1.35; padding: 7px 10px; vertical-align: top; }
  .items tbody tr:nth-child(even) { background: #f9f8f5; }
  .items tbody tr:last-child td { border-bottom: 0; }
  .item-name { color: #0B1E35; font-size: 10.5px; font-weight: 700; }
  .item-detail { color: #8a93a0; font-size: 8.5px; margin-top: 2px; }
  .totals { border-collapse: collapse; margin: 4mm 0 0 auto; min-width: 58mm; }
  .totals td { padding: 3px 8px; color: #5b6b7c; font-size: 10px; text-align: right; }
  .totals .amount { color: #0B1E35; font-weight: 700; white-space: nowrap; }
  .totals .rule td { padding: 2px 0 0; }
  .totals .rule div { background: #C89130; height: 2px; }
  .totals .grand td { color: #0B1E35; font-size: 13px; font-weight: 800; padding-top: 5px; }
  .footer { border-top: 1px solid #e7e4db; color: #8a93a0; font-size: 8.5px; line-height: 1.45; margin-top: 7mm; padding-top: 3mm; text-align: center; }
  tr, .summary, .totals { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
`;

export const buildOrderDocumentHtml = (order: OrderPrintData) => {
  const itemSubtotal = order.items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
  const shippingAmount = Math.max(0, Number(order.totalAmount || 0) - itemSubtotal);
  const customerLines = [
    order.customerName ? `<strong>${escapeHtml(order.customerName)}</strong>` : "",
    order.contactEmail ? escapeHtml(order.contactEmail) : "",
    order.contactPhone ? escapeHtml(order.contactPhone) : "",
    formatAddress(order.shippingAddress) ? escapeHtml(formatAddress(order.shippingAddress)) : "",
  ].filter(Boolean).join("\n");
  const rows = order.items.map((item, index) => {
    const detail = [item.variantLabel ?? item.productType, item.sku].filter(Boolean).map(escapeHtml).join(" · ");
    const amount = Number(item.unitPrice || 0) * Number(item.quantity || 0);
    return `<tr style="background:${index % 2 === 1 ? "#f9f8f5" : "#fff"}">
      <td><div class="item-name">${escapeHtml(item.productName)}</div>${detail ? `<div class="item-detail">${detail}</div>` : ""}</td>
      <td class="numeric">${escapeHtml(item.quantity)}</td>
      <td class="numeric">${money(item.unitPrice)}</td>
      <td class="numeric amount">${money(amount)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" style="padding:14px 10px;color:#8a93a0;font-style:italic">No line items are recorded for this order.</td></tr>`;
  const date = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(order.createdAt));
  const paymentMethod = formatCheckoutMethod(order.checkoutMethod);
  const status = formatStatus(order.status);

  return `<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><title>Order ${escapeHtml(order.id.slice(0, 8).toUpperCase())}</title><style>${documentStyles}</style></head>
  <body><main class="order-page">
    <header class="order-header">
      <div><div class="brand">Classic Visions</div><div class="brand-subtitle">Order confirmation and item summary</div></div>
      <div><div class="document-title">ORDER</div><table class="meta"><tr><td class="meta-label">Order #</td><td class="meta-value">${escapeHtml(order.id.slice(0, 8).toUpperCase())}</td></tr><tr><td class="meta-label">Date</td><td class="meta-value">${escapeHtml(date)}</td></tr>${status ? `<tr><td class="meta-label">Status</td><td class="meta-value">${escapeHtml(status)}</td></tr>` : ""}</table></div>
    </header>
    <section class="summary"><div><div class="eyebrow">Prepared for</div><div class="customer">${customerLines || "—"}</div></div><div class="total-callout"><div class="eyebrow">Order total</div><div class="total-amount">${money(order.totalAmount)}</div></div></section>
    <table class="items"><thead><tr><th>Description</th><th class="numeric">Qty</th><th class="numeric">Unit</th><th class="numeric amount">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="totals"><tbody><tr><td>Subtotal</td><td class="amount">${money(itemSubtotal)}</td></tr>${shippingAmount > 0.004 ? `<tr><td>Shipping / handling</td><td class="amount">${money(shippingAmount)}</td></tr>` : ""}<tr class="rule"><td colspan="2"><div></div></td></tr><tr class="grand"><td>Total</td><td>${money(order.totalAmount)}</td></tr></tbody></table>
    <footer class="footer">${paymentMethod ? `Checkout method: ${escapeHtml(paymentMethod)} · ` : ""}This document records the items ordered and is not a tax invoice.</footer>
  </main></body></html>`;
};

export const printOrderDocument = (order: OrderPrintData) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.opener = null;

  printWindow.document.open();
  printWindow.document.write(buildOrderDocumentHtml(order));
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 150);
  return true;
};
