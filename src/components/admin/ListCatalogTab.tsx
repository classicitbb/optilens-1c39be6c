import { useState, useMemo, useRef } from "react";
import { useLenses } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";
import { usePricelistNotes } from "@/hooks/useMaterialUpgrades";
import { useBBDUSDRate } from "@/hooks/usePricelistVersions";
import { Button } from "@/components/ui/button";
import { FileText, Table2, FileSpreadsheet, Globe, Loader2, Plus, X, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { LensPickerPopover, PickedItem } from "@/components/admin/LensPickerPopover";

const BLUE_BG = "#1e4db7";
const GREEN_BG = "#d4edda";
const BLUE_TEXT = "#fff";
const GREEN_TEXT = "#155724";
const LABEL = "hsl(215 15% 40%)";
const PAGE_NOTE = "This is a standard catalog showing lenses inclusive of edging and freight.";

/* ─────────────────────────────────────────────────────────
   Section grouping logic — driven entirely by the lens catalog
   ───────────────────────────────────────────────────────── */

const LENS_SECTIONS: { title: string; test: (l: any) => boolean }[] = [
  {
    title: "Single Vision Regular",
    test: (l) => {
      const n = (l.lenstype_name || l.name || "").toLowerCase();
      return /single|sv\b/i.test(n) && !/bifocal|ft|prog/i.test(n);
    },
  },
  {
    title: "FT Regular",
    test: (l) => {
      const n = (l.lenstype_name || l.name || "").toLowerCase();
      return /bifocal|flat top|ft\b|kryptok/i.test(n);
    },
  },
  {
    title: "Progressive Regular",
    test: (l) => {
      const n = (l.lenstype_name || l.name || "").toLowerCase();
      return /prog|varifocal/i.test(n);
    },
  },
];

const ADDON_SECTIONS: { title: string; test: (a: any) => boolean }[] = [
  {
    title: "Treatments",
    test: (a) => /treat|coat|hmc|ar\b|uv|tint|mirr|antireflect/i.test((a.category + " " + a.name)),
  },
  {
    title: "ADD ONS",
    test: () => true, // catch-all
  },
];

// Compact description from lens name
const lensDesc = (l: any) => l.name;

/* ─────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────── */
export interface CatalogRow {
  key: string;
  section: string;
  description: string;
  bbd: number | null;
  usd: number | null;
  margin: number | null;
  lensId?: string;
  addonId?: string;
  isHeader?: boolean;
}

interface ListCatalogTabProps {
  fxRate: number;
  showUSD: boolean;
  /** If true, groups by Finish Type then MF Type instead of lens type keywords */
  groupByFinishThenMf?: boolean;
  /** "wspl" = show_in_ws_pricelist lenses only, "web" = show_on_website, "none" = no lenses */
  lensFilter?: "wspl" | "web" | "pricelist" | "none";
  /** If true, shows supplies sections instead of lenses */
  suppliesOnly?: boolean;
  /** Page title for exports */
  pageTitle?: string;
}

/* ─────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────── */
const ListCatalogTab = ({ fxRate, showUSD, groupByFinishThenMf = false, lensFilter = "pricelist", suppliesOnly = false, pageTitle = "Custom Catalog" }: ListCatalogTabProps) => {
  const { data: allLenses, isLoading: lLoading } = useLenses();
  const { data: allAddons, isLoading: aLoading } = useAddons();
  const { data: notes = [] } = usePricelistNotes();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Catalog rows keyed by section, stored as arrays
  // We maintain editable rows per section as state so the user can add/remove
  const [lensRows, setLensRows] = useState<Map<string, CatalogRow[]>>(new Map());
  const [addonRows, setAddonRows] = useState<Map<string, CatalogRow[]>>(new Map());

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    section: string;
    rowKey: string;
    mode: "cell" | "add-lens" | "add-addon";
    addonSection?: string;
  } | null>(null);

  const isLoading = lLoading || aLoading;

  /* ── Derive initial lens section rows from catalog ── */
  const defaultLensRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    const plLenses = (allLenses ?? []).filter(
      (l) => l.show_in_pricelist && l.sell_price > 0 && l.is_active
    );

    const used = new Set<string>();

    for (const sec of LENS_SECTIONS) {
      const matched = plLenses.filter((l) => !used.has(l.id) && sec.test(l));
      matched.forEach((l) => used.add(l.id));
      if (matched.length === 0) continue;

      const rows: CatalogRow[] = matched.map((l) => ({
        key: `lens-${l.id}`,
        section: sec.title,
        description: lensDesc(l),
        bbd: l.sell_price,
        usd: l.sell_price * fxRate,
        margin: l.base_price > 0 ? parseFloat((((l.sell_price - l.base_price * 2) / l.sell_price) * 100).toFixed(1)) : null,
        lensId: l.id,
      }));
      map.set(sec.title, rows);
    }

    // Remaining lenses — "Other"
    const remaining = plLenses.filter((l) => !used.has(l.id));
    if (remaining.length > 0) {
      map.set("Other", remaining.map((l) => ({
        key: `lens-${l.id}`,
        section: "Other",
        description: lensDesc(l),
        bbd: l.sell_price,
        usd: l.sell_price * fxRate,
        margin: null,
        lensId: l.id,
      })));
    }

    return map;
  }, [allLenses, fxRate]);

  /* ── Derive initial add-on rows from catalog ── */
  const defaultAddonRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    const active = (allAddons ?? []).filter((a) => a.is_active);

    const used = new Set<string>();

    for (const sec of ADDON_SECTIONS) {
      const matched = active.filter((a) => !used.has(a.id) && sec.test(a));
      matched.forEach((a) => used.add(a.id));
      if (matched.length === 0) continue;

      const rows: CatalogRow[] = matched.map((a) => ({
        key: `addon-${a.id}`,
        section: sec.title,
        description: a.name + (a.description ? ` — ${a.description}` : ""),
        bbd: a.price,
        usd: a.price * fxRate,
        margin: a.cost > 0 ? parseFloat((((a.price - a.cost) / a.price) * 100).toFixed(1)) : null,
        addonId: a.id,
      }));
      map.set(sec.title, rows);
    }

    return map;
  }, [allAddons, fxRate]);

  // Merge default + user-added overrides
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

  /* ── Pick handler ── */
  const handlePick = (item: PickedItem) => {
    if (!pickerTarget) return;
    const { section, rowKey, mode, addonSection } = pickerTarget;

    if (mode === "cell") {
      // Replace BBD price in an existing lens row
      if (item.type !== "lens") return;
      setLensRows((prev) => {
        const next = new Map(prev);
        const sectionRows = [...(effectiveLensRows.get(section) ?? [])];
        const idx = sectionRows.findIndex((r) => r.key === rowKey);
        if (idx !== -1) {
          sectionRows[idx] = {
            ...sectionRows[idx],
            description: item.name,
            bbd: item.sell_price,
            usd: item.sell_price * fxRate,
            lensId: item.id,
          };
        }
        next.set(section, sectionRows);
        return next;
      });
    } else if (mode === "add-lens") {
      // Add a new row to the lens section
      if (item.type !== "lens") return;
      const newRow: CatalogRow = {
        key: `lens-${item.id}-${Date.now()}`,
        section,
        description: item.name,
        bbd: item.sell_price,
        usd: item.sell_price * fxRate,
        margin: null,
        lensId: item.id,
      };
      setLensRows((prev) => {
        const next = new Map(prev);
        const existing = effectiveLensRows.get(section) ?? [];
        next.set(section, [...existing, newRow]);
        return next;
      });
    } else if (mode === "add-addon") {
      // Add a new row to the addon section
      if (item.type !== "addon") return;
      const target = addonSection ?? "ADD ONS";
      const newRow: CatalogRow = {
        key: `addon-${item.id}-${Date.now()}`,
        section: target,
        description: item.name + (item.type === "addon" && (item as any).description ? ` — ${(item as any).description}` : ""),
        bbd: item.price,
        usd: item.price * fxRate,
        margin: null,
        addonId: item.id,
      };
      setAddonRows((prev) => {
        const next = new Map(prev);
        const existing = effectiveAddonRows.get(target) ?? [];
        next.set(target, [...existing, newRow]);
        return next;
      });
    }
  };

  const removeRow = (section: string, rowKey: string, isAddon: boolean) => {
    if (isAddon) {
      setAddonRows((prev) => {
        const next = new Map(prev);
        const rows = (effectiveAddonRows.get(section) ?? []).filter((r) => r.key !== rowKey);
        next.set(section, rows);
        return next;
      });
    } else {
      setLensRows((prev) => {
        const next = new Map(prev);
        const rows = (effectiveLensRows.get(section) ?? []).filter((r) => r.key !== rowKey);
        next.set(section, rows);
        return next;
      });
    }
  };

  /* ── Exports ── */
  const allRows: CatalogRow[] = [
    ...[...effectiveLensRows.entries()].flatMap(([, rows]) => rows),
    ...[...effectiveAddonRows.entries()].flatMap(([, rows]) => rows),
  ];

  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["Custom Catalog 2025", "", "", ""],
      ["Description", "BBD $ COST", "USD $ COST", "Margin %"],
      ...allRows.map((r) => [
        r.description,
        r.bbd ?? "",
        r.usd !== null ? parseFloat(r.usd.toFixed(2)) : "",
        r.margin ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Catalog");
    XLSX.writeFile(wb, "CustomCatalog2025.xlsx");
    toast({ title: "Excel exported" });
  };

  const handleCSVExport = () => {
    const lines = [
      "Description,BBD $ COST,USD $ COST,Margin %",
      ...allRows.map((r) =>
        [`"${r.description}"`, r.bbd ?? "", r.usd !== null ? r.usd.toFixed(2) : "", r.margin ?? ""].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CustomCatalog2025.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const handleHTMLExport = () => {
    if (!printRef.current) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Custom Catalog 2025</title></head><body>${printRef.current.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CustomCatalog2025.html";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "HTML exported" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = format(new Date(), "dd MMMM yyyy");
  const pickerMode = pickerTarget?.mode === "add-addon" ? "all" : "lens-only";

  /* ── Render a section table (lens or addon) ── */
  const renderSection = (
    title: string,
    rows: CatalogRow[],
    isAddon: boolean
  ) => {
    if (rows.length === 0 && !isAddon) return null;
    return (
      <div key={title} className="mt-6 px-2">
        {/* Section heading */}
        <div
          className="px-4 py-2 rounded-sm mb-1 font-bold text-sm flex items-center justify-between"
          style={{ background: BLUE_BG, color: "white" }}
        >
          <span>{title}</span>
          {/* Add line button */}
          <button
            className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors no-print"
            onClick={() => {
              setPickerTarget({
                section: title,
                rowKey: "",
                mode: isAddon ? "add-addon" : "add-lens",
                addonSection: isAddon ? title : undefined,
              });
              setPickerOpen(true);
            }}
          >
            <Plus className="h-3 w-3" /> Add Line
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-3 italic">
            No items in this section yet — click "Add Line" to add.
          </p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th
                  className="px-3 py-2 text-left font-semibold border border-slate-300"
                  style={{ background: "hsl(215 15% 93%)", color: "hsl(215 30% 15%)" }}
                >
                  Description
                </th>
                <th
                  className="px-3 py-2 text-right font-semibold border border-slate-300 w-28"
                  style={{ background: BLUE_BG, color: BLUE_TEXT }}
                >
                  BBD $ COST
                </th>
                <th
                  className="px-3 py-2 text-right font-semibold border border-slate-300 w-28"
                  style={{ background: GREEN_BG, color: GREEN_TEXT }}
                >
                  USD $ COST
                </th>
                <th
                  className="px-3 py-2 text-right font-semibold border border-slate-300 w-24 no-print"
                  style={{ background: "hsl(280 30% 93%)", color: "hsl(280 40% 30%)" }}
                >
                  Margin %
                </th>
                <th className="w-6 no-print border border-slate-300" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.key} style={{ background: i % 2 === 0 ? "white" : "hsl(215 20% 98%)" }}>
                  <td
                    className="px-3 py-1.5 border border-slate-200 group relative"
                    style={{ color: "hsl(215 30% 15%)" }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="flex-1 truncate">{row.description}</span>
                      {!isAddon && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity no-print shrink-0"
                          title="Change linked lens"
                          onClick={() => {
                            setPickerTarget({ section: title, rowKey: row.key, mode: "cell" });
                            setPickerOpen(true);
                          }}
                        >
                          <Search className="h-3 w-3" style={{ color: "hsl(215 65% 50%)" }} />
                        </button>
                      )}
                    </div>
                    {row.lensId && (
                      <div className="text-[9px] mt-0.5" style={{ color: "hsl(215 65% 45%)" }}>
                        ↳ linked lens
                      </div>
                    )}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right border border-slate-200 font-medium"
                    style={{ background: "hsl(215 60% 97%)", color: "hsl(215 60% 30%)" }}
                  >
                    {row.bbd !== null ? `$${row.bbd.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right border border-slate-200 font-medium"
                    style={{ background: "#f0fff4", color: GREEN_TEXT }}
                  >
                    {row.usd !== null ? `$${row.usd.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right border border-slate-200 no-print"
                    style={{ color: "hsl(280 40% 40%)" }}
                  >
                    {row.margin !== null ? `${row.margin}%` : "—"}
                  </td>
                  <td className="border border-slate-200 p-0 no-print">
                    <button
                      className="w-full h-full flex items-center justify-center p-1 hover:bg-red-50 transition-colors"
                      title="Remove row"
                      onClick={() => removeRow(title, row.key, isAddon)}
                    >
                      <X className="h-3 w-3 text-destructive/60 hover:text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="text-[10px] italic mt-2 px-1" style={{ color: LABEL }}>
          {PAGE_NOTE}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Export Bar */}
      <div className="flex items-center gap-2 flex-wrap no-print">
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 font-semibold"
          style={{ background: BLUE_BG, color: "white" }}
          onClick={() => { window.print(); toast({ title: "Print dialog opened" }); }}
        >
          <FileText className="h-3.5 w-3.5" />
          Export List PDF
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExcelExport}>
          <Table2 className="h-3.5 w-3.5" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCSVExport}>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleHTMLExport}>
          <Globe className="h-3.5 w-3.5" />
          Export HTML
        </Button>
      </div>

      {/* Top notes */}
      {notes.filter((n) => n.section === "top").length > 0 && (
        <div className="space-y-1 p-3 rounded-md border border-border bg-muted/30 no-print">
          {notes
            .filter((n) => n.section === "top")
            .map((n) => (
              <p key={n.id} className="text-xs" style={{ color: LABEL }}>
                {n.content}
              </p>
            ))}
        </div>
      )}

      {/* Catalog Body */}
      <div ref={printRef} className="catalog-print-area space-y-0">
        {/* Header */}
        <div
          className="px-6 py-5 text-center border-b-4 print-header"
          style={{ borderColor: BLUE_BG, background: "hsl(215 20% 98%)" }}
        >
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BLUE_BG }}>
            Custom Catalog 2025
          </h1>
          <p className="text-sm mt-1" style={{ color: LABEL }}>{today}</p>
          <p className="text-xs mt-2 italic" style={{ color: LABEL }}>{PAGE_NOTE}</p>
        </div>

        {/* Lens sections */}
        {LENS_SECTIONS.map((sec) => {
          const rows = effectiveLensRows.get(sec.title) ?? [];
          return renderSection(sec.title, rows, false);
        })}
        {effectiveLensRows.has("Other") &&
          renderSection("Other", effectiveLensRows.get("Other") ?? [], false)}

        {/* Add-on sections */}
        {ADDON_SECTIONS.map((sec) => {
          const rows = effectiveAddonRows.get(sec.title) ?? [];
          return renderSection(sec.title, rows, true);
        })}

        {/* Bottom notes */}
        {notes.filter((n) => n.section !== "top").length > 0 && (
          <div className="mt-6 px-2 space-y-2">
            <div className="px-4 py-2 rounded-sm font-bold text-sm" style={{ background: "hsl(215 30% 25%)", color: "white" }}>
              Notes & Information
            </div>
            {notes
              .filter((n) => n.section !== "top")
              .map((n) => (
                <div key={n.id} className="px-4 py-2 rounded border border-border text-xs" style={{ color: LABEL }}>
                  {n.section && (
                    <span className="font-semibold mr-2" style={{ color: "hsl(215 30% 20%)" }}>
                      [{n.section}]
                    </span>
                  )}
                  {n.content}
                </div>
              ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 px-2 py-4 border-t border-border text-center">
          <p className="text-[10px] italic" style={{ color: LABEL }}>
            Prices subject to change without notice. All prices in BBD unless otherwise stated. {today}.
          </p>
        </div>
      </div>

      {/* Lens picker */}
      <LensPickerPopover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePick}
        mode={pickerMode}
        currentId={null}
      />
    </div>
  );
};

export default ListCatalogTab;
