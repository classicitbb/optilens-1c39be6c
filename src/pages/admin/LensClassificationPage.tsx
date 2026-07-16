import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, RefreshCw, Loader2, AlertTriangle, Ban, RotateCcw, Power } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  classifyLensRows,
  fetchAllLensRowsForReview,
  bulkSetAnchorExclusion,
  type ClassifiedLensRow,
  type ClassificationStatus,
} from "@/lib/pricing/combos";

// BS1-05: makes classification gaps self-service instead of a round-trip
// through a live-data dump (which is how the Trans Gen S bug was actually
// found — this page exists so that never has to happen again). Also the
// audit/bulk-exclude surface for lenses.excluded_from_anchor (BS1-02): see
// which lenses are permanently excluded and why, and kick out a whole
// supplier or brand at once instead of one row at a time. This flag is
// GLOBAL and PERSISTENT — for a per-pricelist sourcing policy (e.g. "keep
// Essilor out of the main book but Essilor-only for one customer"), use
// Auto Price's supplier scope control instead; that's per-run, not this.
//
// Every stat card is clickable (operator requirement, 2026-07-16: "we dont
// want to be lost or out of control") — it drills into the actual rows
// behind the number, with whatever action makes sense for that status:
// inactive rows can be reactivated, non-excluded rows can be excluded,
// excluded rows can be restored. classified/unapproved/invalid_cost/
// quote_only/unmapped_material are view-only beyond that (fixing them means
// editing the lens record or TIER_MAP, not something to guess at here).

const STATUS_LABEL: Record<ClassificationStatus, string> = {
  classified: "Classified",
  unapproved_supplier: "Unapproved supplier",
  inactive: "Inactive",
  excluded_from_anchor: "Excluded from anchor",
  invalid_cost: "Invalid cost",
  quote_only: "Quote-only (intentional)",
  unmapped_tier: "Unmapped design (TIER_MAP gap)",
  unmapped_material: "Unmapped material",
};

type StatusFilter = ClassificationStatus | "all";

interface DesignGap {
  mftype: string;
  lenstype: string;
  count: number;
  suppliers: Set<string>;
  sampleNames: string[];
}

const StatCard = ({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "text-left rounded-xl border p-3 transition-colors bg-card",
      active ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:bg-muted/40"
    )}
  >
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={tone === "warning" && value > 0 ? "text-lg font-semibold text-amber-600" : "text-lg font-semibold text-foreground"}>
      {value.toLocaleString()}
    </div>
  </button>
);

const LensClassificationPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gapSearch, setGapSearch] = useState("");

  const { data: results = [], isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<ClassifiedLensRow[]>({
    queryKey: ["lens-classification-review"],
    queryFn: async () => classifyLensRows(await fetchAllLensRowsForReview()),
    staleTime: 5 * 60 * 1000,
  });

  const counts = useMemo(() => {
    const base: Record<ClassificationStatus, number> = {
      classified: 0,
      unapproved_supplier: 0,
      inactive: 0,
      excluded_from_anchor: 0,
      invalid_cost: 0,
      quote_only: 0,
      unmapped_tier: 0,
      unmapped_material: 0,
    };
    for (const r of results) base[r.status]++;
    return base;
  }, [results]);

  const designGaps = useMemo(() => {
    const map = new Map<string, DesignGap>();
    for (const r of results) {
      if (r.status !== "unmapped_tier") continue;
      const mftype = r.row.mftype ?? "(none)";
      const lenstype = r.row.lenstype ?? "(none)";
      const key = `${mftype}|${lenstype}`;
      const entry = map.get(key) ?? { mftype, lenstype, count: 0, suppliers: new Set<string>(), sampleNames: [] };
      entry.count++;
      if (r.row.supplier) entry.suppliers.add(r.row.supplier);
      if (entry.sampleNames.length < 3) entry.sampleNames.push(r.row.name);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [results]);

  const filteredDesignGaps = useMemo(() => {
    if (!gapSearch.trim()) return designGaps;
    const q = gapSearch.toLowerCase();
    return designGaps.filter(
      (g) => g.mftype.toLowerCase().includes(q) || g.lenstype.toLowerCase().includes(q) || g.sampleNames.some((n) => n.toLowerCase().includes(q))
    );
  }, [designGaps, gapSearch]);

  // ── Drill-down: click any stat card to see its rows ─────────────────────
  const [activeStatus, setActiveStatus] = useState<StatusFilter | null>(null);
  const [rowSearch, setRowSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowActionBusy, setRowActionBusy] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
    setRowSearch("");
  }, [activeStatus]);

  const ROW_LIMIT = 400;
  const activeRows = useMemo(() => {
    if (!activeStatus) return [];
    const base = activeStatus === "all" ? results : results.filter((r) => r.status === activeStatus);
    if (!rowSearch.trim()) return base;
    const q = rowSearch.toLowerCase();
    return base.filter(
      (r) => r.row.name.toLowerCase().includes(q) || r.row.supplier?.toLowerCase().includes(q) || r.row.brand?.toLowerCase().includes(q)
    );
  }, [results, activeStatus, rowSearch]);

  const toggleSelect = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleSelectAllVisible = (checked: boolean) =>
    setSelectedIds(checked ? new Set(activeRows.slice(0, ROW_LIMIT).map((r) => r.row.id)) : new Set());

  const restoreSelected = async () => {
    if (!selectedIds.size) return;
    setRowActionBusy(true);
    try {
      const count = await bulkSetAnchorExclusion([...selectedIds], false);
      toast({ title: "Restored", description: `${count} lens(es) can count toward anchor pricing again.` });
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["lens-classification-review"] });
    } catch (error: any) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
    } finally {
      setRowActionBusy(false);
    }
  };

  const excludeSelected = async () => {
    if (!selectedIds.size) return;
    setRowActionBusy(true);
    try {
      const count = await bulkSetAnchorExclusion([...selectedIds], true, `Excluded from Lens Classification (${activeStatus} view)`);
      toast({ title: "Excluded", description: `${count} lens(es) no longer count toward anchor pricing anywhere.` });
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["lens-classification-review"] });
    } catch (error: any) {
      toast({ title: "Exclude failed", description: error.message, variant: "destructive" });
    } finally {
      setRowActionBusy(false);
    }
  };

  const reactivateSelected = async () => {
    if (!selectedIds.size) return;
    setRowActionBusy(true);
    try {
      const { error } = await (supabase.from("lenses") as any).update({ is_active: true }).in("id", [...selectedIds]);
      if (error) throw error;
      toast({ title: "Reactivated", description: `${selectedIds.size} lens(es) are active again.` });
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["lens-classification-review"] });
    } catch (error: any) {
      toast({ title: "Reactivate failed", description: error.message, variant: "destructive" });
    } finally {
      setRowActionBusy(false);
    }
  };

  // ── Bulk exclude by supplier or brand (independent of the drill-down) ───
  const [bulkDimension, setBulkDimension] = useState<"supplier" | "brand">("supplier");
  const [bulkValue, setBulkValue] = useState<string>("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const bulkOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      if (r.status === "excluded_from_anchor") continue;
      const value = bulkDimension === "supplier" ? r.row.supplier : r.row.brand;
      if (value) set.add(value);
    }
    return [...set].sort();
  }, [results, bulkDimension]);

  const bulkMatchingIds = useMemo(() => {
    if (!bulkValue) return [];
    return results
      .filter((r) => r.status !== "excluded_from_anchor" && (bulkDimension === "supplier" ? r.row.supplier : r.row.brand) === bulkValue)
      .map((r) => r.row.id);
  }, [results, bulkDimension, bulkValue]);

  const runBulkExclude = async () => {
    if (!bulkMatchingIds.length) return;
    setBulkBusy(true);
    try {
      const count = await bulkSetAnchorExclusion(bulkMatchingIds, true, bulkReason || `Bulk excluded by ${bulkDimension}: ${bulkValue}`);
      toast({ title: "Excluded", description: `${count} lens(es) from ${bulkValue} no longer count toward anchor pricing anywhere.` });
      setBulkValue("");
      setBulkReason("");
      await queryClient.invalidateQueries({ queryKey: ["lens-classification-review"] });
    } catch (error: any) {
      toast({ title: "Bulk exclude failed", description: error.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const visibleRows = activeRows.slice(0, ROW_LIMIT);
  const showExcludeAction = activeStatus && activeStatus !== "excluded_from_anchor" && activeStatus !== "inactive";
  const showRestoreAction = activeStatus === "excluded_from_anchor";
  const showReactivateAction = activeStatus === "inactive";

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden p-4">
      <AdminPageHeader icon={ListChecks} title="Lens Classification">
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <p className="text-xs text-muted-foreground -mt-2">
        Shows exactly what Auto Price sees. Click any number below to see the rows behind it. Fixing an "unmapped design" gap
        means adding an entry to <code className="text-[10px]">TIER_MAP</code> in <code className="text-[10px]">src/lib/pricing/classifier.ts</code> — that's
        code, not something this page writes. Excluding/restoring/reactivating below <em>are</em> real writes — exclusion is
        permanent and catalog-wide; for a per-pricelist sourcing policy instead (e.g. an Essilor-only book for one customer),
        use Auto Price's supplier scope control in the matrix editor, not this.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 shrink-0">
            <StatCard label="Total rows" value={results.length} active={activeStatus === "all"} onClick={() => setActiveStatus("all")} />
            <StatCard label="Classified" value={counts.classified} active={activeStatus === "classified"} onClick={() => setActiveStatus("classified")} />
            <StatCard
              label="Unmapped design"
              value={counts.unmapped_tier}
              tone="warning"
              active={activeStatus === "unmapped_tier"}
              onClick={() => setActiveStatus("unmapped_tier")}
            />
            <StatCard
              label="Unmapped material"
              value={counts.unmapped_material}
              tone="warning"
              active={activeStatus === "unmapped_material"}
              onClick={() => setActiveStatus("unmapped_material")}
            />
            <StatCard label="Quote-only" value={counts.quote_only} active={activeStatus === "quote_only"} onClick={() => setActiveStatus("quote_only")} />
            <StatCard
              label="Unapproved supplier"
              value={counts.unapproved_supplier}
              active={activeStatus === "unapproved_supplier"}
              onClick={() => setActiveStatus("unapproved_supplier")}
            />
            <StatCard label="Inactive" value={counts.inactive} active={activeStatus === "inactive"} onClick={() => setActiveStatus("inactive")} />
            <StatCard
              label="Excluded from anchor"
              value={counts.excluded_from_anchor}
              active={activeStatus === "excluded_from_anchor"}
              onClick={() => setActiveStatus("excluded_from_anchor")}
            />
          </div>

          {activeStatus === "unmapped_tier" ? (
            <Card className="p-0 overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <h2 className="text-xs font-semibold text-foreground">
                    Unmapped designs — every lens with this MF Type / Lens Type combination is invisible to Auto Price
                  </h2>
                </div>
                <Input value={gapSearch} onChange={(e) => setGapSearch(e.target.value)} placeholder="Filter…" className="h-7 text-xs w-48" />
              </div>
              {filteredDesignGaps.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {designGaps.length === 0 ? "No unmapped designs — every active, approved lens classifies." : "No matches."}
                </p>
              ) : (
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-background border-b border-border">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">MF Type</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Lens Type</th>
                        <th className="px-3 py-1.5 text-right font-semibold text-foreground">Rows</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Suppliers</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Sample names</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDesignGaps.map((gap) => (
                        <tr key={`${gap.mftype}|${gap.lenstype}`} className="border-b border-border/60 hover:bg-muted/30">
                          <td className="px-3 py-1.5 whitespace-nowrap">{gap.mftype}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap font-medium text-foreground">{gap.lenstype}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{gap.count}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{[...gap.suppliers].join(", ")}</td>
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[280px]" title={gap.sampleNames.join(" · ")}>
                            {gap.sampleNames.join(" · ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : activeStatus ? (
            <Card className="p-0 overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-xs font-semibold text-foreground">
                  {activeStatus === "all" ? "All rows" : STATUS_LABEL[activeStatus]} ({activeRows.length})
                  {activeRows.length > ROW_LIMIT && (
                    <span className="text-muted-foreground font-normal"> — showing first {ROW_LIMIT}, search to narrow down</span>
                  )}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder="Search name/supplier/brand…" className="h-7 text-xs w-56" />
                  {showRestoreAction && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={!selectedIds.size || rowActionBusy} onClick={restoreSelected}>
                      {rowActionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Restore selected ({selectedIds.size})
                    </Button>
                  )}
                  {showReactivateAction && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={!selectedIds.size || rowActionBusy} onClick={reactivateSelected}>
                      {rowActionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                      Reactivate selected ({selectedIds.size})
                    </Button>
                  )}
                  {showExcludeAction && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs gap-1"
                      disabled={!selectedIds.size || rowActionBusy}
                      onClick={excludeSelected}
                    >
                      {rowActionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                      Exclude selected ({selectedIds.size})
                    </Button>
                  )}
                </div>
              </div>
              {visibleRows.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No rows.</p>
              ) : (
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-background border-b border-border">
                      <tr>
                        <th className="px-3 py-1.5 w-8">
                          <Checkbox
                            checked={selectedIds.size > 0 && selectedIds.size === visibleRows.length}
                            onCheckedChange={(checked) => toggleSelectAllVisible(!!checked)}
                          />
                        </th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Name</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Supplier</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Brand</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">MF / Lens Type</th>
                        {activeStatus === "classified" && <th className="px-3 py-1.5 text-left font-semibold text-foreground">Combo</th>}
                        {activeStatus === "invalid_cost" && <th className="px-3 py-1.5 text-right font-semibold text-foreground">Cost</th>}
                        {activeStatus === "excluded_from_anchor" && (
                          <>
                            <th className="px-3 py-1.5 text-left font-semibold text-foreground">Reason</th>
                            <th className="px-3 py-1.5 text-left font-semibold text-foreground">Excluded</th>
                          </>
                        )}
                        {activeStatus === "all" && <th className="px-3 py-1.5 text-left font-semibold text-foreground">Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r) => (
                        <tr key={r.row.id} className="border-b border-border/60 hover:bg-muted/30">
                          <td className="px-3 py-1.5">
                            <Checkbox checked={selectedIds.has(r.row.id)} onCheckedChange={(checked) => toggleSelect(r.row.id, !!checked)} />
                          </td>
                          <td className="px-3 py-1.5">{r.row.name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.row.supplier}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.row.brand}</td>
                          <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                            {r.row.mftype} / {r.row.lenstype}
                          </td>
                          {activeStatus === "classified" && (
                            <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[240px]" title={r.comboKey ?? undefined}>
                              {r.comboKey}
                            </td>
                          )}
                          {activeStatus === "invalid_cost" && <td className="px-3 py-1.5 text-right font-mono">{r.row.cost ?? "—"}</td>}
                          {activeStatus === "excluded_from_anchor" && (
                            <>
                              <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[240px]" title={r.row.excludedReason ?? undefined}>
                                {r.row.excludedReason ?? "—"}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                                {r.row.excludedAt ? new Date(r.row.excludedAt).toLocaleDateString() : "—"}
                              </td>
                            </>
                          )}
                          {activeStatus === "all" && <td className="px-3 py-1.5 text-muted-foreground">{STATUS_LABEL[r.status]}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6 text-center text-xs text-muted-foreground shrink-0">Click a number above to see the rows behind it.</Card>
          )}

          <Card className="p-3 shrink-0 space-y-2">
            <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5 text-destructive" />
              Bulk exclude from anchor pricing, by supplier or brand
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Permanent and catalog-wide — every future Auto Price run, in every pricelist, stops considering these lenses. Use
              this for genuinely bad data or a supplier you never want to use, not for a book-specific sourcing choice.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={bulkDimension} onValueChange={(v) => { setBulkDimension(v as typeof bulkDimension); setBulkValue(""); }}>
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger className="h-7 text-xs w-56">
                  <SelectValue placeholder={`Pick a ${bulkDimension}…`} />
                </SelectTrigger>
                <SelectContent>
                  {bulkOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} placeholder="Reason (optional)" className="h-7 text-xs w-56" />
              <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={!bulkValue || !bulkMatchingIds.length || bulkBusy} onClick={runBulkExclude}>
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Exclude {bulkMatchingIds.length || ""} lens{bulkMatchingIds.length === 1 ? "" : "es"}
              </Button>
            </div>
          </Card>

          <p className="text-[10px] text-muted-foreground shrink-0">
            Last checked {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : "—"}. {STATUS_LABEL.classified} lenses feed
            Auto Price directly; everything else here is exactly what Auto Price's plan silently skips today.
          </p>
        </div>
      )}
    </div>
  );
};

export default LensClassificationPage;
