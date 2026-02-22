import { useMatrixAllocations, MATERIAL_COLUMNS, TREATMENT_TYPES, TreatmentType } from "@/hooks/useMatrixAllocations";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLenses } from "@/hooks/useLenses";
import { PricelistVersion } from "@/hooks/usePricelistVersions";
import { Button } from "@/components/ui/button";
import { FileText, Table2, FileSpreadsheet, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const TREATMENT_LABELS: Record<TreatmentType, string> = {
  clear: "Clear Lenses",
  transitions: "Transitions",
  photochromic: "Photochromic",
  polarized: "Polarized",
  bluefilter: "Bluefilter",
};

interface Props {
  version: PricelistVersion;
  showUSD: boolean;
  fxRate: number;
}

const fmt = (val: number | null | undefined, showUSD: boolean, fxRate: number) => {
  if (val == null) return "";
  const v = showUSD ? val * fxRate : val;
  return parseFloat(v.toFixed(2));
};

const RxExportBar = ({ version, showUSD, fxRate }: Props) => {
  const { data: allocations = [] } = useMatrixAllocations(version.id);
  const { data: matrixRows = [] } = usePriceMatrix();
  const { data: catalogRows = [] } = usePricelistCatalogRows(version.id, "rx");
  const { data: company } = useCompanySettings();
  const { data: allLenses = [] } = useLenses();
  const { toast } = useToast();

  const currency = showUSD ? "USD" : (version.base_currency ?? "BBD");
  const today = format(new Date(), "dd MMMM yyyy");
  const categories = [...new Set(matrixRows.map((r) => r.category))];

  const companyHeader = [
    company?.company_name ?? "",
    company?.slogan ?? "",
    `${company?.tel ?? ""} | ${company?.email ?? ""}`,
    `${version.name} — ${today} (${currency})`,
  ];

  // ── Matrix Excel ─────────────────────────────────────────────────────────────
  const exportMatrixExcel = () => {
    const aoa: any[][] = [];
    companyHeader.forEach((h) => aoa.push([h]));
    aoa.push([]);

    TREATMENT_TYPES.forEach((tt) => {
      const ttAllocs = allocations.filter((a) => a.treatment_type === tt);
      if (tt !== "clear" && !ttAllocs.length) return;

      aoa.push([TREATMENT_LABELS[tt]]);
      aoa.push(["Category", ...MATERIAL_COLUMNS.map((c) => c.key)]);

      categories.forEach((cat) => {
        const row = [cat];
        MATERIAL_COLUMNS.forEach((col) => {
          const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
          row.push(fmt(alloc?.allocated_price_bbd, showUSD, fxRate) as any);
        });
        aoa.push(row);
      });

      // Col averages
      const avgRow = ["Col. Averages"];
      MATERIAL_COLUMNS.forEach((col) => {
        const vals = categories.map((cat) => allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt)?.allocated_price_bbd ?? null).filter((v): v is number => v !== null);
        avgRow.push(vals.length ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)) as any : "");
      });
      aoa.push(avgRow);

      // Delta
      if (tt !== "clear") {
        const deltaRow = ["Δ vs Clear"];
        MATERIAL_COLUMNS.forEach((col) => {
          const treatVals = categories.map((cat) => allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt)?.allocated_price_bbd ?? null).filter((v): v is number => v !== null);
          const clearVals = categories.map((cat) => allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === "clear")?.allocated_price_bbd ?? null).filter((v): v is number => v !== null);
          const treatAvg = treatVals.length ? treatVals.reduce((s, v) => s + v, 0) / treatVals.length : null;
          const clearAvg = clearVals.length ? clearVals.reduce((s, v) => s + v, 0) / clearVals.length : null;
          deltaRow.push(treatAvg != null && clearAvg != null ? parseFloat((treatAvg - clearAvg).toFixed(2)) as any : "");
        });
        aoa.push(deltaRow);
      }

      aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matrix");
    XLSX.writeFile(wb, `${version.name}_Matrix.xlsx`);
    toast({ title: "Matrix Excel exported" });
  };

  // ── Matrix CSV ───────────────────────────────────────────────────────────────
  const exportMatrixCSV = () => {
    const lines: string[] = [];
    companyHeader.forEach((h) => lines.push(h));
    lines.push("");

    TREATMENT_TYPES.forEach((tt) => {
      const ttAllocs = allocations.filter((a) => a.treatment_type === tt);
      if (tt !== "clear" && !ttAllocs.length) return;

      lines.push(TREATMENT_LABELS[tt]);
      lines.push(["Category", ...MATERIAL_COLUMNS.map((c) => c.key)].join(","));
      categories.forEach((cat) => {
        const vals = MATERIAL_COLUMNS.map((col) => {
          const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
          return fmt(alloc?.allocated_price_bbd, showUSD, fxRate) ?? "";
        });
        lines.push([cat, ...vals].join(","));
      });
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_Matrix.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Matrix CSV exported" });
  };

  // ── Matrix HTML ──────────────────────────────────────────────────────────────
  const exportMatrixHTML = () => {
    const sectionsHtml = TREATMENT_TYPES.map((tt) => {
      const ttAllocs = allocations.filter((a) => a.treatment_type === tt);
      if (tt !== "clear" && !ttAllocs.length) return "";
      const activeCols = MATERIAL_COLUMNS.filter((col) =>
        allocations.some((a) => a.treatment_type === tt && a.material_index === col.key && a.allocated_price_bbd != null)
      );
      if (activeCols.length === 0 && tt !== "clear") return "";
      const visibleCols = activeCols.length > 0 ? activeCols : MATERIAL_COLUMNS;
      const colHeaders = visibleCols.map((c) => `<th>${c.key}</th>`).join("");
      const rowsHtml = categories
        .filter((cat) => visibleCols.some((col) => allocations.some((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt && a.allocated_price_bbd != null)))
        .map((cat) => {
          const cells = visibleCols.map((col) => {
            const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
            return `<td style="text-align:right">${alloc?.allocated_price_bbd != null ? fmt(alloc.allocated_price_bbd, showUSD, fxRate) : "—"}</td>`;
          }).join("");
          return `<tr><td>${cat}</td>${cells}</tr>`;
        }).join("");
      return `<h3 style="color:#1e4db7;margin:20px 0 8px">${TREATMENT_LABELS[tt]}</h3>
      <table><thead><tr><th>Category</th>${colHeaders}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${version.name}</title>
<style>body{font-family:sans-serif;font-size:12px;margin:40px}h1{color:#1e4db7;margin-bottom:4px}h2{color:#444;font-size:11px;font-weight:normal;margin-bottom:2px}h3{color:#1e4db7;font-size:12px;font-weight:bold}table{border-collapse:collapse;width:100%;margin-bottom:12px}th,td{border:1px solid #ccc;padding:4px 10px}th{background:#1e4db7;color:#fff;text-align:left}tr:nth-child(even){background:#f5f7fb}footer{font-size:10px;color:#888;margin-top:24px}</style></head><body>
<h1>${company?.company_name ?? ""}</h1>
<h2>${company?.slogan ?? ""} · ${company?.tel ?? ""} · ${company?.email ?? ""}</h2>
<h2>${version.name} — ${today} (${currency})</h2>
${sectionsHtml}
<footer>All prices in ${currency}. Prices subject to change without notice.</footer>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_Matrix.html`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Matrix HTML exported" });
  };

  // ── Matrix PDF (print live preview only) ────────────────────────────────────
  const exportMatrixPDF = () => {
    document.body.classList.add("print-preview-only");
    window.print();
    document.body.classList.remove("print-preview-only");
    toast({ title: "Print dialog opened (Matrix)" });
  };

  // ── List Excel ───────────────────────────────────────────────────────────────
  const exportListExcel = () => {
    const aoa: any[][] = [];
    companyHeader.forEach((h) => aoa.push([h]));
    aoa.push([]);

    const sections = [...new Set(catalogRows.map((r) => r.section))].sort();
    sections.forEach((sec) => {
      aoa.push([sec]);
      aoa.push(["Description", `${currency} Price`]);
      catalogRows.filter((r) => r.section === sec).sort((a, b) => a.sort_order - b.sort_order).forEach((row) => {
        aoa.push([row.display_description, fmt(row.bbd_price, showUSD, fxRate) ?? ""]);
      });
      aoa.push([]);
    });

    aoa.push(["All prices in " + currency + ". Prices subject to change without notice."]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List");
    XLSX.writeFile(wb, `${version.name}_List.xlsx`);
    toast({ title: "List Excel exported" });
  };

  // ── List CSV ─────────────────────────────────────────────────────────────────
  const exportListCSV = () => {
    const lines: string[] = [];
    companyHeader.forEach((h) => lines.push(h));
    lines.push("");
    lines.push(`Description,${currency} Price`);

    const sections = [...new Set(catalogRows.map((r) => r.section))].sort();
    sections.forEach((sec) => {
      lines.push(`"${sec}"`);
      catalogRows.filter((r) => r.section === sec).sort((a, b) => a.sort_order - b.sort_order).forEach((row) => {
        lines.push([`"${row.display_description}"`, fmt(row.bbd_price, showUSD, fxRate) ?? ""].join(","));
      });
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_List.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "List CSV exported" });
  };

  // ── List HTML ────────────────────────────────────────────────────────────────
  const exportListHTML = () => {
    const sections = [...new Set(catalogRows.map((r) => r.section))].sort();
    const sectionsHtml = sections.map((sec) => {
      const rowsHtml = catalogRows
        .filter((r) => r.section === sec)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => `<tr><td>${row.display_description}</td><td style="text-align:right">${fmt(row.bbd_price, showUSD, fxRate) || "—"}</td></tr>`)
        .join("");
      return `<h3 style="color:#1e4db7;margin:20px 0 8px">${sec}</h3>
      <table><thead><tr><th>Description</th><th>Price (${currency})</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${version.name}</title>
<style>
  body{font-family:sans-serif;font-size:12px;margin:40px}
  h1{color:#1e4db7;margin-bottom:4px} h2{color:#444;font-size:11px;font-weight:normal;margin-bottom:2px}
  h3{color:#1e4db7;font-size:12px;font-weight:bold}
  table{border-collapse:collapse;width:100%;margin-bottom:12px}
  th,td{border:1px solid #ccc;padding:4px 10px}
  th{background:#1e4db7;color:#fff;text-align:left}
  tr:nth-child(even){background:#f5f7fb}
  footer{font-size:10px;color:#888;margin-top:24px}
</style></head><body>
<h1>${company?.company_name ?? ""}</h1>
<h2>${company?.slogan ?? ""} · ${company?.tel ?? ""} · ${company?.email ?? ""}</h2>
<h2>${version.name} — ${today} (${currency})</h2>
${sectionsHtml}
<footer>All prices in ${currency}. Prices subject to change without notice.</footer>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_List.html`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "List HTML exported" });
  };

  // ── List PDF (print live preview only) ───────────────────────────────────────
  const exportListPDF = () => {
    document.body.classList.add("print-preview-only");
    window.print();
    document.body.classList.remove("print-preview-only");
    toast({ title: "Print dialog opened (List)" });
  };

  const btnBase = "h-7 text-[11px] gap-1 px-2.5 font-medium";

  return (
    <div className="flex items-center gap-1.5 flex-wrap no-print">
      {/* Matrix exports */}
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pr-0.5">Matrix:</span>
      <Button size="sm" className={btnBase} style={{ background: "#1e4db7", color: "white" }} onClick={exportMatrixPDF}>
        <FileText className="h-3 w-3" /> PDF
      </Button>
      <Button variant="outline" size="sm" className={btnBase} onClick={exportMatrixExcel}>
        <Table2 className="h-3 w-3" /> Excel
      </Button>
      <Button variant="outline" size="sm" className={btnBase} onClick={exportMatrixCSV}>
        <FileSpreadsheet className="h-3 w-3" /> CSV
      </Button>
      <Button variant="outline" size="sm" className={btnBase} onClick={exportMatrixHTML}>
        <Globe className="h-3 w-3" /> HTML
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* List exports */}
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pr-0.5">List:</span>
      <Button size="sm" className={btnBase} style={{ background: "#1e4db7", color: "white" }} onClick={exportListPDF}>
        <FileText className="h-3 w-3" /> PDF
      </Button>
      <Button variant="outline" size="sm" className={btnBase} onClick={exportListExcel}>
        <Table2 className="h-3 w-3" /> Excel
      </Button>
      <Button variant="outline" size="sm" className={btnBase} onClick={exportListCSV}>
        <FileSpreadsheet className="h-3 w-3" /> CSV
      </Button>
      <Button variant="outline" size="sm" className={btnBase} onClick={exportListHTML}>
        <Globe className="h-3 w-3" /> HTML
      </Button>
    </div>
  );
};

export default RxExportBar;
