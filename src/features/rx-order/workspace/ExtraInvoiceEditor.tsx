import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserRole } from "@/hooks/useUserRole";
import { useIssueExtraInvoice, useOrderExtraInvoices, type ExtraInvoiceLine } from "../hooks/useOrderExtraInvoices";
import type { WorkspaceItem } from "./classify";

export function ExtraInvoiceEditor({ item }: { item: WorkspaceItem }) {
  const { canEdit } = useUserRole();
  const { data: invoices = [] } = useOrderExtraInvoices("staff");
  const issue = useIssueExtraInvoice();
  const [editing, setEditing] = useState(false);
  const [userId, setUserId] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [lines, setLines] = useState<ExtraInvoiceLine[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const source = item.stock ?? item.submission;
  const orderId = source?.order_id;
  const { data: recipients = [] } = useQuery({
    queryKey: ["extra-invoice-recipients", item.accountId], enabled: editing && !orderId && item.accountId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id,full_name,display_name").eq("crm_customer_id", item.accountId!).eq("portal_access_status", "approved_customer");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!source) return null;
  const related = invoices.filter((i) => i.stock_submission_id === item.stock?.id || i.rx_submission_id === item.submission?.id);
  const total = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unit_price * 100) / 100, 0);
  return <section className="space-y-3 rounded-lg border p-3">
    <h3 className="text-sm font-semibold">Additional invoices</h3>
    {related.map((i) => <p key={i.id} className="text-xs">{i.invoice_number} · BBD {Number(i.total_bbd).toFixed(2)} · {i.status === "paid" ? "Paid" : "Unpaid — shipment held"}</p>)}
    {!editing ? canEdit && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Issue additional invoice</Button> : <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      await issue.mutateAsync({ kind: item.stock ? "stock" : "rx", submissionId: source.id, userId: userId || null, lines, requestKey }).then(() => {
        setEditing(false); setLines([{ description: "", quantity: 1, unit_price: 0 }]); setRequestKey(crypto.randomUUID());
      }).catch(() => undefined);
    }}>
      <p className="text-xs text-muted-foreground">Invoice amounts are in BBD, including any applicable tax. The customer reviews and pays this invoice from their cart. Shipment stays on hold until payment is confirmed.</p>
      {!orderId && <Label className="block space-y-1">Portal customer<select required value={userId} onChange={(e) => setUserId(e.target.value)} className="h-10 w-full border bg-background px-2"><option value="">Choose invoice recipient…</option>{recipients.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name || p.display_name || p.user_id}</option>)}</select></Label>}
      {lines.map((line, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_65px_90px] gap-2">
        <Label>Description<Input required maxLength={500} value={line.description} onChange={(e) => setLines((rows) => rows.map((r, n) => n === index ? { ...r, description: e.target.value } : r))} /></Label>
        <Label>Qty<Input required type="number" min={1} max={9999} step={1} value={line.quantity} onChange={(e) => setLines((rows) => rows.map((r, n) => n === index ? { ...r, quantity: Number(e.target.value) } : r))} /></Label>
        <Label>BBD each<Input required type="number" min={0} step="0.01" value={line.unit_price} onChange={(e) => setLines((rows) => rows.map((r, n) => n === index ? { ...r, unit_price: Number(e.target.value) } : r))} /></Label>
      </div>)}
      <Button type="button" variant="ghost" size="sm" disabled={lines.length >= 50} onClick={() => setLines((rows) => [...rows, { description: "", quantity: 1, unit_price: 0 }])}>Add line</Button>
      <p className="text-sm font-semibold">Total BBD {total.toFixed(2)}</p>
      {issue.error && <p role="alert" className="text-xs text-destructive">{String((issue.error as { message?: string }).message ?? "Could not issue invoice.")}</p>}
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={issue.isPending || !Number.isFinite(total) || total <= 0 || total > 999999.99}>{issue.isPending ? "Issuing…" : "Issue invoice to customer cart"}</Button><Button type="button" variant="ghost" size="sm" disabled={issue.isPending} onClick={() => setEditing(false)}>Cancel</Button></div>
    </form>}
  </section>;
}
