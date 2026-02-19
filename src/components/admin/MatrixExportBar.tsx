import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Table2, FileSpreadsheet, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePriceMatrix, INDEX_COLUMNS } from "@/hooks/usePriceMatrix";
import * as XLSX from "xlsx";
import { format } from "date-fns";

const BLUE_BG = "#1e4db7";

interface MatrixExportBarProps {
  showUSD: boolean;
  fxRate: number;
}

const MatrixExportBar = ({ showUSD, fxRate }: MatrixExportBarProps) => {
  const { data: rows = [] } = usePriceMatrix();
  const { toast } = useToast();
  const today = format(new Date(), "dd MMMM yyyy");

  const getDisplayVal = (val: number | null) => {
    if (val === null) return "";
    const v = showUSD ? val * fxRate : val;
    return parseFloat(v.toFixed(2));
  };

  const handleExcel = () => {
    const header = ["Category", ...INDEX_COLUMNS.map((c) => `${c.label} (${showUSD ? "USD" : "BBD"})`)];
    const data = [
      [`Price Matrix — ${today}`, ...Array(INDEX_COLUMNS.length).fill("")],
      header,
      ...rows.map((r) => [r.category, ...INDEX_COLUMNS.map((c) => getDisplayVal((r as any)[c.key]))]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matrix");
    XLSX.writeFile(wb, "PriceMatrix.xlsx");
    toast({ title: "Excel exported" });
  };

  const handleCSV = () => {
    const lines = [
      ["Category", ...INDEX_COLUMNS.map((c) => `${c.label} (${showUSD ? "USD" : "BBD"})`)].join(","),
      ...rows.map((r) =>
        [r.category, ...INDEX_COLUMNS.map((c) => getDisplayVal((r as any)[c.key]))].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PriceMatrix.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const handleHTML = () => {
    const cols = INDEX_COLUMNS.map((c) => `${c.label}`).join("</th><th>");
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${r.category}</td>${INDEX_COLUMNS.map(
            (c) => `<td style="text-align:right">${getDisplayVal((r as any)[c.key]) || "—"}</td>`
          ).join("")}</tr>`
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Price Matrix</title>
<style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 8px}th{background:#1e4db7;color:#fff}</style>
</head><body><h2>Price Matrix — ${today} (${showUSD ? "USD" : "BBD"})</h2>
<table><thead><tr><th>Category</th><th>${cols}</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PriceMatrix.html";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "HTML exported" });
  };

  const handlePDF = () => {
    window.print();
    toast({ title: "Print dialog opened" });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap no-print">
      <Button
        size="sm"
        className="h-8 text-xs gap-1.5 font-semibold"
        style={{ background: BLUE_BG, color: "white" }}
        onClick={handlePDF}
      >
        <FileText className="h-3.5 w-3.5" />
        Export PDF
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExcel}>
        <Table2 className="h-3.5 w-3.5" />
        Export Excel
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCSV}>
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleHTML}>
        <Globe className="h-3.5 w-3.5" />
        Export HTML
      </Button>
    </div>
  );
};

export default MatrixExportBar;
