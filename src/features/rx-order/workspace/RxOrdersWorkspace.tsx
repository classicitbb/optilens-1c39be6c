// /admin/orders/rx — the one place staff work Rx orders: what needs a look, what is
// ready to release, what is at the lab, what has gone wrong, what is done. It keeps
// every action of the old Innovations Submissions page (release, retry, resend,
// cancel, refresh lab statuses) and adds captures, filters, a detail drawer and
// bulk release.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Ban, Camera, Pencil, RefreshCw, RotateCcw, Send, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  applyFilters, countByTab, NO_FILTERS, SOURCE_LABELS, statusLabel, TABS, type Filters, type WorkspaceItem, type WorkspaceTab,
} from "./classify";
import { RxOrderDrawer } from "./RxOrderDrawer";
import { useRxWorkspace } from "./useRxWorkspace";

type Provider = "innovations" | "gatekeeper";

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  claimed: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  submitted: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground border-border",
  ready: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300",
  processing: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  queued: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
};

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function RxOrdersWorkspace() {
  const navigate = useNavigate();
  const ws = useRxWorkspace();
  const { approveMutation, resendMutation, cancelMutation, pullStatusesMutation } = ws.outbox;

  const [tab, setTab] = useState<WorkspaceTab>("review");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, Provider>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = useMemo(() => applyFilters(ws.items, filters), [ws.items, filters]);
  const counts = useMemo(() => countByTab(filtered), [filtered]);
  const rows = useMemo(() => filtered.filter((i) => i.tab === tab), [filtered, tab]);
  const open = ws.items.find((i) => i.key === openKey) ?? null;
  const providerOf = (i: WorkspaceItem): Provider => choices[i.key] ?? i.provider ?? "innovations";

  const releasable = rows.filter((i) => i.tab === "ready" && i.submission);
  const picked = releasable.filter((i) => selected.has(i.key));

  const releaseSelected = async () => {
    if (!picked.length || !window.confirm(`Release ${picked.length} order${picked.length === 1 ? "" : "s"} to the lab? Each goes to its chosen sender.`)) return;
    setBulkBusy(true);
    let ok = 0;
    const failed: string[] = [];
    for (const i of picked) {
      try { await approveMutation.mutateAsync({ id: i.submission!.id, provider: providerOf(i) }); ok += 1; }
      catch { failed.push(i.quoteNumber ?? i.key); }
    }
    setBulkBusy(false);
    setSelected(new Set());
    toast(failed.length
      ? { variant: "destructive", title: `Released ${ok}, ${failed.length} failed`, description: failed.join(", ") }
      : { title: `Released ${ok} order${ok === 1 ? "" : "s"}` });
  };

  const actions = (i: WorkspaceItem) => {
    const s = i.submission;
    if (i.kind === "capture") {
      return (
        <Button size="sm" className="h-6 gap-1 px-2 text-[10px]" onClick={() => navigate(`/admin/orders/rx-capture?job=${i.capture!.id}`)}>
          <Camera className="h-3 w-3" /> {i.capture!.status === "failed" ? "Open blank" : "Review"}
        </Button>
      );
    }
    if (!s) return null;
    const provider = providerOf(i);
    return (
      <div className="inline-flex flex-wrap items-center justify-end gap-1">
        {["pending_review", "failed"].includes(s.status) && (
          <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]" onClick={() => navigate(`/admin/orders/rx/${s.quote_id}/edit`)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
        {(s.status === "pending_review" || s.status === "failed") && (
          <>
            <Select value={provider} onValueChange={(v: Provider) => setChoices((c) => ({ ...c, [i.key]: v }))}>
              <SelectTrigger className="h-6 w-[100px] text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="innovations">OptiLens</SelectItem>
                <SelectItem value="gatekeeper">Gatekeeper</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-6 gap-1 px-2 text-[10px]" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate({ id: s.id, provider })}>
              {s.status === "failed" ? <><RotateCcw className="h-3 w-3" /> Retry</> : <><Send className="h-3 w-3" /> Release</>}
            </Button>
          </>
        )}
        {["approved", "claimed"].includes(s.status) && s.dispatch_provider === "gatekeeper" && (
          <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]" disabled={resendMutation.isPending} onClick={() => resendMutation.mutate(s.id)}>
            <RotateCcw className="h-3 w-3" /> {s.transport ? "Resend" : "Send now"}
          </Button>
        )}
        {["pending_review", "approved", "failed"].includes(s.status) && (
          <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[10px] text-muted-foreground" disabled={cancelMutation.isPending}
            onClick={() => { if (window.confirm("Cancel this order? It will not be sent to the lab.")) cancelMutation.mutate(s.id); }}>
            <Ban className="h-3 w-3" /> Cancel
          </Button>
        )}
      </div>
    );
  };

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-base font-semibold"><Send className="h-4 w-4" /> Rx Orders</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={() => navigate("/admin/orders/rx-capture")}>
            <Camera className="h-3 w-3" /> Capture
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={() => navigate("/admin/orders/rx/settings")}>
            <Settings2 className="h-3 w-3" /> Rules
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" disabled={pullStatusesMutation.isPending} onClick={() => pullStatusesMutation.mutate()}>
            <RefreshCw className={cn("h-3 w-3", pullStatusesMutation.isPending && "animate-spin")} /> Refresh lab statuses
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-8 w-52 text-xs" placeholder="Account or quote number…" value={filters.text} onChange={(e) => set({ text: e.target.value })} />
        <Select value={filters.source} onValueChange={(v: Filters["source"]) => set({ source: v })}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any source</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.provider} onValueChange={(v: Filters["provider"]) => set({ provider: v })}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any sender</SelectItem>
            <SelectItem value="innovations">OptiLens / Innovations</SelectItem>
            <SelectItem value="gatekeeper">Gatekeeper</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">From <Input type="date" className="h-8 w-36 text-xs" value={filters.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">To <Input type="date" className="h-8 w-36 text-xs" value={filters.to} onChange={(e) => set({ to: e.target.value })} /></label>
        {(filters !== NO_FILTERS && JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setFilters(NO_FILTERS)}>Clear</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as WorkspaceTab); setSelected(new Set()); }}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs">
              {t.label}
              <Badge variant={t.id === "problems" && counts.problems ? "destructive" : "secondary"} className="px-1.5 py-0 text-[10px]">{counts[t.id]}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "ready" && (
        <div className="flex items-center gap-2 text-xs">
          <Checkbox
            aria-label="Select all"
            checked={releasable.length > 0 && picked.length === releasable.length}
            onCheckedChange={(c) => setSelected(c ? new Set(releasable.map((i) => i.key)) : new Set())}
          />
          <span className="text-muted-foreground">{picked.length} selected</span>
          <Button size="sm" className="h-7 gap-1 px-2 text-[11px]" disabled={!picked.length || bulkBusy} onClick={releaseSelected}>
            <Send className="h-3 w-3" /> Release selected
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr className="text-left text-[10px] font-semibold text-muted-foreground">
              {tab === "ready" && <th className="w-8 px-2 py-1.5" />}
              <th className="px-2 py-1.5">Order</th>
              <th className="px-2 py-1.5">Customer</th>
              <th className="px-2 py-1.5">Source</th>
              <th className="px-2 py-1.5 text-center">Status</th>
              <th className="px-2 py-1.5">Latest</th>
              <th className="px-2 py-1.5 text-right">Created</th>
              <th className="w-[280px]" />
            </tr>
          </thead>
          <tbody>
            {ws.isLoading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!ws.isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nothing in {TABS.find((t) => t.id === tab)?.label.toLowerCase()}.</td></tr>
            )}
            {rows.map((i) => {
              const s = i.submission;
              return (
                <tr key={i.key} className="cursor-pointer border-t border-border align-top hover:bg-muted/30" onClick={() => setOpenKey(i.key)}>
                  {tab === "ready" && (
                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${i.quoteNumber ?? "order"}`}
                        checked={selected.has(i.key)}
                        onCheckedChange={(c) => setSelected((cur) => { const n = new Set(cur); if (c) n.add(i.key); else n.delete(i.key); return n; })}
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5 font-mono">{i.quoteNumber ?? (i.kind === "capture" ? "Capture" : "—")}</td>
                  <td className="px-2 py-1.5 font-medium">{i.accountName}</td>
                  <td className="px-2 py-1.5">{SOURCE_LABELS[i.source]}</td>
                  <td className="px-2 py-1.5 text-center">
                    <Badge variant="outline" className={cn("text-[9px]", STATUS_STYLES[i.status])}>{statusLabel(i.status)}</Badge>
                    {s && <div className="mt-0.5 text-[9px] text-muted-foreground">{s.dispatch_provider === "gatekeeper" ? "Gatekeeper" : "OptiLens / Innovations"}</div>}
                  </td>
                  <td className="max-w-[240px] px-2 py-1.5">
                    {s?.last_error && <div className="truncate text-red-600 dark:text-red-400" title={s.last_error}>{s.last_error}</div>}
                    {s?.lab_status && <div className="text-[10px]"><span className="font-medium">{s.lab_status}</span>{s.lab_status_detail ? ` · ${s.lab_status_detail}` : ""}</div>}
                    {i.capture?.error && <div className="truncate text-red-600 dark:text-red-400" title={i.capture.error}>{i.capture.error}</div>}
                    {!s?.last_error && !s?.lab_status && !i.capture?.error && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right text-muted-foreground">{when(i.createdAt)}</td>
                  <td className="px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>{actions(i)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="max-w-3xl text-[10px] text-muted-foreground">
        Choose OptiLens to use the office sender, or Gatekeeper to send immediately through the enabled Gatekeeper contract. A row left in
        “approved” or “claimed” with no receipt never reached Gatekeeper — use Send now. Lab statuses refresh automatically and can be pulled
        manually at most once every 5 minutes. Orders cannot be edited once released.
      </p>

      <RxOrderDrawer item={open} onClose={() => setOpenKey(null)} actions={open ? actions(open) : null} />
    </div>
  );
}
