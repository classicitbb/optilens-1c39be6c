import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Table2, FileSpreadsheet, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePriceMatrix, INDEX_COLUMNS } from "@/hooks/usePriceMatrix";
import { writeAoaWorkbook } from "@/lib/excelExport";
import { format } from "date-fns";

const BLUE_BG = "#1e4db7";
const STANDARD_FOOTER = "Prices subject to change without notice. All prices in BBD unless otherwise stated.";

interface MatrixExportBarProps {
  showUSD: boolean;
  fxRate: number;
}

const MatrixExportBar = ({ showUSD, fxRate }: MatrixExportBarProps) => {
  const { data: rows = [] } = usePriceMatrix();
  const { data: company } = useCompanySettings();
  const { toast } = useToast();
  const today = format(new Date(), "dd MMMM yyyy");
  const currency = showUSD ? "USD" : "BBD";

  const companyName = company?.company_name ?? "Classic Visions";
  const tagline = "Helping People See Better";
  const phone = "+1 246 433-4928";
  const website = "www.classicvisions.net";
  const versionTitle = `${companyName} Price Matrix — ${today} (${currency})`;
  const logoUrl = company?.logo_url ?? null;

  const companyHeader = [companyName, tagline, `Phone: ${phone}  |  ${website}`, versionTitle];

  const getDisplayVal = (val: number | null) => {
    if (val === null) return "";
    const v = showUSD ? val * fxRate : val;
    return parseFloat(v.toFixed(2));
  };

  const handleExcel = () => {
    const data: any[][] = [];
    companyHeader.forEach((h) => data.push([h]));
    data.push([]);
    data.push(["Price Matrix", ...INDEX_COLUMNS.map((c) => `${c.label} (${currency})`)]);
    rows.forEach((r) => data.push([r.category, ...INDEX_COLUMNS.map((c) => getDisplayVal((r as any)[c.key]))]));
    data.push([]);
    data.push([STANDARD_FOOTER]);
    writeAoaWorkbook(data, "Matrix", "PriceMatrix.xlsx");
    toast({ title: "Excel exported" });
  };

  const handleCSV = () => {
    const lines = [
      ...companyHeader,
      "",
      ["Price Matrix", ...INDEX_COLUMNS.map((c) => `${c.label} (${currency})`)].join(","),
      ...rows.map((r) =>
        [r.category, ...INDEX_COLUMNS.map((c) => getDisplayVal((r as any)[c.key]))].join(",")
      ),
      "",
      STANDARD_FOOTER,
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

    const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:60px;margin-bottom:8px;display:block" crossorigin="anonymous" />` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Price Matrix</title>
<style>body{font-family:sans-serif;font-size:12px;margin:40px}h1{color:#1e4db7;margin-bottom:2px}.tagline{font-size:11px;color:#444;margin:2px 0}.contact{font-size:10px;color:#666;margin:2px 0 8px}h2{color:#444;font-size:11px;font-weight:normal;margin-bottom:8px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 8px}th{background:#1e4db7;color:#fff}tr:nth-child(even){background:#f5f7fb}footer{font-size:10px;color:#888;margin-top:24px;text-align:center}</style>
</head><body>${logoHtml}<h1>${companyName}</h1><p class="tagline">${tagline}</p><p class="contact">Phone: ${phone} &nbsp;|&nbsp; ${website}</p><h2>${versionTitle}</h2>
<table><thead><tr><th>Price Matrix</th><th>${cols}</th></tr></thead><tbody>${rowsHtml}</tbody></table>
<footer>${STANDARD_FOOTER}</footer></body></html>`;
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
