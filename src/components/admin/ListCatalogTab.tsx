import { useMemo, useRef } from "react";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { useMaterialUpgrades, usePricelistNotes } from "@/hooks/useMaterialUpgrades";
import { useAddons } from "@/hooks/useAddons";
import { useLenses } from "@/hooks/useLenses";
import { useBBDUSDRate } from "@/hooks/usePricelistVersions";
import { Button } from "@/components/ui/button";
import { FileText, Table2, FileSpreadsheet, Globe, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const BLUE_BG = "#1e4db7";
const GREEN_BG = "#d4edda";
const BLUE_TEXT = "#fff";
const GREEN_TEXT = "#155724";
const LABEL = "hsl(215 15% 40%)";
const PAGE_NOTE = "This is a standard catalog showing lenses inclusive of edging and freight.";

interface CatalogRow {
  description: string;
  bbd: number | null;
  usd: number | null;
  margin: number | null;
  section: string;
  isHeader?: boolean;
}

interface ListCatalogTabProps {
  fxRate: number;
  showUSD: boolean;
}

function buildCatalogRows(
  matrixRows: any[],
  upgrades: any[],
  addons: any[],
  lenses: any[],
  fxRate: number
): CatalogRow[] {
  const rows: CatalogRow[] = [];

  // Helper: get lenses with show_in_pricelist=true, grouped by category
  // For the list, use lenses sell_price where show_in_pricelist=true
  const plLenses = lenses.filter((l) => l.show_in_pricelist);

  // Build category groups from lenses + matrix
  const matrixCats = [...new Set(matrixRows.map((r) => r.category))];

  const SECTIONS: Array<{ title: string; filter: (cat: string) => boolean }> = [
    { title: "Single Vision Regular", filter: (c) => /single|sv/i.test(c) },
    { title: "FT Regular", filter: (c) => /flat|ft|bifocal|kryptok/i.test(c) },
    { title: "Progressive Regular", filter: (c) => /prog|varifocal/i.test(c) },
  ];

  const usedCats = new Set<string>();

  for (const sec of SECTIONS) {
    const cats = matrixCats.filter(sec.filter);
    if (cats.length === 0) continue;

    rows.push({ section: sec.title, description: sec.title, bbd: null, usd: null, margin: null, isHeader: true });

    for (const cat of cats) {
      usedCats.add(cat);
      const matRow = matrixRows.find((r) => r.category === cat);
      if (!matRow) continue;

      // Try lenses matching category first
      const matchingLenses = plLenses.filter(
        (l) =>
          l.pricing_category === cat ||
          (l.name && l.name.toLowerCase().includes(cat.toLowerCase().split(" ")[0]))
      );

      const INDEX_COLS = [
        { key: "index_1_50", label: "1.50" },
        { key: "index_1_53", label: "1.53" },
        { key: "index_1_59", label: "1.59" },
        { key: "index_1_60", label: "1.60" },
        { key: "index_1_67", label: "1.67" },
        { key: "index_1_74", label: "1.74" },
      ];

      for (const col of INDEX_COLS) {
        const matrixPrice = (matRow as any)[col.key];
        if (!matrixPrice) continue;

        // Find lens match
        const lens = matchingLenses.find((l) => Math.abs(l.index_value - parseFloat(col.label)) < 0.01);
        const bbd = lens ? lens.sell_price : matrixPrice;
        const usd = bbd * fxRate;
        const cost = lens ? lens.base_price * 2 : matrixPrice * 0.6; // rough margin calc
        const margin = bbd > 0 ? ((bbd - cost) / bbd) * 100 : null;

        rows.push({
          section: sec.title,
          description: `${cat} ${col.label}`,
          bbd,
          usd,
          margin: margin !== null ? parseFloat(margin.toFixed(1)) : null,
        });

        // Add upgrade rows for each index
        const relevantUpgrades = upgrades.filter(
          (u) =>
            (u.material === col.label || u.material === "1.50") &&
            u.full_price_bbd !== null
        );
        for (const upg of relevantUpgrades) {
          const upgBbd = upg.full_price_bbd + (matrixPrice ?? 0);
          rows.push({
            section: sec.title,
            description: `  ↳ ${upg.upgrade_name} ${col.label}`,
            bbd: upg.full_price_bbd,
            usd: upg.full_price_bbd * fxRate,
            margin: null,
          });
        }
      }
    }
  }

  // Remaining matrix cats (not matched by section filters)
  const otherCats = matrixCats.filter((c) => !usedCats.has(c));
  if (otherCats.length > 0) {
    rows.push({ section: "Other", description: "Other", bbd: null, usd: null, margin: null, isHeader: true });
    for (const cat of otherCats) {
      const matRow = matrixRows.find((r) => r.category === cat);
      if (!matRow) continue;
      const INDEX_COLS = [
        { key: "index_1_50", label: "1.50" },
        { key: "index_1_53", label: "1.53" },
        { key: "index_1_59", label: "1.59" },
        { key: "index_1_60", label: "1.60" },
        { key: "index_1_67", label: "1.67" },
        { key: "index_1_74", label: "1.74" },
      ];
      for (const col of INDEX_COLS) {
        const bbd = (matRow as any)[col.key];
        if (!bbd) continue;
        rows.push({
          section: "Other",
          description: `${cat} ${col.label}`,
          bbd,
          usd: bbd * fxRate,
          margin: null,
        });
      }
    }
  }

  // Treatments section
  const treatments = addons.filter((a) => a.is_active && /treat|coat|hmc|ar|uv|tint|mirr/i.test(a.category + " " + a.name));
  if (treatments.length > 0) {
    rows.push({ section: "Treatments", description: "Treatments", bbd: null, usd: null, margin: null, isHeader: true });
    for (const a of treatments) {
      rows.push({
        section: "Treatments",
        description: a.name + (a.description ? ` — ${a.description}` : ""),
        bbd: a.price,
        usd: a.price * fxRate,
        margin: a.cost > 0 ? parseFloat((((a.price - a.cost) / a.price) * 100).toFixed(1)) : null,
      });
    }
  }

  // ADD ONS section
  const addOnItems = addons.filter((a) => a.is_active && !treatments.includes(a));
  if (addOnItems.length > 0) {
    rows.push({ section: "ADD ONS", description: "ADD ONS", bbd: null, usd: null, margin: null, isHeader: true });
    for (const a of addOnItems) {
      rows.push({
        section: "ADD ONS",
        description: a.name + (a.description ? ` — ${a.description}` : ""),
        bbd: a.price,
        usd: a.price * fxRate,
        margin: a.cost > 0 ? parseFloat((((a.price - a.cost) / a.price) * 100).toFixed(1)) : null,
      });
    }
  }

  return rows;
}

const ListCatalogTab = ({ fxRate, showUSD }: ListCatalogTabProps) => {
  const { data: matrixRows = [], isLoading: mLoading } = usePriceMatrix();
  const { data: upgrades = [] } = useMaterialUpgrades();
  const { data: addons = [] } = useAddons();
  const { data: lenses = [] } = useLenses();
  const { data: notes = [] } = usePricelistNotes();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => buildCatalogRows(matrixRows, upgrades, addons as any, lenses as any, fxRate),
    [matrixRows, upgrades, addons, lenses, fxRate]
  );

  const sections = [...new Set(rows.filter((r) => r.isHeader).map((r) => r.section))];

  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["Custom Catalog 2025", "", "", ""],
      ["Description", "BBD $ COST", "USD $ COST", "Margin %"],
      ...rows
        .filter((r) => !r.isHeader)
        .map((r) => [
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
      ...rows
        .filter((r) => !r.isHeader)
        .map((r) =>
          [
            `"${r.description}"`,
            r.bbd ?? "",
            r.usd !== null ? r.usd.toFixed(2) : "",
            r.margin ?? "",
          ].join(",")
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

  const handlePDFPrint = () => {
    window.print();
    toast({ title: "Print dialog opened" });
  };

  if (mLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = format(new Date(), "dd MMMM yyyy");

  return (
    <div className="space-y-4">
      {/* Export Bar */}
      <div className="flex items-center gap-2 flex-wrap no-print">
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 font-semibold"
          style={{ background: BLUE_BG, color: "white" }}
          onClick={handlePDFPrint}
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

      {/* Pricelist Notes (top) */}
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

      {/* Catalog Body — printable */}
      <div ref={printRef} className="catalog-print-area space-y-0">
        {/* Header */}
        <div
          className="px-6 py-5 text-center border-b-4 print-header"
          style={{ borderColor: BLUE_BG, background: "hsl(215 20% 98%)" }}
        >
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BLUE_BG }}>
            Custom Catalog 2025
          </h1>
          <p className="text-sm mt-1" style={{ color: LABEL }}>
            {today}
          </p>
          <p className="text-xs mt-2 italic" style={{ color: LABEL }}>
            {PAGE_NOTE}
          </p>
        </div>

        {/* Sections */}
        {sections.map((section) => {
          const sectionRows = rows.filter((r) => r.section === section && !r.isHeader);
          if (sectionRows.length === 0) return null;
          return (
            <div key={section} className="mt-6 px-2">
              {/* Section heading */}
              <div
                className="px-4 py-2 rounded-sm mb-1 font-bold text-sm"
                style={{ background: BLUE_BG, color: "white" }}
              >
                {section}
              </div>

              {/* Table */}
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
                  </tr>
                </thead>
                <tbody>
                  {sectionRows.map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "" : ""}
                      style={{ background: i % 2 === 0 ? "white" : "hsl(215 20% 98%)" }}
                    >
                      <td
                        className="px-3 py-1.5 border border-slate-200"
                        style={{
                          color: "hsl(215 30% 15%)",
                          fontStyle: row.description.startsWith("  ↳") ? "italic" : "normal",
                        }}
                      >
                        {row.description.replace("  ↳ ", "↳ ")}
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
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Page note */}
              <p className="text-[10px] italic mt-2 px-1" style={{ color: LABEL }}>
                {PAGE_NOTE}
              </p>
            </div>
          );
        })}

        {/* Bottom notes */}
        {notes.filter((n) => n.section !== "top").length > 0 && (
          <div className="mt-6 px-2 space-y-2">
            <div
              className="px-4 py-2 rounded-sm font-bold text-sm"
              style={{ background: "hsl(215 30% 25%)", color: "white" }}
            >
              Notes & Information
            </div>
            {notes
              .filter((n) => n.section !== "top")
              .map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-2 rounded border border-border text-xs"
                  style={{ color: LABEL }}
                >
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
    </div>
  );
};

export default ListCatalogTab;
