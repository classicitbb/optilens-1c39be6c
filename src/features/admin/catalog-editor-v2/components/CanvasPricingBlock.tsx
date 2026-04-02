import { useMemo } from "react";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";

const SECTION_TO_CATALOG_TYPE: Record<string, "rx" | "stock" | "buysell"> = {
  rx_prices: "rx",
  stock_prices: "stock",
  supplies_prices: "buysell",
};

const SECTION_LABEL: Record<string, string> = {
  rx_prices: "RX Prices",
  stock_prices: "Stock Prices",
  supplies_prices: "Supplies Prices",
};

interface Props {
  pricelist_version_id: number | null;
  section_type: string;
  custom_title?: string;
}

const CanvasPricingBlock = ({ pricelist_version_id, section_type, custom_title }: Props) => {
  const catalogType = SECTION_TO_CATALOG_TYPE[section_type] ?? "rx";
  const { data: rows = [], isLoading } = usePricelistCatalogRows(
    pricelist_version_id,
    catalogType,
  );

  const label = SECTION_LABEL[section_type] ?? "Prices";
  const title = custom_title || label;

  const sections = useMemo(() => {
    const map = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const key = row.section || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return map;
  }, [rows]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border bg-background">
      <div className="shrink-0 border-b px-3 py-2">
        <span className="mb-1 inline-flex h-4 items-center rounded px-1.5 text-[9px] font-medium bg-primary/10 text-primary">
          {label}
        </span>
        <div className="text-[10px] font-medium leading-tight">{title}</div>
        {!pricelist_version_id && (
          <div className="mt-0.5 text-[8.5px] text-muted-foreground">No pricelist assigned</div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-3">
          <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-3 py-2 text-[8.5px] text-muted-foreground">
          {pricelist_version_id ? "No rows in this pricelist." : "Assign a pricelist version to see data."}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {Array.from(sections.entries()).map(([sectionName, sectionRows]) => (
            <div key={sectionName}>
              {sections.size > 1 && (
                <div className="bg-muted/40 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {sectionName}
                </div>
              )}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border bg-muted p-1 text-left text-[9px] font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="w-16 border bg-muted p-1 text-right text-[9px] font-medium text-muted-foreground">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sectionRows.map((row, i) => (
                    <tr key={row.id ?? i} className={i % 2 !== 0 ? "bg-muted/30" : undefined}>
                      <td className="border p-1 text-[9px]">{row.display_description}</td>
                      <td className="border p-1 text-right font-mono text-[9px] text-primary">
                        {row.bbd_price != null ? `$${row.bbd_price.toFixed(2)}` : "—"}
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

export default CanvasPricingBlock;
