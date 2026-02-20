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
}

const fmt = (val: number | null | undefined, showUSD: boolean, fxRate: number) => {
  if (val == null) return "—";
  const v = showUSD ? val * fxRate : val;
  return v.toFixed(2);
};

const PricelistLivePreview = ({ version, previewFormat, showUSD, fxRate }: Props) => {
  const { data: allocations = [] } = useMatrixAllocations(version.id);
  const { data: matrixRows = [] } = usePriceMatrix();
  const { data: allCatalogRows = [] } = usePricelistCatalogRows(version.id, "rx");
  const { data: company } = useCompanySettings();
  const { data: allLenses = [] } = useLenses();

  // Split rows: lens rows vs add-on/treatment/supply rows
  const catalogRows = useMemo(() => allCatalogRows.filter((r) => r.row_type === "lens"), [allCatalogRows]);
  const addonRows = useMemo(
    () => allCatalogRows.filter((r) => ["addon", "treatment", "supply"].includes(r.row_type)).sort((a, b) => a.sort_order - b.sort_order),
    [allCatalogRows]
  );

  // Group addon rows by section (category name)
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

  const categories = useMemo(() => [...new Set(matrixRows.map((r) => r.category))], [matrixRows]);

  // Group lens catalog rows by CATEGORY only (strip treatment-type prefix like "Clear Lenses — ")
  // for list preview. Treatment splits only apply to matrix view.
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

        const getColAvg = (mat: string, treatType: TreatmentType) => {
          const vals = categories
            .map((cat) => allocations.find((a) => a.category === cat && a.material_index === mat && a.treatment_type === treatType)?.allocated_price_bbd ?? null)
            .filter((v): v is number => v !== null);
          if (!vals.length) return null;
          return vals.reduce((s, v) => s + v, 0) / vals.length;
        };

        return (
          <div key={tt}>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
              {TREATMENT_LABELS[tt]}
            </div>
            <table className="w-full text-xs border-collapse border border-border">
              <thead>
                <tr style={{ background: "#1e4db7", color: "white" }}>
                  <th className="px-3 py-1.5 text-left border-r border-white/20 font-semibold">Category</th>
                  {MATERIAL_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-1.5 text-center border-r border-white/20 last:border-r-0 font-semibold">
                      {col.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <tr key={cat} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-3 py-1 font-medium border-r border-border text-foreground">{cat}</td>
                    {MATERIAL_COLUMNS.map((col) => {
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
                {/* Col averages */}
                <tr className="bg-muted/50 border-t-2 border-border">
                  <td className="px-3 py-1 text-muted-foreground italic border-r border-border text-[10px]">Col. Averages</td>
                  {MATERIAL_COLUMNS.map((col) => {
                    const avg = getColAvg(col.key, tt);
                    return (
                      <td key={col.key} className="px-3 py-1 text-right border-r border-border last:border-r-0 text-foreground">
                        {avg != null ? fmt(avg, showUSD, fxRate) : "—"}
                      </td>
                    );
                  })}
                </tr>
                {/* Delta vs Clear */}
                {tt !== "clear" && (
                  <tr className="bg-amber-50/40 dark:bg-amber-900/10 border-t border-border">
                    <td className="px-3 py-1 text-amber-700 dark:text-amber-400 italic border-r border-border text-[10px]">Δ vs Clear</td>
                    {MATERIAL_COLUMNS.map((col) => {
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

      {/* Treatments & Add-ons grouped by category (Matrix format) */}
      {addonsBySection.size > 0 && (
        <div className="space-y-3">
          {[...addonsBySection.entries()].map(([sec, rows]) => (
            <div key={sec}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                {sec}
              </div>
              <table className="w-full text-xs border-collapse border border-border">
                <thead>
                  <tr style={{ background: "#1e4db7", color: "white" }}>
                    <th className="px-3 py-1.5 text-left border-r border-white/20 font-semibold">{sec}</th>
                    <th className="px-3 py-1.5 text-right font-semibold w-28">{currency} Price</th>
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
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
          {label}
        </div>
        <table className="w-full text-xs border-collapse border border-border">
          <thead>
            <tr style={{ background: "#1e4db7", color: "white" }}>
              <th className="px-3 py-1.5 text-left border-r border-white/20 font-semibold">{label}</th>
              <th className="px-3 py-1.5 text-right font-semibold w-24">{currency} Price</th>
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

    return (
      <div className="space-y-5">
        {!hasContent ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No list catalog rows yet. Add lenses in the Price Matrix tab.
          </p>
        ) : (
          <>
            {/* Lens sections grouped by section name (category), NOT treatment type */}
            {[...lensSections.entries()].map(([sec, rows]) => (
              <SectionTable
                key={sec}
                label={sec}
                rows={[...rows].sort((a, b) => a.sort_order - b.sort_order)}
              />
            ))}

            {/* Treatments & Add-ons grouped by category */}
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
