import { useMemo } from "react";
import { format } from "date-fns";
import { useMatrixAllocations, MATERIAL_COLUMNS } from "@/hooks/useMatrixAllocations";
import { usePricelistCatalogRows, type PricelistCatalogRow } from "@/hooks/usePricelistCatalogRows";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PricelistVersion } from "@/hooks/usePricelistVersions";
import { usePriceHierarchy } from "@/hooks/usePriceHierarchy";
import { compareCategoryOrder, compareMaterialOrder } from "@/lib/sortOrder";
import { preparePrintListChunks, type PrintListSection } from "@/features/admin/print/printLayout";
import { useRxPricingStructure } from "@/hooks/useRxPricingStructure";
import { buildMatrixSectionLabel, parseMatrixRowKey } from "@/features/admin/rx-pricing/structure";
import { useLenses } from "@/hooks/useLenses";
import { resolveCatalogRowPreviewPriceBbd } from "@/lib/pricelistPreviewPricing";

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
  showSummaryRows?: boolean;
  liveCatalogRows?: Omit<PricelistCatalogRow, "id">[] | null;
}

const fmtDisplay = (value: number | null | undefined, showUSD: boolean, fxRate: number) => {
  if (value == null) return "—";
  const converted = showUSD ? value * fxRate : value;
  return `$${converted.toFixed(2)}`;
};

const normalizeFinishLabel = (finishType?: string | null) => {
  const normalized = (finishType ?? "").trim();
  if (!normalized) return "Unspecified";
  return normalized
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("-");
};

const PricelistLivePreview = ({ version, previewFormat, showUSD, fxRate, catalogType = "rx", showSummaryRows = true, liveCatalogRows = null }: Props) => {
  const { data: allocations = [] } = useMatrixAllocations(version.id);
  const { data: allCatalogRows = [] } = usePricelistCatalogRows(version.id, catalogType);
  const { data: allLenses = [] } = useLenses();
  const { data: company } = useCompanySettings();
  const { calcFinalPrice, lineOverrides } = usePriceHierarchy(version.id);
  const { structure: rxStructure } = useRxPricingStructure(version.id);

  const resolvedCatalogRows = liveCatalogRows ?? allCatalogRows;

  const catalogRows = useMemo(() => {
    if (catalogType === "buysell") return resolvedCatalogRows.filter((row) => row.row_type === "supply");
    return resolvedCatalogRows.filter((row) => row.row_type === "lens");
  }, [resolvedCatalogRows, catalogType]);

  const addonRows = useMemo(() => {
    if (catalogType === "buysell") return resolvedCatalogRows.filter((row) => ["addon", "treatment"].includes(row.row_type)).sort((a, b) => a.sort_order - b.sort_order);
    return resolvedCatalogRows.filter((row) => ["addon", "treatment", "supply"].includes(row.row_type)).sort((a, b) => a.sort_order - b.sort_order);
  }, [resolvedCatalogRows, catalogType]);

  const addonsBySection = useMemo(() => {
    const map = new Map<string, typeof addonRows>();
    addonRows.forEach((row) => {
      const section = row.section || "Other";
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(row);
    });
    return map;
  }, [addonRows]);

  const lensFinishById = useMemo(() => {
    const map = new Map<string, string>();
    allLenses.forEach((lens) => {
      map.set(lens.id, normalizeFinishLabel(lens.finishtype?.name ?? null));
    });
    return map;
  }, [allLenses]);

  const categoryMetaMap = useMemo(
    () => new Map(rxStructure.flatMap((grouping) => grouping.categories.map((category) => [`${grouping.key}::${category.key}`, { grouping, category }] as const))),
    [rxStructure]
  );

  const categoryOrderMap = useMemo(() => {
    const order = new Map<string, number>();
    let orderIndex = 0;
    rxStructure.forEach((grouping) => {
      grouping.categories.forEach((category) => {
        const existing = order.get(category.name);
        const nextIndex = orderIndex++;
        if (existing == null || nextIndex < existing) {
          order.set(category.name, nextIndex);
        }
      });
    });
    return order;
  }, [rxStructure]);

  const today = format(new Date(), "dd MMMM yyyy");
  const currency = showUSD ? "USD" : "BBD";

  const hierarchyMatrixPrice = (allocPrice: number | null, allocId?: string) => {
    const finalBbd = calcFinalPrice(allocPrice, version, catalogType, allocId, "matrix_allocation");
    return fmtDisplay(finalBbd, showUSD, fxRate);
  };

  const hierarchyCatalogPrice = (row: { bbd_price: number | null; row_type: string; item_id?: string | null | undefined }) => {
    const finalBbd = resolveCatalogRowPreviewPriceBbd(row as Pick<PricelistCatalogRow, "bbd_price" | "row_type" | "item_id">, lineOverrides);
    return fmtDisplay(finalBbd, showUSD, fxRate);
  };

  const hierarchyMatrixNum = (allocPrice: number | null, allocId?: string): number | null => calcFinalPrice(allocPrice, version, catalogType, allocId, "matrix_allocation");

  const matrixGroups = rxStructure;

  const listSections = useMemo(() => {
    if (catalogType === "stock") {
      const grouped = new Map<string, typeof catalogRows>();
      catalogRows.forEach((row) => {
        const mfType = row.section || "Standard";
        const finishType = row.item_id ? lensFinishById.get(row.item_id) ?? "Unspecified" : "Unspecified";
        const sectionLabel = `${mfType}-${finishType}`;
        if (!grouped.has(sectionLabel)) grouped.set(sectionLabel, []);
        grouped.get(sectionLabel)!.push(row);
      });
      return [...grouped.entries()].sort((a, b) => compareCategoryOrder(a[0], b[0]));
    }

    if (catalogType === "buysell") {
      const grouped = new Map<string, typeof catalogRows>();
      catalogRows.forEach((row) => {
        const sectionLabel = row.section?.trim() || "Uncategorized";
        if (!grouped.has(sectionLabel)) grouped.set(sectionLabel, []);
        grouped.get(sectionLabel)!.push(row);
      });
      return [...grouped.entries()].sort((a, b) => compareCategoryOrder(a[0], b[0]));
    }

    const grouped = new Map<string, typeof catalogRows>();
    rxStructure.forEach((grouping) => {
      grouping.categories.forEach((category) => {
        if (!grouped.has(category.name)) grouped.set(category.name, []);
      });
    });

    catalogRows.forEach((row) => {
      const parsed = parseMatrixRowKey(row.row_key);
      const meta = parsed ? categoryMetaMap.get(`${parsed.groupKey}::${parsed.categoryKey}`) : null;
      const derivedSection = row.section.split(" — ").slice(1).join(" — ").trim();
      const categoryName = meta?.category.name ?? (derivedSection || row.section || "Uncategorized");
      if (!grouped.has(categoryName)) grouped.set(categoryName, []);
      grouped.get(categoryName)!.push({ ...row, section: meta ? buildMatrixSectionLabel(meta.grouping.name, meta.category.name) : row.section });
    });

    return [...grouped.entries()].sort((a, b) => {
      const aIndex = categoryOrderMap.get(a[0]);
      const bIndex = categoryOrderMap.get(b[0]);
      if (aIndex != null && bIndex != null) return aIndex - bIndex;
      if (aIndex != null) return -1;
      if (bIndex != null) return 1;
      return compareCategoryOrder(a[0], b[0]);
    });
  }, [catalogRows, catalogType, categoryMetaMap, categoryOrderMap, rxStructure, lensFinishById]);

  const MatrixPreview = () => (
    <div className={catalogType === "rx" ? "space-y-4" : "space-y-6"}>
      {matrixGroups.map((grouping) => {
        const useCompactMatrixStyles = catalogType === "rx";
        const visibleCols = MATERIAL_COLUMNS.filter((column) =>
          allocations.some((allocation) => allocation.treatment_type === grouping.key && allocation.material_index === column.key && allocation.allocated_price_bbd != null)
        );
        const sortedCols = (visibleCols.length ? visibleCols : MATERIAL_COLUMNS).slice().sort((a, b) => compareMaterialOrder(a.key, b.key));
        const activeCategories = grouping.categories.filter((category) =>
          sortedCols.some((column) => allocations.some((allocation) => allocation.treatment_type === grouping.key && allocation.category === category.key && allocation.material_index === column.key && allocation.allocated_price_bbd != null)) || grouping.key === "clear"
        );
        if (!activeCategories.length && grouping.key !== "clear") return null;

        const getColAvg = (material: string, groupKey: string) => {
          const values = activeCategories
            .map((category) => {
              const allocation = allocations.find((entry) => entry.treatment_type === groupKey && entry.category === category.key && entry.material_index === material);
              return hierarchyMatrixNum(allocation?.allocated_price_bbd ?? null, allocation?.id ? String(allocation.id) : undefined);
            })
            .filter((value): value is number => value !== null);
          if (!values.length) return null;
          return values.reduce((sum, value) => sum + value, 0) / values.length;
        };

        return (
          <div key={grouping.id} className="print-grid-keep">
            <table className="w-full border-collapse" style={{ tableLayout: "auto", fontSize: useCompactMatrixStyles ? "12px" : undefined }}>
              <thead>
                <tr>
                  <th
                    className={`px-4 text-left font-bold uppercase ${useCompactMatrixStyles ? "py-1.5 tracking-wide" : "py-2.5 tracking-wider text-sm"}`}
                    style={{ background: "#1e4db7", color: "white", borderBottom: "none", lineHeight: useCompactMatrixStyles ? 1.2 : undefined, fontSize: useCompactMatrixStyles ? "12px" : undefined }}
                  >
                    {grouping.name}
                  </th>
                  {sortedCols.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 text-center font-bold uppercase ${useCompactMatrixStyles ? "py-1.5 tracking-wide" : "py-2.5 tracking-wider"}`}
                      style={{ background: "#1e4db7", color: "white", minWidth: "90px", borderBottom: "none", lineHeight: useCompactMatrixStyles ? 1.2 : undefined, fontSize: useCompactMatrixStyles ? "11px" : undefined }}
                    >
                      {column.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeCategories.map((category) => (
                  <tr key={category.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td className={`px-4 font-medium ${useCompactMatrixStyles ? "py-1.5" : "py-2"}`} style={{ color: "#1a202c", lineHeight: useCompactMatrixStyles ? 1.25 : undefined }}>{category.name}</td>
                    {sortedCols.map((column) => {
                      const allocation = allocations.find((entry) => entry.treatment_type === grouping.key && entry.category === category.key && entry.material_index === column.key);
                      return (
                        <td key={column.key} className={`px-3 text-right font-semibold ${useCompactMatrixStyles ? "py-1.5" : "py-2"}`} style={{ color: "#1a202c", lineHeight: useCompactMatrixStyles ? 1.25 : undefined }}>
                          {allocation?.allocated_price_bbd != null ? hierarchyMatrixPrice(allocation.allocated_price_bbd, allocation.id ? String(allocation.id) : undefined) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {showSummaryRows && (
                  <tr style={{ borderTop: "2px solid #cbd5e0", background: "#f7fafc" }}>
                    <td className={`px-4 italic text-xs ${useCompactMatrixStyles ? "py-1.5" : "py-2"}`} style={{ color: "#718096", lineHeight: useCompactMatrixStyles ? 1.25 : undefined }}>Col. Averages</td>
                    {sortedCols.map((column) => {
                      const avg = getColAvg(column.key, grouping.key);
                      return <td key={column.key} className={`px-3 text-right italic ${useCompactMatrixStyles ? "py-1.5" : "py-2"}`} style={{ color: "#4a5568", lineHeight: useCompactMatrixStyles ? 1.25 : undefined }}>{avg != null ? fmtDisplay(avg, showUSD, fxRate) : "—"}</td>;
                    })}
                  </tr>
                )}
                {showSummaryRows && grouping.key !== "clear" && (
                  <tr style={{ background: "#fffbeb", borderTop: "1px solid #e2e8f0" }}>
                    <td className={`px-4 italic text-xs ${useCompactMatrixStyles ? "py-1.5" : "py-2"}`} style={{ color: "#b7791f", lineHeight: useCompactMatrixStyles ? 1.25 : undefined }}>Δ vs Clear</td>
                    {sortedCols.map((column) => {
                      const treatAvg = getColAvg(column.key, grouping.key);
                      const clearAvg = getColAvg(column.key, "clear");
                      const delta = treatAvg != null && clearAvg != null ? treatAvg - clearAvg : null;
                      return <td key={column.key} className={`px-3 text-right font-semibold text-xs ${useCompactMatrixStyles ? "py-1.5" : "py-2"}`} style={{ color: delta == null ? "#a0aec0" : delta > 0 ? "#38a169" : "#e53e3e", lineHeight: useCompactMatrixStyles ? 1.25 : undefined }}>{delta != null ? `${delta > 0 ? "+" : ""}${fmtDisplay(delta, showUSD, fxRate)}` : "—"}</td>;
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}

      {addonsBySection.size > 0 && (
        <div className="space-y-4 print-grid-keep">
          {[...addonsBySection.entries()].map(([section, rows]) => (
            <div key={section} className="print-avoid-break print-grid-keep">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-sm" style={{ background: "#1e4db7", color: "white" }}>{section}</th>
                    <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider w-32" style={{ background: "#1e4db7", color: "white" }}>{currency} PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={"id" in row ? (row as any).id ?? row.row_key : row.row_key} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td className="px-4 py-2" style={{ color: "#1a202c" }}>{row.display_description}</td>
                      <td className="px-4 py-2 text-right font-semibold" style={{ color: "#1a202c" }}>{hierarchyCatalogPrice(row)}</td>
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

  const ListPreview = () => {
    const SectionTable = ({ label, rows, pageBreakBefore, isContinuation }: { label: string; rows: typeof catalogRows; pageBreakBefore?: boolean; isContinuation?: boolean }) => (
      <div className={`print-avoid-break print-grid-keep${pageBreakBefore ? " print-page-break-before" : ""}`}>
        <table className="w-full border-collapse" style={{ fontSize: "13px" }}>
          <thead>
            <tr>
              <th
                colSpan={2}
                className="px-4 py-1.5 text-left font-bold uppercase tracking-wide"
                style={{ background: "#1e4db7", color: "white", fontSize: "12px", lineHeight: 1.2 }}
              >
                {label}
                {isContinuation ? " (cont.)" : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={"id" in row ? String((row as any).id ?? row.row_key) : row.row_key} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td className="px-4 py-1.5" style={{ color: "#1a202c", lineHeight: 1.25 }}>{row.display_description}</td>
                <td className="px-4 py-1.5 text-right font-semibold w-32" style={{ color: "#1a202c", lineHeight: 1.25 }}>{hierarchyCatalogPrice(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    const lensListSections: PrintListSection<(typeof catalogRows)[number]>[] = listSections.map(([section, rows]) => ({
      key: `lens-${section}`,
      label: section,
      rows: rows,
    }));
    const addonListSections: PrintListSection<(typeof catalogRows)[number]>[] = [...addonsBySection.entries()].map(([section, rows]) => ({ key: `addon-${section}`, label: section, rows }));
    const listChunks = preparePrintListChunks([...lensListSections, ...addonListSections], { rowsPerPage: 20, minSplitThreshold: 5 });

    const hasLensContent = lensListSections.some((s) => s.rows.length > 0);
    const hasAddonContent = addonListSections.length > 0;

    return (
      <div className="space-y-4">
        {!hasLensContent && !hasAddonContent && <p className="text-xs text-muted-foreground text-center py-6">No price list rows yet. Add lenses in the Price Matrix Editor tab.</p>}
        {!hasLensContent && hasAddonContent && <p className="text-xs text-muted-foreground text-center py-4">No lens rows yet.</p>}
        {listChunks.map((chunk) => <SectionTable key={chunk.key} label={chunk.label} rows={chunk.rows} pageBreakBefore={chunk.pageBreakBefore} isContinuation={chunk.isContinuation} />)}
      </div>
    );
  };

  return (
    <div className="print-preview-container space-y-4 p-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a202c", background: "#ffffff" }}>
      <div className="flex items-start justify-between pb-4" style={{ borderBottom: "2px solid #e2e8f0" }}>
        <div className="flex-1 text-center">
          <h1 className="font-bold tracking-wide uppercase print-keep-with-next" style={{ fontSize: "20px", letterSpacing: "1.8px", color: "#1a202c" }}>
            {CATALOG_TITLES[catalogType] ?? "PRICE LIST"}
          </h1>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs" style={{ color: "#4a5568" }}>{previewFormat === "matrix" ? "Matrix Format" : "List Format"} · {today}</p>
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
