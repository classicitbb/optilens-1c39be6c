import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Eye, FileCheck2, Mail, Send, ShieldCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DeliveryState = "awaiting_approval" | "approved" | "sent";
type StatementRow = { id: string; customer: string; email: string; period: string; balance: string; state: DeliveryState; pdf: string };

const initialRows: StatementRow[] = [
  { id: "RET-2026-09-001", customer: "Retail test account", email: "retail-test@example.invalid", period: "Sep 1–30, 2026", balance: "BBD 432.00", state: "awaiting_approval", pdf: "Statement-RET-2026-09-001.pdf" },
  { id: "RET-2026-09-002", customer: "Retail multi-page fixture", email: "multi-page@example.invalid", period: "Sep 1–30, 2026", balance: "BBD 8,240.50", state: "approved", pdf: "Statement-RET-2026-09-002.pdf" },
  { id: "RET-2026-09-003", customer: "Retail sent fixture", email: "sent@example.invalid", period: "Aug 1–31, 2026", balance: "BBD 125.00", state: "sent", pdf: "Statement-RET-2026-09-003.pdf" },
];

const stateMeta: Record<DeliveryState, { label: string; className: string }> = {
  awaiting_approval: { label: "Awaiting approval", className: "border-amber-300 bg-amber-50 text-amber-800" },
  approved: { label: "Approved · queued", className: "border-sky-300 bg-sky-50 text-sky-800" },
  sent: { label: "Sent", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
};

export default function StatementDeliveryPreviewPage() {
  const [rows, setRows] = useState(initialRows);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const pendingCount = useMemo(() => rows.filter((row) => row.state === "awaiting_approval").length, [rows]);
  const selectableRows = useMemo(() => rows.filter((row) => row.state !== "sent"), [rows]);
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.id));
  const previewRow = rows.find((row) => row.id === previewId) ?? null;

  const toggleSelected = (id: string, checked: boolean) => setSelectedIds((current) => {
    const next = new Set(current);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });
  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(selectableRows.map((row) => row.id)) : new Set());
  const approveSelected = () => {
    setRows((current) => current.map((row) => selectedIds.has(row.id) && row.state !== "sent" ? { ...row, state: "approved" } : row));
    setSelectedIds(new Set());
  };
  const approveOne = (id: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, state: "approved" } : row));
    setSelectedIds((current) => { const next = new Set(current); next.delete(id); return next; });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <AdminPageHeader icon={FileCheck2} title="Statement Delivery" />
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Review the prepared customer email and PDF before approving delivery. This localhost preview uses safe fixtures only.</p>
        </div>
        <Badge variant="outline" className="gap-1 border-violet-300 bg-violet-50 text-violet-800"><ShieldCheck className="h-3.5 w-3.5" /> Preview mode · no emails sent</Badge>
      </div>

      <Card className="border-violet-200 bg-violet-50/60">
        <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm text-violet-950">
          <div className="rounded-full bg-white p-2"><Clock3 className="h-5 w-5" /></div>
          <div><strong>{pendingCount} statement{pendingCount === 1 ? "" : "s"} awaiting staff approval.</strong><br /><span className="text-violet-800">The production flow will prepare the PDF and email, then hold here until an authorized employee approves it.</span></div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="gap-3 border-b bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-sm font-semibold tracking-tight">Prepared statements</CardTitle><p className="mt-1 text-xs text-muted-foreground">Select statements to approve as a batch, or inspect one PDF first.</p></div>
          <Button size="sm" disabled={selectedIds.size === 0} onClick={approveSelected}><Send className="mr-1.5 h-4 w-4" />Approve &amp; queue selected{selectedIds.size ? ` (${selectedIds.size})` : ""}</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-xs">
              <thead className="border-b bg-slate-50 text-left uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-12 px-3 py-2"><Checkbox aria-label="Select all prepared statements" checked={allSelected} onCheckedChange={(checked) => toggleAll(checked === true)} /></th><th className="px-3 py-2 font-semibold">Statement</th><th className="px-3 py-2 font-semibold">Customer / recipient</th><th className="px-3 py-2 font-semibold">Period</th><th className="px-3 py-2 font-semibold">Balance</th><th className="px-3 py-2 font-semibold">Lifecycle</th><th className="px-3 py-2 text-right font-semibold">Actions</th></tr></thead>
              <tbody>{rows.map((row) => { const meta = stateMeta[row.state]; return <tr key={row.id} className="border-b transition-colors hover:bg-slate-50/70 last:border-0">
                <td className="px-3 py-3">{row.state !== "sent" && <Checkbox aria-label={`Select ${row.id}`} checked={selectedIds.has(row.id)} onCheckedChange={(checked) => toggleSelected(row.id, checked === true)} />}</td>
                <td className="px-3 py-3"><div className="font-semibold text-slate-900">{row.id}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{row.pdf}</div></td>
                <td className="px-3 py-3"><div className="font-medium text-slate-800">{row.customer}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{row.email}</div></td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.period}</td><td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{row.balance}</td>
                <td className="px-3 py-3"><Badge variant="outline" className={`gap-1 ${meta.className}`}>{row.state === "sent" ? <CheckCircle2 className="h-3.5 w-3.5" /> : row.state === "approved" ? <Send className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}{meta.label}</Badge></td>
                <td className="px-3 py-3 text-right"><div className="flex justify-end gap-2">{row.state !== "sent" && <Button size="sm" variant="outline" onClick={() => setPreviewId(row.id)}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</Button>}{row.state === "awaiting_approval" ? <Button size="sm" onClick={() => approveOne(row.id)}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Approve</Button> : <span className="self-center text-[11px] text-muted-foreground">{row.state === "approved" ? "Worker will send next" : "Complete"}</span>}</div></td>
              </tr>; })}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!previewRow} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-w-3xl bg-slate-100 p-0">
          {previewRow && <>
            <DialogHeader className="border-b bg-white px-6 py-4"><DialogTitle>PDF preview · {previewRow.id}</DialogTitle><DialogDescription>{previewRow.pdf} · generated from the approved statement print layout</DialogDescription></DialogHeader>
            <div className="p-6"><div className="mx-auto min-h-[620px] max-w-[620px] bg-white p-8 shadow-xl ring-1 ring-slate-200">
              <div className="flex items-start justify-between border-b-2 border-amber-500 pb-5"><div><div className="text-xl font-extrabold tracking-[0.12em] text-slate-900">CLASSIC VISIONS</div><div className="mt-1 text-[10px] font-bold tracking-[0.28em] text-teal-600">OPTICAL · BARBADOS</div></div><div className="text-right text-4xl font-black tracking-tight text-slate-900/10">STATEMENT</div></div>
              <div className="mt-7 grid grid-cols-2 gap-5"><div className="border-l-4 border-amber-500 bg-slate-50 p-4 text-xs"><div className="font-bold uppercase tracking-wider text-slate-500">Customer</div><div className="mt-2 font-semibold text-slate-900">{previewRow.customer}</div><div className="mt-3 font-bold uppercase tracking-wider text-slate-500">Statement ID</div><div className="mt-1 text-slate-700">{previewRow.id}</div></div><div className="border border-slate-200 p-4 text-xs"><div className="font-bold uppercase tracking-wider text-teal-600">Account summary</div><div className="mt-4 flex justify-between border-b py-2"><span>Period</span><strong>{previewRow.period}</strong></div><div className="flex justify-between bg-slate-900 px-2 py-3 text-white"><span>New balance</span><strong className="text-amber-400">{previewRow.balance}</strong></div></div></div>
              <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600">Transaction detail</div><div className="mt-2 overflow-hidden border border-slate-200 text-xs"><div className="grid grid-cols-4 bg-slate-100 px-3 py-2 font-bold text-slate-500"><span>Date</span><span className="col-span-2">Description</span><span className="text-right">Amount</span></div>{["Invoice 1048 · Frames and lenses", "Payment received · Thank you", "Finance charge · Account terms"].map((line, index) => <div key={line} className="grid grid-cols-4 border-t px-3 py-3"><span className="text-slate-500">Sep {12 + index}, 2026</span><span className="col-span-2">{line}</span><span className="text-right font-semibold">{index === 1 ? "- BBD 100.00" : "BBD 266.00"}</span></div>)}</div>
              <div className="mt-8 border-t-2 border-amber-500 bg-amber-50 p-4 text-xs text-slate-700"><div className="font-bold uppercase tracking-[0.2em] text-amber-700">Payment instructions</div><div className="mt-2">Bank of Nova Scotia · Chequing · Account Name: Classic Visions</div><div className="mt-1">Terms: account due within 30 days of statement date.</div></div>
            </div></div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
