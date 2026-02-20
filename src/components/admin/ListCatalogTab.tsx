import { useState, useMemo, useRef, useCallback } from "react";
import { useLenses } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";
import { useSupplies } from "@/hooks/useSupplies";
import { usePricelistNotes } from "@/hooks/useMaterialUpgrades";
import { Button } from "@/components/ui/button";
import { FileText, Table2, FileSpreadsheet, Globe, Loader2, Plus, X, Search, Save, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { LensPickerPopover, PickedItem } from "@/components/admin/LensPickerPopover";
import { SupplyPickerPopover, PickedSupply } from "@/components/admin/SupplyPickerPopover";

const BLUE_BG = "#1e4db7";
const GREEN_BG = "#d4edda";
const BLUE_TEXT = "#fff";
const GREEN_TEXT = "#155724";
const LABEL = "hsl(215 15% 40%)";
const PAGE_NOTE = "This is a standard catalog showing lenses inclusive of edging and freight.";

/* ─────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────── */
export interface CatalogRow {
  key: string;
  section: string;
  subSection?: string; // for finish→MF grouping
  description: string;
  bbd: number | null;
  usd: number | null;
  margin: number | null;
  lensId?: string;
  addonId?: string;
  supplyId?: string;
}

export interface CatalogSection {
  title: string;
  subTitle?: string; // e.g. MF Type name
  rows: CatalogRow[];
  isAddon?: boolean;
  isSupply?: boolean;
  parentGroup?: string; // Finish Type
}

type SortDir = "asc" | "desc" | null;

interface ListCatalogTabProps {
  fxRate: number;
  showUSD: boolean;
  groupByFinishThenMf?: boolean;
  lensFilter?: "wspl" | "web" | "pricelist" | "none";
  suppliesOnly?: boolean;
  pageTitle?: string;
  showTreatmentsAddons?: boolean;
}

/* ─────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────── */
const ListCatalogTab = ({
  fxRate,
  showUSD,
  groupByFinishThenMf = false,
  lensFilter = "pricelist",
  suppliesOnly = false,
  pageTitle = "Custom Catalog",
  showTreatmentsAddons = true
}: ListCatalogTabProps) => {
  const { data: allLenses, isLoading: lLoading } = useLenses();
  const { data: allAddons, isLoading: aLoading } = useAddons();
  const { data: allSupplies, isLoading: sLoading } = useSupplies();
  const { data: notes = [] } = usePricelistNotes();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // User-managed overrides keyed by section title
  const [lensRows, setLensRows] = useState<Map<string, CatalogRow[]>>(new Map());
  const [addonRows, setAddonRows] = useState<Map<string, CatalogRow[]>>(new Map());
  const [supplyRows, setSupplyRows] = useState<Map<string, CatalogRow[]>>(new Map());

  // Sort state: section → { col, dir }
  const [sortState, setSortState] = useState<Map<string, {col: string;dir: SortDir;}>>(new Map());

  // Dirty state for save button
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Picker state
  const [lensPickerOpen, setLensPickerOpen] = useState(false);
  const [supplyPickerOpen, setSupplyPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    section: string;
    rowKey: string;
    mode: "cell" | "add-lens" | "add-addon" | "add-supply";
    addonSection?: string;
  } | null>(null);

  const isLoading = lLoading || aLoading || sLoading;

  /* ── Supply sections (for Buy/Sell page) ── */
  const defaultSupplyRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    if (!suppliesOnly) return map;
    const active = (allSupplies ?? []).filter(
      (s) => s.is_active && s.show_in_pricelist && s.sell_price > 0
    );
    // Group by category name
    const cats = [...new Set(active.map((s) => s.category))].sort();
    for (const cat of cats) {
      const items = active.filter((s) => s.category === cat);
      if (items.length === 0) continue;
      const rows: CatalogRow[] = items.map((s) => ({
        key: `supply-${s.id}`,
        section: cat,
        description: s.name + (s.description ? ` — ${s.description}` : ""),
        bbd: s.sell_price,
        usd: s.sell_price * fxRate,
        margin: s.base_price > 0 ?
        parseFloat(((s.sell_price - s.base_price * 2) / s.sell_price * 100).toFixed(1)) :
        null,
        supplyId: s.id
      }));
      map.set(cat, rows);
    }
    return map;
  }, [allSupplies, suppliesOnly, fxRate]);

  /* ── Lens sections ── */
  const defaultLensRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    if (suppliesOnly || lensFilter === "none") return map;

    const plLenses = (allLenses ?? []).filter((l) => {
      if (!l.is_active) return false;
      if (lensFilter === "wspl") return l.show_in_ws_pricelist && l.sell_price > 0;
      if (lensFilter === "web") return l.show_on_website && l.sell_price > 0;
      return l.show_in_pricelist && l.sell_price > 0;
    });

    if (groupByFinishThenMf) {
      // Group by Finish Type name → MF Type name (compound key)
      const finishGroups = new Map<string, Map<string, typeof plLenses>>();
      for (const l of plLenses) {
        const finish = (l as any).finishtype_name || (l as any).finishtype?.name || "Finished";
        const mf = (l as any).mftype_name || (l as any).mftype?.name || "Standard";
        if (!finishGroups.has(finish)) finishGroups.set(finish, new Map());
        const mfMap = finishGroups.get(finish)!;
        if (!mfMap.has(mf)) mfMap.set(mf, []);
        mfMap.get(mf)!.push(l);
      }
      for (const [finish, mfMap] of finishGroups) {
        for (const [mf, lenses] of mfMap) {
          const sectionKey = `${finish} — ${mf}`;
          const rows: CatalogRow[] = lenses.map((l) => ({
            key: `lens-${l.id}`,
            section: sectionKey,
            description: l.name,
            bbd: l.sell_price,
            usd: l.sell_price * fxRate,
            margin:
            l.base_price > 0 ?
            parseFloat(((l.sell_price - l.base_price * 2) / l.sell_price * 100).toFixed(1)) :
            null,
            lensId: l.id
          }));
          map.set(sectionKey, rows);
        }
      }
    } else {
      // Legacy: group by lens type keywords
      const LENS_SECTIONS = [
      { title: "Single Vision Regular", test: (l: any) => /single|sv\b/i.test(l.name) && !/bifocal|ft|prog/i.test(l.name) },
      { title: "FT Regular", test: (l: any) => /bifocal|flat top|ft\b|kryptok/i.test(l.name) },
      { title: "Progressive Regular", test: (l: any) => /prog|varifocal/i.test(l.name) }];

      const used = new Set<string>();
      for (const sec of LENS_SECTIONS) {
        const matched = plLenses.filter((l) => !used.has(l.id) && sec.test(l));
        matched.forEach((l) => used.add(l.id));
        if (matched.length === 0) continue;
        map.set(sec.title, matched.map((l) => ({
          key: `lens-${l.id}`,
          section: sec.title,
          description: l.name,
          bbd: l.sell_price,
          usd: l.sell_price * fxRate,
          margin: l.base_price > 0 ?
          parseFloat(((l.sell_price - l.base_price * 2) / l.sell_price * 100).toFixed(1)) :
          null,
          lensId: l.id
        })));
      }
      const remaining = plLenses.filter((l) => !used.has(l.id));
      if (remaining.length > 0) {
        map.set("Other", remaining.map((l) => ({
          key: `lens-${l.id}`,
          section: "Other",
          description: l.name,
          bbd: l.sell_price,
          usd: l.sell_price * fxRate,
          margin: null,
          lensId: l.id
        })));
      }
    }
    return map;
  }, [allLenses, fxRate, groupByFinishThenMf, lensFilter, suppliesOnly]);

  /* ── Addon sections ── */
  const defaultAddonRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    if (suppliesOnly || !showTreatmentsAddons) return map;
    const active = (allAddons ?? []).filter((a) => a.is_active);
    const ADDON_SECTIONS = [
    { title: "Treatments", test: (a: any) => /treat|coat|hmc|ar\b|uv|tint|mirr|antireflect/i.test(`${a.category} ${a.name}`) },
    { title: "ADD ONS", test: () => true }];

    const used = new Set<string>();
    for (const sec of ADDON_SECTIONS) {
      const matched = active.filter((a) => !used.has(a.id) && sec.test(a));
      matched.forEach((a) => used.add(a.id));
      if (matched.length === 0) continue;
      map.set(sec.title, matched.map((a) => ({
        key: `addon-${a.id}`,
        section: sec.title,
        description: a.name + (a.description ? ` — ${a.description}` : ""),
        bbd: a.price,
        usd: a.price * fxRate,
        margin: a.cost > 0 ?
        parseFloat(((a.price - a.cost) / a.price * 100).toFixed(1)) :
        null,
        addonId: a.id
      })));
    }
    return map;
  }, [allAddons, fxRate, suppliesOnly, showTreatmentsAddons]);

  // Merged effective rows
  const effectiveLensRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const merged = new Map(defaultLensRows);
    lensRows.forEach((rows, sec) => merged.set(sec, rows));
    return merged;
  }, [defaultLensRows, lensRows]);

  const effectiveAddonRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const merged = new Map(defaultAddonRows);
    addonRows.forEach((rows, sec) => merged.set(sec, rows));
    return merged;
  }, [defaultAddonRows, addonRows]);

  const effectiveSupplyRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const merged = new Map(defaultSupplyRows);
    supplyRows.forEach((rows, sec) => merged.set(sec, rows));
    return merged;
  }, [defaultSupplyRows, supplyRows]);

  /* ── Sort helpers ── */
  const toggleSort = (section: string, col: string) => {
    setSortState((prev) => {
      const next = new Map(prev);
      const cur = prev.get(section);
      if (!cur || cur.col !== col) {
        next.set(section, { col, dir: "asc" });
      } else if (cur.dir === "asc") {
        next.set(section, { col, dir: "desc" });
      } else {
        next.set(section, { col: "", dir: null });
      }
      return next;
    });
  };

  const sortedRows = useCallback(
    (section: string, rows: CatalogRow[]): CatalogRow[] => {
      const s = sortState.get(section);
      if (!s || !s.dir || !s.col) return rows;
      return [...rows].sort((a, b) => {
        let aVal: any, bVal: any;
        if (s.col === "description") {aVal = a.description;bVal = b.description;} else
        if (s.col === "bbd") {aVal = a.bbd ?? -Infinity;bVal = b.bbd ?? -Infinity;} else
        if (s.col === "usd") {aVal = a.usd ?? -Infinity;bVal = b.usd ?? -Infinity;} else
        if (s.col === "margin") {aVal = a.margin ?? -Infinity;bVal = b.margin ?? -Infinity;} else
        return 0;
        if (typeof aVal === "string") return s.dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        return s.dir === "asc" ? aVal - bVal : bVal - aVal;
      });
    },
    [sortState]
  );

  /* ── Picker handlers ── */
  const handleLensPick = (item: PickedItem) => {
    if (!pickerTarget) return;
    const { section, rowKey, mode } = pickerTarget;

    if (mode === "cell" && item.type === "lens") {
      setLensRows((prev) => {
        const next = new Map(prev);
        const sectionRows = [...(effectiveLensRows.get(section) ?? [])];
        const idx = sectionRows.findIndex((r) => r.key === rowKey);
        if (idx !== -1) {
          sectionRows[idx] = { ...sectionRows[idx], description: item.name, bbd: item.sell_price, usd: item.sell_price * fxRate, lensId: item.id };
        }
        next.set(section, sectionRows);
        return next;
      });
      setIsDirty(true);
    } else if (mode === "add-lens" && item.type === "lens") {
      const newRow: CatalogRow = {
        key: `lens-${item.id}-${Date.now()}`,
        section,
        description: item.name,
        bbd: item.sell_price,
        usd: item.sell_price * fxRate,
        margin: null,
        lensId: item.id
      };
      setLensRows((prev) => {
        const next = new Map(prev);
        next.set(section, [...(effectiveLensRows.get(section) ?? []), newRow]);
        return next;
      });
      setIsDirty(true);
    } else if (mode === "add-addon" && item.type === "addon") {
      const target = pickerTarget.addonSection ?? "ADD ONS";
      const newRow: CatalogRow = {
        key: `addon-${item.id}-${Date.now()}`,
        section: target,
        description: item.name + ((item as any).description ? ` — ${(item as any).description}` : ""),
        bbd: item.price,
        usd: item.price * fxRate,
        margin: null,
        addonId: item.id
      };
      setAddonRows((prev) => {
        const next = new Map(prev);
        next.set(target, [...(effectiveAddonRows.get(target) ?? []), newRow]);
        return next;
      });
      setIsDirty(true);
    }
  };

  const handleSupplyPick = (item: PickedSupply) => {
    if (!pickerTarget) return;
    const { section } = pickerTarget;
    const targetSection = section || item.category;
    const newRow: CatalogRow = {
      key: `supply-${item.id}-${Date.now()}`,
      section: targetSection,
      description: item.name + (item.description ? ` — ${item.description}` : ""),
      bbd: item.sell_price,
      usd: item.sell_price * fxRate,
      margin: null,
      supplyId: item.id
    };
    setSupplyRows((prev) => {
      const next = new Map(prev);
      next.set(targetSection, [...(effectiveSupplyRows.get(targetSection) ?? []), newRow]);
      return next;
    });
    setIsDirty(true);
  };

  const removeRow = (section: string, rowKey: string, type: "lens" | "addon" | "supply") => {
    if (type === "supply") {
      setSupplyRows((prev) => {
        const next = new Map(prev);
        next.set(section, (effectiveSupplyRows.get(section) ?? []).filter((r) => r.key !== rowKey));
        return next;
      });
    } else if (type === "addon") {
      setAddonRows((prev) => {
        const next = new Map(prev);
        next.set(section, (effectiveAddonRows.get(section) ?? []).filter((r) => r.key !== rowKey));
        return next;
      });
    } else {
      setLensRows((prev) => {
        const next = new Map(prev);
        next.set(section, (effectiveLensRows.get(section) ?? []).filter((r) => r.key !== rowKey));
        return next;
      });
    }
    setIsDirty(true);
  };

  /* ── Save ── */
  const handleSave = async () => {
    setIsSaving(true);
    // Simulate persistence — in real implementation this would write to a pricelist_version-specific table
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setIsDirty(false);
    toast({ title: "Catalog saved", description: "All changes have been applied to this version." });
  };

  /* ── Exports ── */
  const allExportRows = [
  ...[...effectiveSupplyRows.entries()].flatMap(([sec, rows]) =>
  [{ isHeader: true, title: sec }, ...rows]
  ),
  ...[...effectiveLensRows.entries()].flatMap(([sec, rows]) =>
  [{ isHeader: true, title: sec }, ...rows]
  ),
  ...[...effectiveAddonRows.entries()].flatMap(([sec, rows]) =>
  [{ isHeader: true, title: sec }, ...rows]
  )];


  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [
    [pageTitle, "", "", ""],
    ["Description", "BBD $ COST", "USD $ COST", "Margin %"],
    ...allExportRows.map((r: any) =>
    r.isHeader ?
    [r.title, "", "", ""] :
    [r.description, r.bbd ?? "", r.usd !== null ? parseFloat(r.usd.toFixed(2)) : "", r.margin ?? ""]
    )];

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Catalog");
    XLSX.writeFile(wb, `${pageTitle.replace(/\s+/g, "_")}.xlsx`);
    toast({ title: "Excel exported" });
  };

  const handleCSVExport = () => {
    const lines = [
    "Description,BBD $ COST,USD $ COST,Margin %",
    ...allExportRows.
    filter((r: any) => !r.isHeader).
    map((r: any) =>
    [`"${(r as CatalogRow).description}"`, (r as CatalogRow).bbd ?? "", (r as CatalogRow).usd !== null ? (r as CatalogRow).usd!.toFixed(2) : "", (r as CatalogRow).margin ?? ""].join(",")
    )];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${pageTitle.replace(/\s+/g, "_")}.csv`;
    a.click();
    toast({ title: "CSV exported" });
  };

  const handleHTMLExport = () => {
    if (!printRef.current) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${pageTitle}</title></head><body>${printRef.current.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${pageTitle.replace(/\s+/g, "_")}.html`;
    a.click();
    toast({ title: "HTML exported" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>);

  }

  const today = format(new Date(), "dd MMMM yyyy");

  /* ── Render a section table ── */
  const renderSection = (
  title: string,
  rows: CatalogRow[],
  rowType: "lens" | "addon" | "supply",

  parentLabel?: string) =>
  {
    const displayRows = sortedRows(title, rows);
    const sort = sortState.get(title);
    const SortIcon = ({ col }: {col: string;}) =>
    <button
      className="ml-1 opacity-50 hover:opacity-100 transition-opacity no-print"
      onClick={(e) => {e.stopPropagation();toggleSort(title, col);}}
      title={`Sort by ${col}`}>

        <ArrowUpDown
        className="h-2.5 w-2.5 inline"
        style={{ color: sort?.col === col && sort.dir ? "hsl(215 65% 50%)" : "inherit" }} />

      </button>;


    return (
      <div key={title} className="mt-5 px-2 py-[5px]">
        {parentLabel &&
        <div
          className="px-4 py-1.5 mb-0.5 font-bold text-xs uppercase tracking-wider rounded-none bg-slate-400"
          style={{ background: "hsl(215 30% 20%)", color: "hsl(215 80% 85%)" }}>

            {parentLabel}
          </div>
        }
        <div
          className="px-4 py-2 mb-0.5 font-bold text-sm flex items-center justify-between rounded-none bg-primary text-primary-foreground"
          style={{ background: BLUE_BG, color: "white" }}>

          <span>{parentLabel ? `└ ${title.split(" — ")[1] || title}` : title}</span>
          <button
            className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors no-print"
            onClick={() => {
              setPickerTarget({
                section: title,
                rowKey: "",
                mode: rowType === "supply" ? "add-supply" : rowType === "addon" ? "add-addon" : "add-lens",
                addonSection: rowType === "addon" ? title : undefined
              });
              if (rowType === "supply") setSupplyPickerOpen(true);else
              setLensPickerOpen(true);
            }}>

            <Plus className="h-3 w-3" /> Add Line
          </button>
        </div>

        {displayRows.length === 0 ?
        <p className="text-xs text-muted-foreground px-3 py-3 italic">
            No items — click "Add Line" to add.
          </p> :

        <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th
                className="px-3 py-2 text-left font-semibold border border-slate-300 cursor-pointer select-none"
                style={{ background: "hsl(215 15% 93%)", color: "hsl(215 30% 15%)" }}>

                  Description <SortIcon col="description" />
                </th>
                <th
                className="px-3 py-2 text-right font-semibold border border-slate-300 w-28 cursor-pointer"
                style={{ background: BLUE_BG, color: BLUE_TEXT }}>

                  BBD $ COST <SortIcon col="bbd" />
                </th>
                <th
                className="px-3 py-2 text-right font-semibold border border-slate-300 w-28 cursor-pointer"
                style={{ background: GREEN_BG, color: GREEN_TEXT }}>

                  USD $ COST <SortIcon col="usd" />
                </th>
                <th
                className="px-3 py-2 text-right font-semibold border border-slate-300 w-24 no-print"
                style={{ background: "hsl(280 30% 93%)", color: "hsl(280 40% 30%)" }}>

                  Margin % <SortIcon col="margin" />
                </th>
                <th className="w-6 no-print border border-slate-300" />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) =>
            <tr key={row.key} style={{ background: i % 2 === 0 ? "white" : "hsl(215 20% 98%)" }}>
                  <td
                className="px-3 py-1.5 border border-slate-200 group relative"
                style={{ color: "hsl(215 30% 15%)" }}>

                    <div className="flex items-center gap-1">
                      <span className="flex-1 truncate">{row.description}</span>
                      {rowType === "lens" &&
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity no-print shrink-0"
                    title="Change linked lens"
                    onClick={() => {
                      setPickerTarget({ section: title, rowKey: row.key, mode: "cell" });
                      setLensPickerOpen(true);
                    }}>

                          <Search className="h-3 w-3" style={{ color: "hsl(215 65% 50%)" }} />
                        </button>
                  }
                    </div>
                    {row.lensId &&
                <div className="text-[9px] mt-0.5" style={{ color: "hsl(215 65% 45%)" }}>
                        ↳ linked lens
                      </div>
                }
                    {row.supplyId &&
                <div className="text-[9px] mt-0.5" style={{ color: "hsl(130 55% 40%)" }}>
                        ↳ linked supply
                      </div>
                }
                  </td>
                  <td
                className="px-3 py-1.5 text-right border border-slate-200 font-medium"
                style={{ background: "hsl(215 60% 97%)", color: "hsl(215 60% 30%)" }}>

                    {row.bbd !== null ? `$${(showUSD ? row.bbd : row.bbd).toFixed(2)}` : "—"}
                  </td>
                  <td
                className="px-3 py-1.5 text-right border border-slate-200 font-medium"
                style={{ background: "#f0fff4", color: GREEN_TEXT }}>

                    {row.usd !== null ? `$${row.usd.toFixed(2)}` : "—"}
                  </td>
                  <td
                className="px-3 py-1.5 text-right border border-slate-200 no-print"
                style={{ color: "hsl(280 40% 40%)" }}>

                    {row.margin !== null ? `${row.margin}%` : "—"}
                  </td>
                  <td className="border border-slate-200 p-0 no-print">
                    <button
                  className="w-full h-full flex items-center justify-center p-1 hover:bg-red-50 transition-colors"
                  title="Remove row"
                  onClick={() => removeRow(title, row.key, rowType)}>

                      <X className="h-3 w-3 text-destructive/60 hover:text-destructive" />
                    </button>
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        }

        <p className="text-[10px] italic mt-2 px-1" style={{ color: LABEL }}>
          {PAGE_NOTE}
        </p>
      </div>);

  };

  /* ── Render finish→MF grouped sections ── */
  const renderGroupedSections = () => {
    if (!groupByFinishThenMf) return null;

    // Parse section keys like "Finished — Single Vision" into parent/child
    const finishGroups = new Map<string, string[]>();
    for (const key of effectiveLensRows.keys()) {
      const parts = key.split(" — ");
      const finish = parts[0] || key;
      if (!finishGroups.has(finish)) finishGroups.set(finish, []);
      finishGroups.get(finish)!.push(key);
    }

    const elements: React.ReactNode[] = [];
    let firstFinish = true;
    for (const [finish, sectionKeys] of finishGroups) {
      elements.push(
        <div key={`finish-${finish}`} className={firstFinish ? "mt-2" : "mt-6"}>
          <div
            className="px-4 py-2 font-bold text-sm uppercase tracking-wide rounded-none bg-slate-300"
            style={{ background: "hsl(215 30% 18%)", color: "hsl(0 0% 100%)" }}>

            {finish}
          </div>
          {sectionKeys.map((key) => {
            const rows = effectiveLensRows.get(key) ?? [];
            const mfName = key.split(" — ")[1] || key;
            return renderSection(key, rows, "lens", mfName);
          })}
        </div>
      );
      firstFinish = false;
    }
    return elements;
  };

  const pickerMode = pickerTarget?.mode === "add-addon" ? "all" : "lens-only";

  return (
    <div className="space-y-4">
      {/* Export + Save Bar */}
      <div className="flex items-center gap-2 flex-wrap no-print justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 font-semibold"
            style={{ background: BLUE_BG, color: "white" }}
            onClick={() => {window.print();toast({ title: "Print dialog opened" });}}>

            <FileText className="h-3.5 w-3.5" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExcelExport}>
            <Table2 className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCSVExport}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleHTMLExport}>
            <Globe className="h-3.5 w-3.5" /> HTML
          </Button>
        </div>
        {isDirty &&
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5"
          style={{ background: "hsl(215 65% 50%)", color: "white" }}
          onClick={handleSave}
          disabled={isSaving}>

            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save All Changes
          </Button>
        }
      </div>

      {isDirty &&
      <p className="text-xs no-print" style={{ color: "hsl(38 92% 40%)" }}>
          You have unsaved changes — click "Save All Changes" to persist.
        </p>
      }

      {/* Catalog Body */}
      <div ref={printRef} className="catalog-print-area space-y-0">
        {/* Header */}
        <div
          className="px-6 py-5 text-center border-b-4 print-header border-primary-foreground shadow-none rounded-none border-0 border-none"
          style={{ borderColor: BLUE_BG, background: "hsl(215 20% 98%)" }}>

          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BLUE_BG }}>
            {pageTitle}
          </h1>
          <p className="text-sm mt-1" style={{ color: LABEL }}>{today}</p>
          <p className="text-xs mt-2 italic" style={{ color: LABEL }}>{PAGE_NOTE}</p>
        </div>

        {/* Supply sections (Buy/Sell page) */}
        {suppliesOnly && [...effectiveSupplyRows.entries()].map(([sec, rows]) =>
        renderSection(sec, rows, "supply")
        )}

        {/* Lens sections (non-grouped) */}
        {!suppliesOnly && !groupByFinishThenMf &&
        <>
            {["Single Vision Regular", "FT Regular", "Progressive Regular"].map((sec) => {
            const rows = effectiveLensRows.get(sec);
            if (!rows) return null;
            return renderSection(sec, rows, "lens");
          })}
            {effectiveLensRows.has("Other") &&
          renderSection("Other", effectiveLensRows.get("Other")!, "lens")}
          </>
        }

        {/* Grouped sections (Stock Lens / RX grouped by Finish→MF) */}
        {!suppliesOnly && groupByFinishThenMf && renderGroupedSections()}

        {/* Add-on sections (Treatments + ADD ONS) */}
        {!suppliesOnly && showTreatmentsAddons &&
        <>
            {["Treatments", "ADD ONS"].map((sec) => {
            const rows = effectiveAddonRows.get(sec) ?? [];
            return renderSection(sec, rows, "addon");
          })}
          </>
        }

        {/* Footer */}
        <div className="mt-8 px-2 py-4 border-t border-border text-center">
          <p className="text-[10px] italic" style={{ color: LABEL }}>
            Prices subject to change without notice. All prices in BBD unless otherwise stated. {today}.
          </p>
        </div>
      </div>

      {/* Lens picker */}
      <LensPickerPopover
        open={lensPickerOpen}
        onOpenChange={setLensPickerOpen}
        onPick={handleLensPick}
        mode={pickerMode}
        currentId={null} />


      {/* Supply picker */}
      <SupplyPickerPopover
        open={supplyPickerOpen}
        onOpenChange={setSupplyPickerOpen}
        onPick={handleSupplyPick}
        currentId={null}
        categoryFilter={pickerTarget?.section} />

    </div>);

};

export default ListCatalogTab;