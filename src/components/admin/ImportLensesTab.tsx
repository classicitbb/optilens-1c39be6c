import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import { useImportLenses, UnresolvedRef, fetchRefOptions, RefOption } from "@/hooks/useImportLenses";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Play, RotateCcw, FileText, AlertCircle, Plus, Link2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ImportReviewFilters, { type HealthFilter, countByFilter, matchesFilter } from "./ImportReviewFilters";

const statusConfig: Record<string, { label: string; bg: string; fg: string }> = {
  valid:     { label: "New",      bg: "hsl(142 71% 45% / 0.1)", fg: "hsl(142 71% 35%)" },
  duplicate: { label: "Upsert",   bg: "hsl(38 92% 50% / 0.12)", fg: "hsl(38 80% 35%)" },
  error:     { label: "Error",    bg: "hsl(0 84% 60% / 0.1)",   fg: "hsl(0 72% 45%)" },
  imported:  { label: "Imported", bg: "hsl(215 65% 50% / 0.1)", fg: "hsl(215 65% 50%)" },
};

const colLabel: Record<string, string> = {
  supplier: "Supplier", brand: "Brand", material: "Material",
  mftype: "MF Type", lenstype: "Lens Type", option: "Option", finishtype: "Finish Type",
};

const marginBadge = (status: string | null | undefined) => {
  if (!status) return null;
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    healthy:     { label: "Healthy",     bg: "hsl(142 71% 45% / 0.1)", fg: "hsl(142 71% 35%)" },
    thin:        { label: "Thin",        bg: "hsl(38 92% 50% / 0.12)", fg: "hsl(38 80% 35%)" },
    below_floor: { label: "Below Floor", bg: "hsl(0 84% 60% / 0.1)",   fg: "hsl(0 72% 45%)" },
    loss:        { label: "Loss",        bg: "hsl(0 84% 60% / 0.15)",  fg: "hsl(0 72% 40%)" },
  };
  const c = map[status];
  if (!c) return null;
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-0 font-medium" style={{ background: c.bg, color: c.fg }}>{c.label}</Badge>;
};

const fmt = (n: number | null | undefined) => n != null ? n.toFixed(2) : "—";
const fmtPct = (n: number | null | undefined) => n != null ? `${(n * 100).toFixed(1)}%` : "—";

/* ── Resolve panel for a single unresolved ref ── */
const ResolveRow = ({
  uRef, index, onResolve,
}: {
  uRef: UnresolvedRef; index: number;
  onResolve: (idx: number, action: "map" | "create", mappedId?: string) => Promise<void>;
}) => {
  const [options, setOptions] = useState<RefOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => { fetchRefOptions(uRef.table).then(setOptions); }, [uRef.table]);

  const handleMap = async (id: string) => { setLoading(true); await onResolve(index, "map", id); setLoading(false); };
  const handleCreate = async () => { setCreating(true); await onResolve(index, "create"); setCreating(false); };

  if (uRef.resolution !== null) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-3 rounded text-xs" style={{ background: "hsl(142 71% 45% / 0.06)" }}>
        <Badge variant="outline" className="text-[10px] h-5 border-0 font-medium" style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 35%)" }}>
          {uRef.resolution === "create" ? "Created" : "Mapped"}
        </Badge>
        <span style={{ color: "hsl(215 15% 40%)" }}>
          {colLabel[uRef.col] ?? uRef.col}: <strong>"{uRef.originalValue}"</strong>
        </span>
        <span style={{ color: "hsl(215 15% 60%)" }}>({uRef.affectedRows} rows)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded" style={{ background: "hsl(38 92% 50% / 0.06)" }}>
      <Badge variant="outline" className="text-[10px] h-5 border-0 font-medium shrink-0" style={{ background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 80% 35%)" }}>
        Not found
      </Badge>
      <span className="text-xs shrink-0" style={{ color: "hsl(215 15% 40%)" }}>
        {colLabel[uRef.col] ?? uRef.col}: <strong>"{uRef.originalValue}"</strong>
      </span>
      <span className="text-xs shrink-0" style={{ color: "hsl(215 15% 60%)" }}>({uRef.affectedRows} rows)</span>
      <div className="ml-auto flex items-center gap-1.5">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" disabled={loading} className="h-7 text-xs w-[180px] justify-between font-normal">
              <span className="text-muted-foreground">Map to existing…</span>
              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0 z-50" align="start">
            <Command>
              <CommandInput placeholder="Search…" className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty className="py-2 text-xs text-center">No results.</CommandEmpty>
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem key={o.id} value={o.name} onSelect={() => { setPopoverOpen(false); handleMap(o.id); }} className="text-xs">
                      {o.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <span className="text-[10px]" style={{ color: "hsl(215 15% 60%)" }}>or</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={creating} onClick={handleCreate}>
          <Plus className="h-3 w-3" />
          {creating ? "Creating…" : "Create New"}
        </Button>
      </div>
    </div>
  );
};

/* ── Lenses Import Tab ── */
const ImportLensesTab = () => {
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");

  const {
    rows, summary, unresolvedRefs, hasUnresolved,
    isValidating, isImporting,
    fileName, parseAndValidate, resolveRef, executeImport, reset, generateTemplate,
  } = useImportLenses();

  const filterCounts = useMemo(() => countByFilter(rows), [rows]);
  const filteredRows = useMemo(
    () => healthFilter === "all" ? rows : rows.filter((r) => matchesFilter(healthFilter, r.pricing, r.supplierCost)),
    [rows, healthFilter],
  );

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }
    parseAndValidate(file);
  }, [parseAndValidate, toast]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };

  const handleImport = async () => {
    await executeImport();
    toast({ title: "Import complete", description: `${summary.valid + summary.duplicates} rows processed.` });
  };

  const [isPurging, setIsPurging] = useState(false);

  if (!canEdit) {
    return <div className="p-4 text-sm" style={{ color: "hsl(215 15% 50%)" }}>You don't have permission to import data.</div>;
  }

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      await supabase.from("lens_lens_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("pricing_input_rows").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("import_batches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("lenses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      reset();
      toast({ title: "Purged", description: "All lenses and import data cleared." });
    } catch (err: any) {
      toast({ title: "Purge failed", description: err.message, variant: "destructive" });
    } finally {
      setIsPurging(false);
    }
  };

  const hasRows = rows.length > 0;
  const importable = summary.valid + summary.duplicates;
  const allImported = hasRows && summary.imported === rows.length;
  const pendingUnresolved = unresolvedRefs.filter((u) => u.resolution === null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={generateTemplate}>
          <Download className="h-3.5 w-3.5" /> Template
        </Button>
        {hasRows && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="h-7 text-xs gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Purge All Lenses
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Purge all imported lenses?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete ALL lenses, lens options mappings, and import history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurge} disabled={isPurging}>
                {isPurging ? "Purging…" : "Yes, purge everything"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {!hasRows && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors"
          style={{
            borderColor: dragActive ? "hsl(215 65% 50%)" : "hsl(215 15% 80%)",
            background: dragActive ? "hsl(215 65% 50% / 0.04)" : "hsl(215 10% 98%)",
          }}
        >
          <Upload className="h-8 w-8" style={{ color: "hsl(215 15% 60%)" }} />
          <p className="text-sm" style={{ color: "hsl(215 15% 40%)" }}>
            {isValidating ? "Validating…" : "Drop a CSV file here or click to browse"}
          </p>
          <p className="text-xs" style={{ color: "hsl(215 15% 60%)" }}>
            Columns: ShowInPL, FullLab, Supplier, Material, MFType, LensType, Option, FinishType, Brand, USCost, ShowInWSPL
          </p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {unresolvedRefs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" style={{ color: "hsl(38 80% 35%)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Resolve References</h2>
            {pendingUnresolved.length > 0 && (
              <span className="text-xs" style={{ color: "hsl(38 80% 35%)" }}>
                {pendingUnresolved.length} unresolved — map or create to continue
              </span>
            )}
          </div>
          <div className="space-y-1">
            {unresolvedRefs.map((uRef, i) => (
              <ResolveRow key={`${uRef.col}:${uRef.originalValue}`} uRef={uRef} index={i} onResolve={resolveRef} />
            ))}
          </div>
        </div>
      )}

      {hasRows && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "hsl(215 10% 96%)" }}>
          <FileText className="h-4 w-4 shrink-0" style={{ color: "hsl(215 15% 50%)" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(215 30% 15%)" }}>{fileName}</span>
          <span className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>—</span>
          <span className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{summary.total} rows</span>
          {summary.valid > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.valid.bg, color: statusConfig.valid.fg }}>{summary.valid} new</Badge>}
          {summary.duplicates > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.duplicate.bg, color: statusConfig.duplicate.fg }}>{summary.duplicates} upsert</Badge>}
          {summary.errors > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.error.bg, color: statusConfig.error.fg }}>{summary.errors} errors</Badge>}
          {summary.imported > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.imported.bg, color: statusConfig.imported.fg }}>{summary.imported} imported</Badge>}
          <div className="ml-auto">
            {!allImported && importable > 0 && !hasUnresolved && (
              <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} disabled={isImporting} onClick={handleImport}>
                <Play className="h-3.5 w-3.5" />
                {isImporting ? "Importing…" : `Import ${importable} rows`}
              </Button>
            )}
          </div>
        </div>
      )}

      {hasRows && rows.some((r) => r.pricing) && (
        <ImportReviewFilters active={healthFilter} onChange={setHealthFilter} counts={filterCounts} />
      )}

      {hasRows && (
        <div className="border rounded overflow-auto" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)", maxHeight: "calc(100vh - 420px)" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(0 0% 100%)", boxShadow: "inset 0 -1px 0 hsl(215 15% 85%)" }}>
              <TableRow>
                <TableHead className="w-12 text-xs">#</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Gen. Name</TableHead>
                <TableHead className="text-xs">Supplier</TableHead>
                <TableHead className="text-xs">Cost (USD)</TableHead>
                <TableHead className="text-xs">Full Cost (BBD)</TableHead>
                <TableHead className="text-xs">Strategic (BBD)</TableHead>
                <TableHead className="text-xs">Margin</TableHead>
                <TableHead className="text-xs">Health</TableHead>
                <TableHead className="text-xs">PL</TableHead>
                <TableHead className="text-xs">Lab</TableHead>
                <TableHead className="text-xs">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const cfg = statusConfig[row.status] ?? statusConfig.error;
                const p = row.pricing;
                return (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{row.rowNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-0 font-medium" style={{ background: cfg.bg, color: cfg.fg }}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{row.generatedName || "—"}</TableCell>
                    <TableCell className="text-xs">{row.raw.supplier ?? row.raw.Supplier ?? ""}</TableCell>
                    <TableCell className="text-xs font-mono">{fmt(row.supplierCost)}</TableCell>
                    <TableCell className="text-xs font-mono">{fmt(p?.full_cost)}</TableCell>
                    <TableCell className="text-xs font-mono">{fmt(p?.strategic_price)}</TableCell>
                    <TableCell className="text-xs font-mono">{fmtPct(p?.margin)}</TableCell>
                    <TableCell>{marginBadge(p?.margin_status)}</TableCell>
                    <TableCell className="text-xs">{row.raw.showinpl ?? row.raw.ShowInPL ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.fulllab ?? row.raw.FullLab ?? ""}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 && (
                        <div className="flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "hsl(0 72% 45%)" }} />
                          <span className="text-[10px] leading-tight" style={{ color: "hsl(0 72% 45%)" }}>{row.errors.join("; ")}</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ImportLensesTab;
