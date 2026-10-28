import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useOrderExtraInvoices, extraInvoicePaymentToken } from "@/features/rx-order/hooks/useOrderExtraInvoices";
export function ExtraInvoicesCart() {
  const { data: invoices = [], error } = useOrderExtraInvoices();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const navigate = useNavigate();
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  if (error) return <p role="alert" className="p-3 text-sm text-destructive">Could not load additional invoices. Please refresh before checkout.</p>;
  if (!unpaid.length) return null;
  return <section aria-label="Additional invoices" className="space-y-3 rounded-lg border bg-card p-4">
    <h2 className="font-semibold">Additional invoices</h2>
    <p className="text-xs text-muted-foreground">Extra items and lab-confirmed prices are paid separately. The related order is held for shipment until these invoices are paid.</p>
    {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
    {unpaid.map((invoice) => <article key={invoice.id} className="space-y-2 border-t pt-3">
      <h3 className="text-sm font-semibold">{invoice.invoice_number} · BBD {Number(invoice.total_bbd).toFixed(2)}</h3>
      <ul className="space-y-1 text-xs">{invoice.lines.map((line, index) => <li key={index}>{line.quantity} × {line.description} · BBD {Number(line.unit_price).toFixed(2)} each</li>)}</ul>
      <Button size="sm" disabled={busy !== null} onClick={async () => {
        setBusy(invoice.id); setFailure("");
        try { const token = await extraInvoicePaymentToken(invoice.id); navigate(`/pay?token=${encodeURIComponent(token)}`); }
        catch (e) { setFailure(e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? "Could not open payment.")); }
        finally { setBusy(null); }
      }}>{busy === invoice.id ? "Opening…" : "Review & pay invoice"}</Button>
    </article>)}
  </section>;
}
