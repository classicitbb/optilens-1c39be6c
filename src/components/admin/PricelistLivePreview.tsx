import { useMemo } from "react";
import { format } from "date-fns";
import { useMatrixAllocations, MATERIAL_COLUMNS, TREATMENT_TYPES, TreatmentType } from "@/hooks/useMatrixAllocations";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLenses } from "@/hooks/useLenses";
import { PricelistVersion } from "@/hooks/usePricelistVersions";
import { cn } from "@/lib/utils";

const TREATMENT_LABELS: Record<TreatmentType, string> = {
  clear: "Clear Lenses",
  transitions: "Transitions",
  photochromic: "Photochromic",
  polarized: "Polarized",
  bluefilter: "Bluefilter",
};

interface Props {
  version: PricelistVersion;
  previewFormat: "matrix" | "list";
  showUSD: boolean;
  fxRate: number;
  catalogType?: "rx" | "stock" | "buysell";
}

const fmt = (val: number | null | undefined, showUSD: boolean, fxRate: number) => {
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

  const catalogRows = useMemo(() => {
    if (catalogType === "buysell") return allCatalogRows.filter((r) => r.row_type === "supply");
    return allCatalogRows.filter((r) => r.row_type === "lens");
  }, [allCatalogRows, catalogType]);
  const addonRows = useMemo(
    () => {
      if (catalogType === "buysell") return allCatalogRows.filter((r) => ["addon", "treatment"].includes(r.row_type)).sort((a, b) => a.sort_order - b.sort_order);
      return allCatalogRows.filter((r) => ["addon", "treatment", "supply"].includes(r.row_type)).sort((a, b) => a.sort_order - b.sort_order);
    },
    [allCatalogRows, catalogType]
  );

  const addonsBySection = useMemo(() => {
    const map = new Map<string, typeof addonRows>();
    for (const r of addonRows) {
      const sec = r.section || "Other";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(r);
    }
    return map;
  }, [addonRows]);

  const lensNameMap = useMemo(() => {
    const m = new Map<string, string>();
    allLenses.forEach((l) => m.set(l.id, l.name));
    return m;
  }, [allLenses]);

  const lensIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    allLenses.forEach((l) => m.set(l.id, l.index_value));
    return m;
  }, [allLenses]);

  const categories = useMemo(() => [...new Set(matrixRows.map((r) => r.category))], [matrixRows]);

  const TREATMENT_PREFIXES = ["Clear Lenses", "Transitions", "Photochromic", "Polarized", "Bluefilter"];
  const lensSections = useMemo(() => {
    const map = new Map<string, typeof catalogRows>();
    for (const r of catalogRows) {
      const sec = r.section || "Lenses";
      const parts = sec.split(" — ");
      const isMatrixSection = TREATMENT_PREFIXES.some(tp => parts[0].trim() === tp);
      const category = isMatrixSection ? (parts.slice(1).join(" — ") || sec) : sec;
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(r);
    }
    return map;
  }, [catalogRows]);

  const today = format(new Date(), "dd MMMM yyyy");
  const currency = showUSD ? "USD" : (version.base_currency ?? "BBD");

  // ── Matrix preview ───────────────────────────────────────────────────────────
  const MatrixPreview = () => (
    <div className="space-y-6">
      {TREATMENT_TYPES.map((tt) => {
        const ttAllocs = allocations.filter((a) => a.treatment_type === tt);
        if (tt !== "clear" && ttAllocs.length === 0) return null;

        // Collapse empty material columns for this treatment
        const activeCols = MATERIAL_COLUMNS.filter((col) =>
          allocations.some((a) => a.treatment_type === tt && a.material_index === col.key && a.allocated_price_bbd != null)
        );
        if (activeCols.length === 0 && tt !== "clear") return null;

        const getColAvg = (mat: string, treatType: TreatmentType) => {
          const vals = categories
            .map((cat) => allocations.find((a) => a.category === cat && a.material_index === mat && a.treatment_type === treatType)?.allocated_price_bbd ?? null)
            .filter((v): v is number => v !== null);
          if (!vals.length) return null;
          return vals.reduce((s, v) => s + v, 0) / vals.length;
        };

        const visibleCols = activeCols.length > 0 ? activeCols : MATERIAL_COLUMNS;

        return (
          <div key={tt}>
            <table className="w-full text-xs border-collapse border border-border" style={{ tableLayout: "auto", borderRadius: 0 }}>
              <thead>
                <tr style={{ background: "#1e4db7" }}>
                  <th className="px-3 py-2 text-left border-r border-white/20 font-bold uppercase tracking-wide whitespace-nowrap" style={{ minWidth: "180px", color: "white", borderRadius: 0 }}>
                     {TREATMENT_LABELS[tt]}
                  </th>
                  {visibleCols.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-center border-r border-white/20 last:border-r-0 font-bold uppercase tracking-wide whitespace-nowrap" style={{ minWidth: "80px", color: "white", borderRadius: 0 }}>
                      {col.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.filter((cat) =>
                  visibleCols.some((col) =>
                    allocations.some((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt && a.allocated_price_bbd != null)
                  )
                ).map((cat, i) => (
                  <tr key={cat} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-3 py-1 font-medium border-r border-border text-foreground">{cat}</td>
                    {visibleCols.map((col) => {
                      const alloc = allocations.find(
                        (a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt
                      );
                      return (
                        <td key={col.key} className="px-3 py-1 text-right border-r border-border last:border-r-0 text-foreground">
                          {alloc?.allocated_price_bbd != null ? fmt(alloc.allocated_price_bbd, showUSD, fxRate) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-muted/50 border-t-2 border-border">
                  <td className="px-3 py-1 text-muted-foreground italic border-r border-border text-[10px]">Col. Averages</td>
                  {visibleCols.map((col) => {
                    const avg = getColAvg(col.key, tt);
                    return (
                      <td key={col.key} className="px-3 py-1 text-right border-r border-border last:border-r-0 text-foreground">
                        {avg != null ? fmt(avg, showUSD, fxRate) : "—"}
                      </td>
                    );
                  })}
                </tr>
                {tt !== "clear" && (
                  <tr className="bg-amber-50/40 dark:bg-amber-900/10 border-t border-border">
                    <td className="px-3 py-1 text-amber-700 dark:text-amber-400 italic border-r border-border text-[10px]">Δ vs Clear</td>
                    {visibleCols.map((col) => {
                      const treatAvg = getColAvg(col.key, tt);
                      const clearAvg = getColAvg(col.key, "clear");
                      const delta = treatAvg != null && clearAvg != null ? treatAvg - clearAvg : null;
                      return (
                        <td key={col.key} className={cn(
                          "px-3 py-1 text-right border-r border-border last:border-r-0 font-semibold text-[10px]",
                          delta == null ? "text-muted-foreground" : delta > 0 ? "text-emerald-600" : "text-red-500"
                        )}>
                          {delta != null ? `${delta > 0 ? "+" : ""}${fmt(delta, showUSD, fxRate)}` : "—"}
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
        <div className="space-y-3">
          {[...addonsBySection.entries()].map(([sec, rows]) => (
            <div key={sec}>
              <table className="w-full text-xs border-collapse border border-border" style={{ borderRadius: 0 }}>
                <thead>
              <tr style={{ background: "#1e4db7" }}>
                     <th className="px-3 py-2 text-left border-r border-white/20 font-bold uppercase tracking-wide" style={{ color: "white", borderRadius: 0 }}>{sec}</th>
                     <th className="px-3 py-2 text-right font-bold uppercase tracking-wide w-28" style={{ color: "white", borderRadius: 0 }}>{currency} Price</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id ?? row.row_key} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-3 py-1 border-r border-border text-foreground">{row.display_description}</td>
                      <td className="px-3 py-1 text-right text-foreground">
                        {row.bbd_price != null ? fmt(row.bbd_price, showUSD, fxRate) : "—"}
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

  // ── List preview ─────────────────────────────────────────────────────────────
  const ListPreview = () => {
    const hasContent = lensSections.size > 0 || addonsBySection.size > 0;

    const SectionTable = ({ label, rows }: { label: string; rows: typeof catalogRows }) => (
      <div>
          <table className="w-full text-xs border-collapse border border-border" style={{ borderRadius: 0 }}>
          <thead>
            <tr style={{ background: "#1e4db7" }}>
              <th className="px-3 py-2 text-left border-r border-white/20 font-bold uppercase tracking-wide" style={{ color: "white", borderRadius: 0 }}>{label}</th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wide w-24" style={{ color: "white", borderRadius: 0 }}>{currency} Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? row.row_key} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="px-3 py-1.5 border-r border-border text-foreground">{row.display_description}</td>
                <td className="px-3 py-1.5 text-right text-foreground">
                  {row.bbd_price != null ? fmt(row.bbd_price, showUSD, fxRate) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    // Sort lens sections by matrix category order
    const sortedLensSections = [...lensSections.entries()].sort((a, b) => {
      const aIdx = categories.indexOf(a[0]);
      const bIdx = categories.indexOf(b[0]);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return (
      <div className="space-y-5">
        {!hasContent ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No price list rows yet. Add lenses in the Price Matrix Editor tab.
          </p>
        ) : (
          <>
            {sortedLensSections.map(([sec, rows]) => (
              <SectionTable
                key={sec}
                label={sec}
                rows={[...rows].sort((a, b) => {
                  const aIdx = a.item_id ? (lensIndexMap.get(a.item_id) ?? 999) : 999;
                  const bIdx = b.item_id ? (lensIndexMap.get(b.item_id) ?? 999) : 999;
                  if (aIdx !== bIdx) return aIdx - bIdx;
                  return a.sort_order - b.sort_order;
                })}
              />
            ))}

            {addonsBySection.size > 0 && (
              <>
                <div className="border-t-2 border-border pt-2" />
                {[...addonsBySection.entries()].map(([sec, rows]) => (
                  <SectionTable key={sec} label={sec} rows={rows} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Branded header */}
      <div className="flex items-start justify-between pb-3 border-b border-border">
        <div>
          {company?.logo_url && (
            <img src={company.logo_url} alt={company?.company_name ?? "Logo"} className="max-h-12 mb-1 object-contain" />
          )}
          <p className="text-sm font-bold text-foreground">{company?.company_name ?? "Company"}</p>
          <p className="text-[10px] text-muted-foreground">{company?.slogan}</p>
          <p className="text-[10px] text-muted-foreground">{company?.tel} · {company?.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-foreground">{version.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {previewFormat === "matrix" ? "Matrix Format" : "List Format"} · {today}
          </p>
          <p className="text-[10px] text-muted-foreground">{currency}</p>
        </div>
      </div>

      {previewFormat === "matrix" ? <MatrixPreview /> : <ListPreview />}

      <p className="text-[9px] text-muted-foreground pt-2 border-t border-border text-center">
        All prices in {currency}. Prices subject to change without notice. · {company?.company_name}
      </p>
    </div>
  );
};

export default PricelistLivePreview;
