import { useMemo } from "react";
import { format } from "date-fns";
import { useMatrixAllocations, MATERIAL_COLUMNS, TREATMENT_TYPES, TreatmentType } from "@/hooks/useMatrixAllocations";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLenses } from "@/hooks/useLenses";
import { PricelistVersion } from "@/hooks/usePricelistVersions";
import { usePriceHierarchy } from "@/hooks/usePriceHierarchy";
import { cn } from "@/lib/utils";
import { CATEGORY_ORDER, compareCategoryOrder, compareMaterialOrder } from "@/lib/sortOrder";
import { preparePrintListChunks, type PrintListSection } from "@/features/admin/print/printLayout";

const TREATMENT_LABELS: Record<TreatmentType, string> = {
  clear: "Clear Lenses",
  transitions: "Transitions",
  photochromic: "Photochromic",
  polarized: "Polarized",
  bluefilter: "Bluefilter",
};

const CATALOG_TITLES: Record<string, string> = {
  rx: "RX LENS PRICES",
  stock: "STOCK LENS PRICES",
  buysell: "SUPPLIES PRICE LIST",
};

interface Props {
  version: PricelistVersion;
  previewFormat: "matrix" | "list";
  showUSD: boolean;
  fxRate: number;
  catalogType?: "rx" | "stock" | "buysell";
}

const fmtDisplay = (val: number | null | undefined, showUSD: boolean, fxRate: number) => {
  if (val == null) return "—";
  const v = showUSD ? val * fxRate : val;
  return `$${v.toFixed(2)}`;
};

const PricelistLivePreview = ({ version, previewFormat, showUSD, fxRate, catalogType = "rx" }: Props) => {
  const { data: allocations = [] } = useMatrixAllocations(version.id);
  const { data: matrixRows = [] } = usePriceMatrix();
  const { data: allCatalogRows = [] } = usePricelistCatalogRows(version.id, catalogType);
  const { data: company } = useCompanySettings();
  const { data: allLenses = [] } = useLenses();
  const { calcFinalPrice } = usePriceHierarchy(version.id);

  const catalogRows = useMemo(() => {
    if (catalogType === "buysell") return allCatalogRows.filter((r) => r.row_type === "supply");
    return allCatalogRows.filter((r) => r.row_type === "lens");
  }, [allCatalogRows, catalogType]);

  const addonRows = useMemo(() => {
    if (catalogType === "buysell")
      return allCatalogRows.filter((r) => ["addon", "treatment"].includes(r.row_type)).sort((a, b) => a.sort_order - b.sort_order);
    return allCatalogRows.filter((r) => ["addon", "treatment", "supply"].includes(r.row_type)).sort((a, b) => a.sort_order - b.sort_order);
  }, [allCatalogRows, catalogType]);

  const addonsBySection = useMemo(() => {
    const map = new Map<string, typeof addonRows>();
    for (const r of addonRows) {
      const sec = r.section || "Other";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(r);
    }
    return map;
  }, [addonRows]);

  const lensIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    allLenses.forEach((l) => m.set(l.id, l.index_value));
    return m;
  }, [allLenses]);

  // Use canonical category order, falling back to price_matrix categories
  const categories = useMemo(() => {
    const rawCats = [...new Set(matrixRows.map((r) => r.category))];
    return rawCats.sort(compareCategoryOrder);
  }, [matrixRows]);

  const TREATMENT_PREFIXES = ["Clear Lenses", "Transitions", "Photochromic", "Polarized", "Bluefilter"];
  const lensSections = useMemo(() => {
    const map = new Map<string, typeof catalogRows>();
    for (const r of catalogRows) {
      const sec = r.section || "Lenses";
      const parts = sec.split(" — ");
      const isMatrixSection = TREATMENT_PREFIXES.some((tp) => parts[0].trim() === tp);
      const category = isMatrixSection ? (parts.slice(1).join(" — ") || sec) : sec;
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(r);
    }
    return map;
  }, [catalogRows]);

  const today = format(new Date(), "dd MMMM yyyy");
  const currency = showUSD ? "USD" : "BBD";

  /** Apply hierarchy to a matrix allocation price */
  const hierarchyMatrixPrice = (allocPrice: number | null, allocId?: string) => {
    const finalBbd = calcFinalPrice(allocPrice, version, catalogType, allocId, "matrix_allocation");
    return fmtDisplay(finalBbd, showUSD, fxRate);
  };

  /** Apply hierarchy to a catalog row price */
  const hierarchyCatalogPrice = (row: { bbd_price: number | null; row_key: string; row_type: string }) => {
    const finalBbd = calcFinalPrice(row.bbd_price, version, catalogType, row.row_key, row.row_type);
    return fmtDisplay(finalBbd, showUSD, fxRate);
  };

  /** Raw number for average calculations */
  const hierarchyMatrixNum = (allocPrice: number | null, allocId?: string): number | null => {
    return calcFinalPrice(allocPrice, version, catalogType, allocId, "matrix_allocation");
  };

  // ── Matrix preview ───────────────────────────────────────────────────────────
  const MatrixPreview = () => {
    // Get active material columns sorted by canonical order
    const getActiveCols = (tt: TreatmentType) => {
      const active = MATERIAL_COLUMNS.filter((col) =>
        allocations.some((a) => a.treatment_type === tt && a.material_index === col.key && a.allocated_price_bbd != null)
      );
      return active.length > 0 ? [...active].sort((a, b) => compareMaterialOrder(a.key, b.key)) : [...MATERIAL_COLUMNS].sort((a, b) => compareMaterialOrder(a.key, b.key));
    };

    return (
      <div className="space-y-6">
        {TREATMENT_TYPES.map((tt) => {
          const ttAllocs = allocations.filter((a) => a.treatment_type === tt);
          if (tt !== "clear" && ttAllocs.length === 0) return null;

          const visibleCols = getActiveCols(tt);

          // Get active categories for this treatment, sorted canonically
          const activeCats = categories.filter((cat) =>
            visibleCols.some((col) =>
              allocations.some((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt && a.allocated_price_bbd != null)
            )
          );
          if (activeCats.length === 0 && tt !== "clear") return null;

          const getColAvg = (mat: string, treatType: TreatmentType) => {
            const vals = activeCats
              .map((cat) => {
                const a = allocations.find((al) => al.category === cat && al.material_index === mat && al.treatment_type === treatType);
                return hierarchyMatrixNum(a?.allocated_price_bbd ?? null, a?.id ? String(a.id) : undefined);
              })
              .filter((v): v is number => v !== null);
            if (!vals.length) return null;
            return vals.reduce((s, v) => s + v, 0) / vals.length;
          };

          return (
            <div key={tt} className="print-grid-keep">
              <table className="w-full text-xs border-collapse" style={{ tableLayout: "auto" }}>
                <thead>
                  <tr>
                    <th
                      className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-sm"
                      style={{ background: "#1e4db7", color: "white", borderBottom: "none" }}
                      colSpan={1}
                    >
                      {TREATMENT_LABELS[tt]}
                    </th>
                    {visibleCols.map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-2.5 text-center font-bold uppercase tracking-wider"
                        style={{ background: "hsl(var(--admin-table-header-bg))", color: "hsl(var(--admin-table-header-fg))", minWidth: "90px", borderBottom: "none" }}
                      >
                        {col.key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCats.map((cat, i) => (
                    <tr key={cat} style={{ borderBottom: "1px solid hsl(var(--admin-table-border))" }}>
                      <td className="px-4 py-2 font-medium" style={{ color: "hsl(var(--admin-content-fg))" }}>{cat}</td>
                      {visibleCols.map((col) => {
                        const alloc = allocations.find(
                          (a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt
                        );
                        return (
                          <td key={col.key} className="px-3 py-2 text-right font-semibold" style={{ color: "hsl(var(--admin-content-fg))" }}>
                            {alloc?.allocated_price_bbd != null
                              ? hierarchyMatrixPrice(alloc.allocated_price_bbd, alloc.id ? String(alloc.id) : undefined)
                              : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid hsl(var(--admin-border))", background: "hsl(var(--admin-muted))" }}>
                    <td className="px-4 py-2 italic text-xs" style={{ color: "hsl(var(--admin-muted-fg))" }}>Col. Averages</td>
                    {visibleCols.map((col) => {
                      const avg = getColAvg(col.key, tt);
                      return (
                        <td key={col.key} className="px-3 py-2 text-right italic" style={{ color: "hsl(var(--admin-muted-fg))" }}>
                          {avg != null ? fmtDisplay(avg, showUSD, fxRate) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                  {tt !== "clear" && (
                    <tr style={{ background: "hsl(var(--admin-table-row-warning))", borderTop: "1px solid hsl(var(--admin-table-border))" }}>
                      <td className="px-4 py-2 italic text-xs" style={{ color: "hsl(var(--admin-warning))" }}>Δ vs Clear</td>
                      {visibleCols.map((col) => {
                        const treatAvg = getColAvg(col.key, tt);
                        const clearAvg = getColAvg(col.key, "clear");
                        const delta = treatAvg != null && clearAvg != null ? treatAvg - clearAvg : null;
                        return (
                          <td
                            key={col.key}
                            className="px-3 py-2 text-right font-semibold text-xs"
                            style={{ color: delta == null ? "#a0aec0" : delta > 0 ? "#38a169" : "#e53e3e" }}
                          >
                            {delta != null ? `${delta > 0 ? "+" : ""}${fmtDisplay(delta, showUSD, fxRate)}` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Treatments & Add-ons grouped by category */}
        {addonsBySection.size > 0 && (
          <div className="space-y-4 print-grid-keep">
            {[...addonsBySection.entries()].map(([sec, rows]) => (
              <div key={sec} className="print-avoid-break print-grid-keep">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-sm" style={{ background: "hsl(var(--admin-table-header-bg))", color: "hsl(var(--admin-table-header-fg))" }}>{sec}</th>
                      <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider w-32" style={{ background: "hsl(var(--admin-table-header-bg))", color: "hsl(var(--admin-table-header-fg))" }}>{currency} PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id ?? row.row_key} style={{ borderBottom: "1px solid hsl(var(--admin-table-border))" }}>
                        <td className="px-4 py-2" style={{ color: "hsl(var(--admin-content-fg))" }}>{row.display_description}</td>
                        <td className="px-4 py-2 text-right font-semibold" style={{ color: "hsl(var(--admin-content-fg))" }}>
                          {hierarchyCatalogPrice(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── List preview ─────────────────────────────────────────────────────────────
  const ListPreview = () => {
    const hasContent = lensSections.size > 0 || addonsBySection.size > 0;

    const SectionTable = ({ label, rows, pageBreakBefore, isContinuation }: { label: string; rows: typeof catalogRows; pageBreakBefore?: boolean; isContinuation?: boolean }) => (
      <div className={`print-avoid-break print-grid-keep${pageBreakBefore ? " print-page-break-before" : ""}`}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th
                colSpan={2}
                className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-sm"
                style={{ background: "hsl(var(--admin-table-header-bg))", color: "hsl(var(--admin-table-header-fg))" }}
              >
                {label}
                {isContinuation ? " (cont.)" : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? row.row_key} style={{ borderBottom: "1px solid hsl(var(--admin-table-border))" }}>
                <td className="px-4 py-2.5" style={{ color: "hsl(var(--admin-content-fg))" }}>{row.display_description}</td>
                <td className="px-4 py-2.5 text-right font-semibold w-32" style={{ color: "hsl(var(--admin-content-fg))" }}>
                  {hierarchyCatalogPrice(row)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    const sortedLensSections = [...lensSections.entries()].sort((a, b) => compareCategoryOrder(a[0], b[0]));
    const lensListSections: PrintListSection<(typeof catalogRows)[number]>[] = sortedLensSections.map(([sec, rows]) => ({
      key: `lens-${sec}`,
      label: sec,
      rows: [...rows].sort((a, b) => {
        const aIdx = a.item_id ? (lensIndexMap.get(a.item_id) ?? 999) : 999;
        const bIdx = b.item_id ? (lensIndexMap.get(b.item_id) ?? 999) : 999;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.sort_order - b.sort_order;
      }),
    }));
    const addonListSections: PrintListSection<(typeof catalogRows)[number]>[] = [...addonsBySection.entries()].map(([sec, rows]) => ({
      key: `addon-${sec}`,
      label: sec,
      rows,
    }));
    const listChunks = preparePrintListChunks([...lensListSections, ...addonListSections], {
      rowsPerPage: 20,
      minSplitThreshold: 5,
    });

    return (
      <div className="space-y-5">
        {!hasContent ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No price list rows yet. Add lenses in the Price Matrix Editor tab.
          </p>
        ) : (
          <>
            {listChunks.map((chunk) => (
              <SectionTable
                key={chunk.key}
                label={chunk.label}
                rows={chunk.rows}
                pageBreakBefore={chunk.pageBreakBefore}
                isContinuation={chunk.isContinuation}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 rounded-md p-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a202c", background: "#ffffff" }}>
      {/* Header — matching reference screenshot */}
      <div className="flex items-start justify-between pb-4" style={{ borderBottom: "2px solid #e2e8f0" }}>
        <div className="flex-1 text-center">
          <h1 className="font-bold tracking-wide uppercase print-keep-with-next" style={{ fontSize: "22px", letterSpacing: "2px", color: "#1a202c" }}>
            {CATALOG_TITLES[catalogType] ?? "PRICE LIST"}
          </h1>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs" style={{ color: "#4a5568" }}>
            {previewFormat === "matrix" ? "Matrix Format" : "List Format"} · {today}
          </p>
          <p className="text-xs font-semibold" style={{ color: "#2d3748" }}>{currency}</p>
        </div>
      </div>

      {previewFormat === "matrix" ? <MatrixPreview /> : <ListPreview />}

      <p className="text-center pt-3" style={{ fontSize: "9px", color: "#a0aec0", borderTop: "1px solid #e2e8f0" }}>
        All prices in {currency}. Prices subject to change without notice. · {company?.company_name}
      </p>
    </div>
  );
};

export default PricelistLivePreview;
