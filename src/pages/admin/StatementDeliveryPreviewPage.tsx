import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, Eye, FileCheck2, Mail, Printer, RefreshCw, Send, ShieldCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router";

type DeliveryRow = { id: string; innovationsStatementId: number; customer: string; email: string; period: string; balance: number | null; state: string; emailStatus: string; pdf: string; storagePath: string | null; error: string | null; void: boolean };
const money = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-BB", { style: "currency", currency: "BBD" }).format(value);
const dateLabel = (value: string | null | undefined) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-BB", { month: "short", day: "numeric", year: "numeric" }) : "—";
const REHEARSAL_FROM_DATE = "2026-09-01";
const REHEARSAL_TO_DATE = "2026-09-30";

async function loadStatementDeliveryRows(): Promise<DeliveryRow[]> {
  const jobRows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: jobs, error: jobsError } = await (supabase.from("statement_document_jobs") as any).select("id,innovations_statement_id,statement_id,status,email_status,pdf_filename,error_message,skip_reason,discovered_at").order("discovered_at", { ascending: true }).range(from, from + 999);
    if (jobsError) throw jobsError;
    jobRows.push(...((jobs ?? []) as any[]));
    if (!jobs || jobs.length < 1000) break;
  }
  const innovationIds = [...new Set(jobRows.map((job) => job.innovations_statement_id).filter((id) => id != null))];
  if (!innovationIds.length) return [];
  const statementRows: any[] = [];
  for (let from = 0; from < innovationIds.length; from += 500) {
    const { data: statements, error: statementsError } = await (supabase.from("statements") as any).select("id,innovations_statement_id,customer_id,account_number,from_date,to_date,closing_balance,void").in("innovations_statement_id", innovationIds.slice(from, from + 500)).gte("from_date", REHEARSAL_FROM_DATE).lte("to_date", REHEARSAL_TO_DATE);
    if (statementsError) throw statementsError;
    statementRows.push(...((statements ?? []) as any[]));
  }
  const customerIds = [...new Set(statementRows.map((statement) => statement.customer_id).filter((id) => id != null))];
  const customerRows: any[] = [];
  for (let from = 0; from < customerIds.length; from += 500) {
    const { data: customers, error: customersError } = await (supabase.from("customers") as any).select("id,name,email,account_number,contact_id").in("id", customerIds.slice(from, from + 500));
    if (customersError) throw customersError;
    customerRows.push(...((customers ?? []) as any[]));
  }
  const contactIds = [...new Set(customerRows.map((customer) => customer.contact_id).filter((id) => id != null))];
  const { data: contacts } = contactIds.length ? await (supabase.from("contacts") as any).select("id,email").in("id", contactIds) : { data: [] };
  const statementsByInnovation = new Map(statementRows.map((statement) => [statement.innovations_statement_id, statement]));
  const customersById = new Map(customerRows.map((customer) => [customer.id, customer]));
  const contactsById = new Map((contacts ?? []).map((contact: any) => [contact.id, contact]));
  return jobRows.map((job) => {
    const statement = statementsByInnovation.get(job.innovations_statement_id);
    const customer = statement ? customersById.get(statement.customer_id) : null;
    const contact = customer?.contact_id ? contactsById.get(customer.contact_id) : null;
    const email = String(customer?.email ?? contact?.email ?? "").trim();
    return { id: job.id, innovationsStatementId: job.innovations_statement_id, customer: customer?.name ?? (statement?.account_number ? `Account ${statement.account_number}` : "Customer not resolved"), email, period: statement ? `${dateLabel(statement.from_date)} – ${dateLabel(statement.to_date)}` : "Statement pending resolution", balance: statement?.closing_balance ?? null, state: job.status ?? "pending", emailStatus: job.email_status ?? "pending", pdf: job.pdf_filename ?? `Statement-${job.innovations_statement_id}.pdf`, storagePath: null, error: job.error_message ?? job.skip_reason ?? null, void: Boolean(statement?.void) };
  }).filter((row) => !row.void && row.state !== "skipped" && row.period !== "Statement pending resolution");
}

const stateMeta = (row: DeliveryRow) => {
  if (row.emailStatus === "sent" || row.state === "sent") return { label: "Sent", className: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 };
  if (row.state === "failed") return { label: "Failed · retry pending", className: "border-red-300 bg-red-50 text-red-800", icon: AlertCircle };
  if (row.emailStatus === "approved") return { label: "Approved · queued", className: "border-sky-300 bg-sky-50 text-sky-800", icon: Send };
  if (row.state === "uploaded") return { label: "Awaiting approval", className: "border-amber-300 bg-amber-50 text-amber-800", icon: Mail };
  return { label: row.state === "processing" ? "Processing" : "Preparing", className: "border-slate-300 bg-slate-50 text-slate-700", icon: Clock3 };
};

export default function StatementDeliveryPreviewPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "missing_email" | "ready" | "failed">("all");
  const { data: rows = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["admin-statement-delivery"], queryFn: loadStatementDeliveryRows });
  const missingEmailRows = useMemo(() => rows.filter((row) => !row.email), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => filter === "all" || (filter === "missing_email" && !row.email) || (filter === "ready" && row.state === "uploaded" && row.emailStatus !== "sent") || (filter === "failed" && row.state === "failed")), [filter, rows]);
  const selectableRows = useMemo(() => filteredRows.filter((row) => row.email && row.state === "uploaded" && row.emailStatus !== "sent"), [filteredRows]);
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.id));
  const previewRow = rows.find((row) => row.id === previewId) ?? null;
  const toggle = (id: string, checked: boolean) => setSelectedIds((current) => { const next = new Set(current); checked ? next.add(id) : next.delete(id); return next; });

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><AdminPageHeader icon={FileCheck2} title="Statement Delivery" /><p className="mt-1 max-w-3xl text-sm text-muted-foreground">September 2026 rehearsal · only non-void statements for Sep 1–30, 2026 are shown. Staff can review, approve, download, or print; sending remains approval-gated.</p></div><Badge variant="outline" className="gap-1 border-violet-300 bg-violet-50 text-violet-800"><ShieldCheck className="h-3.5 w-3.5" /> Approval mode · no automatic sends</Badge></div>
    {missingEmailRows.length > 0 && <Alert className="border-amber-300 bg-amber-50 text-amber-950"><AlertCircle className="h-4 w-4" /><AlertTitle>{missingEmailRows.length} prepared statement{missingEmailRows.length === 1 ? " has" : "s have"} no email address</AlertTitle><AlertDescription className="space-y-2"><p>These customers cannot receive an email until their Innovations-synchronized contact is updated. Their PDFs remain available to preview, download, and print for snail mail.</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className="border-amber-400 bg-white" onClick={() => setFilter("missing_email")}>Show missing emails</Button><Button asChild size="sm" variant="outline" className="border-amber-400 bg-white"><Link to="/admin/crm/contacts">Open Contacts</Link></Button></div></AlertDescription></Alert>}
    <Card className="border-violet-200 bg-violet-50/60"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm text-violet-950"><div className="flex items-center gap-3"><div className="rounded-full bg-white p-2"><Clock3 className="h-5 w-5" /></div><div><strong>{rows.filter((row) => row.state === "uploaded" && row.emailStatus !== "sent").length} statement{rows.filter((row) => row.state === "uploaded" && row.emailStatus !== "sent").length === 1 ? " is" : "s are"} ready for staff approval.</strong><br /><span className="text-violet-800">Missing-email rows are excluded from sending but not from document handling.</span></div></div><Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button></CardContent></Card>
    <Card className="overflow-hidden border-slate-200 shadow-sm"><CardHeader className="gap-3 border-b bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-sm font-semibold tracking-tight">Prepared statements <span className="ml-1 text-xs font-normal text-muted-foreground">({filteredRows.length} shown / {rows.length} total)</span></CardTitle><p className="mt-1 text-xs text-muted-foreground">Select only statements with a valid recipient email to approve as a batch.</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Filter statements" value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setSelectedIds(new Set()); }} className="h-9 rounded-md border border-input bg-background px-3 text-xs"><option value="all">All prepared</option><option value="missing_email">Missing email</option><option value="ready">Ready to approve</option><option value="failed">Failed / retry</option></select><Button size="sm" disabled={selectedIds.size === 0}><Send className="mr-1.5 h-4 w-4" />Approve &amp; queue selected{selectedIds.size ? ` (${selectedIds.size})` : ""}</Button></div></CardHeader><CardContent className="p-0">{isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading all prepared statement jobs…</div> : isError ? <div className="p-8 text-center text-sm text-destructive">Could not load statement delivery: {(error as Error).message}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-xs"><thead className="border-b bg-slate-50 text-left uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-12 px-3 py-2"><Checkbox aria-label="Select all email-eligible statements" checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked === true ? new Set(selectableRows.map((row) => row.id)) : new Set())} /></th><th className="px-3 py-2 font-semibold">Statement</th><th className="px-3 py-2 font-semibold">Customer / recipient</th><th className="px-3 py-2 font-semibold">Period</th><th className="px-3 py-2 font-semibold">Balance</th><th className="px-3 py-2 font-semibold">Lifecycle</th><th className="px-3 py-2 text-right font-semibold">Actions</th></tr></thead><tbody>{filteredRows.map((row) => { const meta = stateMeta(row); const Icon = meta.icon; const canApprove = row.email && row.state === "uploaded" && row.emailStatus !== "sent"; return <tr key={row.id} className="border-b transition-colors hover:bg-slate-50/70 last:border-0"><td className="px-3 py-3">{canApprove && <Checkbox aria-label={`Select ${row.innovationsStatementId}`} checked={selectedIds.has(row.id)} onCheckedChange={(checked) => toggle(row.id, checked === true)} />}</td><td className="px-3 py-3"><div className="font-semibold text-slate-900">Innovations #{row.innovationsStatementId}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{row.pdf}</div></td><td className="px-3 py-3"><div className="font-medium text-slate-800">{row.customer}</div>{row.email ? <div className="mt-0.5 text-[11px] text-muted-foreground">{row.email}</div> : <Badge variant="outline" className="mt-1 gap-1 border-amber-300 bg-amber-50 text-amber-800"><AlertCircle className="h-3 w-3" />Missing email · update Contacts</Badge>}</td><td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.period}</td><td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{money(row.balance)}</td><td className="px-3 py-3"><Badge variant="outline" className={`gap-1 ${meta.className}`}><Icon className="h-3.5 w-3.5" />{meta.label}</Badge>{!row.email && <div className="mt-1 text-[11px] font-medium text-amber-700">Email blocked; print/mail available</div>}{row.error && <div className="mt-1 max-w-[190px] truncate text-[11px] text-red-700" title={row.error}>{row.error}</div>}</td><td className="px-3 py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setPreviewId(row.id)}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</Button>{row.storagePath && <Button size="sm" variant="outline" onClick={() => void supabase.storage.from("statement-pdfs").createSignedUrl(row.storagePath!, 600).then(({ data }) => data?.signedUrl && window.open(data.signedUrl, "_blank", "noopener,noreferrer"))}><Printer className="mr-1.5 h-3.5 w-3.5" />Download / print</Button>}</div></td></tr>})}</tbody></table>{filteredRows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No prepared statements match this filter.</div>}</div>}</CardContent></Card>
    <Dialog open={!!previewRow} onOpenChange={(open) => !open && setPreviewId(null)}><DialogContent className="max-w-3xl bg-slate-100 p-0">{previewRow && <><DialogHeader className="border-b bg-white px-6 py-4"><DialogTitle>PDF preview · Innovations #{previewRow.innovationsStatementId}</DialogTitle><DialogDescription>{previewRow.pdf} · the published statement document for this statement ID</DialogDescription></DialogHeader><div className="p-6"><div className="mx-auto min-h-[620px] max-w-[620px] bg-white p-8 shadow-xl ring-1 ring-slate-200"><div className="flex items-start justify-between border-b-2 border-amber-500 pb-5"><div><div className="text-xl font-extrabold tracking-[0.12em] text-slate-900">CLASSIC VISIONS</div><div className="mt-1 text-[10px] font-bold tracking-[0.28em] text-teal-600">OPTICAL · BARBADOS</div></div><div className="text-right text-4xl font-black tracking-tight text-slate-900/10">STATEMENT</div></div><div className="mt-7 grid grid-cols-2 gap-5"><div className="border-l-4 border-amber-500 bg-slate-50 p-4 text-xs"><div className="font-bold uppercase tracking-wider text-slate-500">Customer</div><div className="mt-2 font-semibold text-slate-900">{previewRow.customer}</div><div className="mt-3 font-bold uppercase tracking-wider text-slate-500">Statement ID</div><div className="mt-1 text-slate-700">Innovations #{previewRow.innovationsStatementId}</div></div><div className="border border-slate-200 p-4 text-xs"><div className="font-bold uppercase tracking-wider text-teal-600">Account summary</div><div className="mt-4 flex justify-between border-b py-2"><span>Period</span><strong>{previewRow.period}</strong></div><div className="flex justify-between bg-slate-900 px-2 py-3 text-white"><span>New balance</span><strong className="text-amber-400">{money(previewRow.balance)}</strong></div></div></div><div className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600">Statement document</div><div className="mt-2 border border-slate-200 p-4 text-xs text-slate-700">This preview is tied to the durable published document job. The stored PDF remains available for print/mail even when email delivery is blocked.</div><div className="mt-8 border-t-2 border-amber-500 bg-amber-50 p-4 text-xs text-slate-700"><div className="font-bold uppercase tracking-[0.2em] text-amber-700">Payment instructions</div><div className="mt-2">Bank of Nova Scotia · Chequing · Account Name: Classic Visions</div><div className="mt-1">Terms: account due within 30 days of statement date.</div></div></div></div></>}</DialogContent></Dialog>
  </div>;
}
