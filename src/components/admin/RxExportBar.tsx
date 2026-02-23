import { useState } from "react";
import { useMatrixAllocations, MATERIAL_COLUMNS, TREATMENT_TYPES, TreatmentType } from "@/hooks/useMatrixAllocations";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLenses } from "@/hooks/useLenses";
import { PricelistVersion } from "@/hooks/usePricelistVersions";
import { usePriceHierarchy } from "@/hooks/usePriceHierarchy";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileText, Table2, FileSpreadsheet, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  catalogType?: "rx" | "stock" | "buysell";
}

const RxExportBar = ({ version, showUSD, fxRate, catalogType = "rx" }: Props) => {
  const { data: allocations = [] } = useMatrixAllocations(version.id);
  const { data: matrixRows = [] } = usePriceMatrix();
  const { data: catalogRows = [] } = usePricelistCatalogRows(version.id, catalogType);
  const { data: company } = useCompanySettings();
  const { data: allLenses = [] } = useLenses();
  const { calcFinalPrice, getOverrideReason } = usePriceHierarchy(version.id);
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const { isAdmin, canEdit } = useAdminRole();

  const [showMargins, setShowMargins] = useState(false);

  const logExport = (formatType: string, viewType: string) => {
    logChange({
      table_name: "pricelist_export",
      record_id: String(version.id),
      action: "create",
      new_data: { name: version.name, format: formatType, view: viewType, currency },
    });
  };

  const currency = showUSD ? "USD" : (version.base_currency ?? "BBD");
  const today = format(new Date(), "dd MMMM yyyy");
  const categories = [...new Set(matrixRows.map((r) => r.category))];

  const headerHtml = company?.pdf_header_html?.trim() || "";
  const footerHtml = company?.pdf_footer_html?.trim() || "";

  const stripHtml = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const buildLogoHtml = (logoUrl: string | null | undefined) => {
    if (!logoUrl) return "";
    return `<img src="${logoUrl}" alt="Logo" style="max-height:60px;margin-bottom:8px;display:block" crossorigin="anonymous" />`;
  };

  const companyHeader = headerHtml
    ? [stripHtml(headerHtml), `${version.name} — ${today} (${currency})`]
    : [company?.company_name ?? "", company?.slogan ?? "", `${company?.tel ?? ""} | ${company?.email ?? ""}`, `${version.name} — ${today} (${currency})`];

  const footerText = footerHtml
    ? stripHtml(footerHtml)
    : `All prices in ${currency}. Prices subject to change without notice. · ${company?.company_name ?? ""}`;

  // ── Price calculation helpers ──────────────────────────────────────────────
  /** Apply hierarchy to a value and optionally convert to display currency */
  const hp = (basePrice: number | null, refId?: string, refType?: string): number | null => {
    const finalBbd = calcFinalPrice(basePrice, version, catalogType, refId, refType);
    if (finalBbd == null) return null;
    return showUSD ? finalBbd * fxRate : finalBbd;
  };

  const hpStr = (basePrice: number | null, refId?: string, refType?: string): string => {
    const v = hp(basePrice, refId, refType);
    return v != null ? v.toFixed(2) : "—";
  };

  const hpNum = (basePrice: number | null, refId?: string, refType?: string): any => {
    const v = hp(basePrice, refId, refType);
    return v != null ? parseFloat(v.toFixed(2)) : "";
  };

  /** Calculate margin % for a catalog row (sell vs cost from lens base_price) */
  const calcMargin = (row: { bbd_price: number | null; item_id: string | null; row_key?: string; row_type?: string }): string => {
    if (!row.bbd_price || !row.item_id) return "";
    const lens = allLenses.find((l) => l.id === row.item_id);
    if (!lens || !lens.base_price) return "";
    const finalSell = calcFinalPrice(row.bbd_price, version, catalogType, row.row_key ?? "", row.row_type ?? "lens");
    if (!finalSell || finalSell <= 0) return "";
    const cost = lens.base_price * (showUSD ? fxRate : 2);
    const margin = ((finalSell - cost) / finalSell) * 100;
    return margin.toFixed(1) + "%";
  };

  // ── Shared helpers ────────────────────────────────────────────────────────
  const getAddonsBySection = () => {
    const primaryType = catalogType === "buysell" ? "supply" : "lens";
    const addonRows = catalogRows.filter((r) => r.row_type !== primaryType).sort((a, b) => a.sort_order - b.sort_order);
    const map = new Map<string, typeof addonRows>();
    for (const r of addonRows) {
      const sec = r.section || "Other";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(r);
    }
    return map;
  };

  const getPrimaryRows = () => {
    const primaryType = catalogType === "buysell" ? "supply" : "lens";
    return catalogRows.filter((r) => r.row_type === primaryType);
  };

  const getActiveCols = (tt: TreatmentType) =>
    MATERIAL_COLUMNS.filter((col) =>
      allocations.some((a) => a.treatment_type === tt && a.material_index === col.key && a.allocated_price_bbd != null)
    );

  const getActiveCats = (tt: TreatmentType, cols: readonly { key: string; label: string }[]) =>
    categories.filter((cat) =>
      cols.some((col) =>
        allocations.some((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt && a.allocated_price_bbd != null)
      )
    );

  // Customer mode = not admin/operator (hide margins & override reasons)
  const isCustomerExport = !canEdit;

  // ── Matrix Excel ─────────────────────────────────────────────────────────────
  const exportMatrixExcel = () => {
    const aoa: any[][] = [];
    companyHeader.forEach((h) => aoa.push([h]));
    aoa.push([]);

    TREATMENT_TYPES.forEach((tt) => {
      const activeCols = getActiveCols(tt);
      if (activeCols.length === 0 && tt !== "clear") return;
      const visibleCols = activeCols.length > 0 ? activeCols : MATERIAL_COLUMNS;
      const activeCats = getActiveCats(tt, visibleCols);

      aoa.push([TREATMENT_LABELS[tt]]);
      aoa.push(["Category", ...visibleCols.map((c) => c.key)]);

      activeCats.forEach((cat) => {
        const row = [cat];
        visibleCols.forEach((col) => {
          const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
          row.push(hpNum(alloc?.allocated_price_bbd ?? null, alloc?.id ? String(alloc.id) : undefined, "matrix_allocation"));
        });
        aoa.push(row);
      });
      aoa.push([]);
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      aoa.push(["ADD ONS"]);
      for (const [sec, rows] of addonsBySection.entries()) {
        aoa.push([sec]);
        aoa.push(["Description", `${currency} Price`]);
        rows.forEach((row) => {
          aoa.push([row.display_description, hpNum(row.bbd_price, row.row_key, row.row_type)]);
        });
        aoa.push([]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matrix");
    XLSX.writeFile(wb, `${version.name}_Matrix.xlsx`);
    toast({ title: "Matrix Excel exported" });
    logExport("Excel", "Matrix");
  };

  // ── Matrix CSV ───────────────────────────────────────────────────────────────
  const exportMatrixCSV = () => {
    const lines: string[] = [];
    companyHeader.forEach((h) => lines.push(h));
    lines.push("");

    TREATMENT_TYPES.forEach((tt) => {
      const activeCols = getActiveCols(tt);
      if (activeCols.length === 0 && tt !== "clear") return;
      const visibleCols = activeCols.length > 0 ? activeCols : MATERIAL_COLUMNS;
      const activeCats = getActiveCats(tt, visibleCols);

      lines.push(TREATMENT_LABELS[tt]);
      lines.push(["Category", ...visibleCols.map((c) => c.key)].join(","));
      activeCats.forEach((cat) => {
        const vals = visibleCols.map((col) => {
          const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
          return hpNum(alloc?.allocated_price_bbd ?? null, alloc?.id ? String(alloc.id) : undefined, "matrix_allocation");
        });
        lines.push([cat, ...vals].join(","));
      });
      lines.push("");
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      lines.push("ADD ONS");
      for (const [sec, rows] of addonsBySection.entries()) {
        lines.push(`"${sec}"`);
        lines.push(`Description,${currency} Price`);
        rows.forEach((row) => {
          lines.push([`"${row.display_description}"`, hpNum(row.bbd_price, row.row_key, row.row_type)].join(","));
        });
        lines.push("");
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_Matrix.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Matrix CSV exported" });
    logExport("CSV", "Matrix");
  };

  // ── Matrix HTML ──────────────────────────────────────────────────────────────
  const exportMatrixHTML = () => {
    const sectionsHtml = TREATMENT_TYPES.map((tt) => {
      const activeCols = getActiveCols(tt);
      if (activeCols.length === 0 && tt !== "clear") return "";
      const visibleCols = activeCols.length > 0 ? activeCols : MATERIAL_COLUMNS;
      const activeCats = getActiveCats(tt, visibleCols);
      if (activeCats.length === 0 && tt !== "clear") return "";

      const colHeaders = visibleCols.map((c) => `<th>${c.key}</th>`).join("");
      const rowsHtml = activeCats
        .map((cat) => {
          const cells = visibleCols
            .map((col) => {
              const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
              return `<td style="text-align:right">${hpStr(alloc?.allocated_price_bbd ?? null, alloc?.id ? String(alloc.id) : undefined, "matrix_allocation")}</td>`;
            })
            .join("");
          return `<tr><td>${cat}</td>${cells}</tr>`;
        })
        .join("");
      return `<h3 style="color:#1e4db7;margin:20px 0 8px">${TREATMENT_LABELS[tt]}</h3>
      <table><thead><tr><th>Category</th>${colHeaders}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    }).join("");

    const addonsBySection = getAddonsBySection();
    let addonsHtml = "";
    if (addonsBySection.size > 0) {
      addonsHtml = `<h2 style="color:#1e4db7;margin:24px 0 8px">ADD ONS</h2>`;
      for (const [sec, rows] of addonsBySection.entries()) {
        const rowsH = rows
          .map((row) => `<tr><td>${row.display_description}</td><td style="text-align:right">${hpStr(row.bbd_price, row.row_key, row.row_type)}</td></tr>`)
          .join("");
        addonsHtml += `<h3 style="color:#1e4db7;margin:16px 0 6px">${sec}</h3>
        <table><thead><tr><th>Description</th><th>Price (${currency})</th></tr></thead><tbody>${rowsH}</tbody></table>`;
      }
    }

    const headerBlock = headerHtml
      ? `${buildLogoHtml(company?.logo_url)}${headerHtml}<h2>${version.name} — ${today} (${currency})</h2>`
      : `${buildLogoHtml(company?.logo_url)}<h1>${company?.company_name ?? ""}</h1><h2>${company?.slogan ?? ""} · ${company?.tel ?? ""} · ${company?.email ?? ""}</h2><h2>${version.name} — ${today} (${currency})</h2>`;
    const footerBlock = footerHtml || `All prices in ${currency}. Prices subject to change without notice.`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${version.name}</title>
<style>body{font-family:sans-serif;font-size:12px;margin:40px}h1{color:#1e4db7;margin-bottom:4px}h2{color:#444;font-size:11px;font-weight:normal;margin-bottom:2px}h3{color:#1e4db7;font-size:12px;font-weight:bold}table{border-collapse:collapse;width:100%;margin-bottom:12px}th,td{border:1px solid #ccc;padding:4px 10px}th{background:#1e4db7;color:#fff;text-align:left}tr:nth-child(even){background:#f5f7fb}footer{font-size:10px;color:#888;margin-top:24px}</style></head><body>
${headerBlock}
${sectionsHtml}
${addonsHtml}
<footer>${footerBlock}</footer>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_Matrix.html`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Matrix HTML exported" });
    logExport("HTML", "Matrix");
  };

  // ── Matrix PDF ──────────────────────────────────────────────────────────────
  const exportMatrixPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const margin = 12;
    let y = margin;

    doc.setFontSize(9);
    doc.setTextColor(30, 77, 183);
    let headerY = y;
    companyHeader.forEach((line, i) => {
      if (i === 0) { doc.setFontSize(14); doc.setTextColor(30, 77, 183); }
      else { doc.setFontSize(8); doc.setTextColor(100); }
      doc.text(line, margin, headerY);
      headerY += i === 0 ? 5 : 4;
    });
    y = headerY + 2;

    TREATMENT_TYPES.forEach((tt) => {
      const activeCols = getActiveCols(tt);
      if (activeCols.length === 0 && tt !== "clear") return;
      const visibleCols = activeCols.length > 0 ? activeCols : MATERIAL_COLUMNS;
      const activeCats = getActiveCats(tt, visibleCols);
      if (activeCats.length === 0 && tt !== "clear") return;

      if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = margin; }
      doc.setFontSize(10);
      doc.setTextColor(30, 77, 183);
      doc.text(TREATMENT_LABELS[tt], margin, y);
      y += 2;

      const head = [["Category", ...visibleCols.map((c) => c.key)]];
      const body = activeCats.map((cat) => [
        cat,
        ...visibleCols.map((col) => {
          const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
          return hpStr(alloc?.allocated_price_bbd ?? null, alloc?.id ? String(alloc.id) : undefined, "matrix_allocation");
        }),
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head, body,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 251] },
        tableWidth: "auto",
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = margin; }
        doc.setFontSize(9);
        doc.setTextColor(30, 77, 183);
        doc.text(sec, margin, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Description", `Price (${currency})`]],
          body: rows.map((r) => [r.display_description, hpStr(r.bbd_price, r.row_key, r.row_type)]),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 251] },
          tableWidth: "auto",
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 5);
    }

    doc.save(`${version.name}_Matrix.pdf`);
    toast({ title: "Matrix PDF exported" });
    logExport("PDF", "Matrix");
  };

  // ── List Excel ───────────────────────────────────────────────────────────────
  const exportListExcel = () => {
    const aoa: any[][] = [];
    companyHeader.forEach((h) => aoa.push([h]));
    aoa.push([]);

    const lensRows = getPrimaryRows();
    const sections = [...new Set(lensRows.map((r) => r.section))].sort();
    sections.forEach((sec) => {
      aoa.push([sec]);
      const headers = ["Description", `${currency} Price`];
      if (showMargins && !isCustomerExport) headers.push("Margin %");
      aoa.push(headers);
      lensRows
        .filter((r) => r.section === sec)
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach((row) => {
          const line: any[] = [row.display_description, hpNum(row.bbd_price, row.row_key, row.row_type)];
          if (showMargins && !isCustomerExport) line.push(calcMargin(row));
          aoa.push(line);
        });
      aoa.push([]);
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        aoa.push([sec]);
        aoa.push(["Description", `${currency} Price`]);
        rows.forEach((row) => {
          aoa.push([row.display_description, hpNum(row.bbd_price, row.row_key, row.row_type)]);
        });
        aoa.push([]);
      }
    }

    aoa.push([footerText]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List");
    XLSX.writeFile(wb, `${version.name}_List.xlsx`);
    toast({ title: "List Excel exported" });
    logExport("Excel", "List");
  };

  // ── List CSV ─────────────────────────────────────────────────────────────────
  const exportListCSV = () => {
    const lines: string[] = [];
    companyHeader.forEach((h) => lines.push(h));
    lines.push("");
    const csvHeaders = [`Description`, `${currency} Price`];
    if (showMargins && !isCustomerExport) csvHeaders.push("Margin %");
    lines.push(csvHeaders.join(","));

    const lensRows = getPrimaryRows();
    const sections = [...new Set(lensRows.map((r) => r.section))].sort();
    sections.forEach((sec) => {
      lines.push(`"${sec}"`);
      lensRows
        .filter((r) => r.section === sec)
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach((row) => {
          const vals: any[] = [`"${row.display_description}"`, hpNum(row.bbd_price, row.row_key, row.row_type)];
          if (showMargins && !isCustomerExport) vals.push(calcMargin(row));
          lines.push(vals.join(","));
        });
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      lines.push("");
      for (const [sec, rows] of addonsBySection.entries()) {
        lines.push(`"${sec}"`);
        rows.forEach((row) => {
          lines.push([`"${row.display_description}"`, hpNum(row.bbd_price, row.row_key, row.row_type)].join(","));
        });
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_List.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "List CSV exported" });
    logExport("CSV", "List");
  };

  // ── List HTML ────────────────────────────────────────────────────────────────
  const exportListHTML = () => {
    const lensRows = getPrimaryRows();
    const sections = [...new Set(lensRows.map((r) => r.section))].sort();
    const sectionsHtml = sections
      .map((sec) => {
        const rowsHtml = lensRows
          .filter((r) => r.section === sec)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((row) => `<tr><td>${row.display_description}</td><td style="text-align:right">${hpStr(row.bbd_price, row.row_key, row.row_type)}</td></tr>`)
          .join("");
        return `<h3 style="color:#1e4db7;margin:20px 0 8px">${sec}</h3>
      <table><thead><tr><th>Description</th><th>Price (${currency})</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
      })
      .join("");

    const addonsBySection = getAddonsBySection();
    let addonsHtml = "";
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        const rowsH = rows
          .map((row) => `<tr><td>${row.display_description}</td><td style="text-align:right">${hpStr(row.bbd_price, row.row_key, row.row_type)}</td></tr>`)
          .join("");
        addonsHtml += `<h3 style="color:#1e4db7;margin:16px 0 6px">${sec}</h3>
        <table><thead><tr><th>Description</th><th>Price (${currency})</th></tr></thead><tbody>${rowsH}</tbody></table>`;
      }
    }

    const listHeaderBlock = headerHtml
      ? `${buildLogoHtml(company?.logo_url)}${headerHtml}<h2>${version.name} — ${today} (${currency})</h2>`
      : `${buildLogoHtml(company?.logo_url)}<h1>${company?.company_name ?? ""}</h1><h2>${company?.slogan ?? ""} · ${company?.tel ?? ""} · ${company?.email ?? ""}</h2><h2>${version.name} — ${today} (${currency})</h2>`;
    const listFooterBlock = footerHtml || `All prices in ${currency}. Prices subject to change without notice.`;

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
${listHeaderBlock}
${sectionsHtml}
${addonsHtml}
<footer>${listFooterBlock}</footer>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_List.html`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "List HTML exported" });
    logExport("HTML", "List");
  };

  // ── List PDF ─────────────────────────────────────────────────────────────────
  const exportListPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const margin = 12;
    let y = margin;

    doc.setFontSize(9);
    doc.setTextColor(30, 77, 183);
    let listHeaderY = y;
    companyHeader.forEach((line, i) => {
      if (i === 0) { doc.setFontSize(14); doc.setTextColor(30, 77, 183); }
      else { doc.setFontSize(8); doc.setTextColor(100); }
      doc.text(line, margin, listHeaderY);
      listHeaderY += i === 0 ? 5 : 4;
    });
    y = listHeaderY + 2;

    const lensRows = getPrimaryRows();

    const TREATMENT_PREFIXES = ["Clear Lenses", "Transitions", "Photochromic", "Polarized", "Bluefilter"];
    const lensSectionMap = new Map<string, typeof lensRows>();
    for (const r of lensRows) {
      const sec = r.section || "Lenses";
      const parts = sec.split(" — ");
      const isMatrixSection = TREATMENT_PREFIXES.some((tp) => parts[0].trim() === tp);
      const category = isMatrixSection ? (parts.slice(1).join(" — ") || sec) : sec;
      if (!lensSectionMap.has(category)) lensSectionMap.set(category, []);
      lensSectionMap.get(category)!.push(r);
    }

    const sortedSections = [...lensSectionMap.entries()].sort((a, b) => {
      const aIdx = categories.indexOf(a[0]);
      const bIdx = categories.indexOf(b[0]);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    const lensIdxMap = new Map<string, number>();
    allLenses.forEach((l) => lensIdxMap.set(l.id, l.index_value));

    // Determine columns: customer PDF hides margin; internal shows if toggled
    const includeMargin = showMargins && !isCustomerExport;

    sortedSections.forEach(([sec, secRows]) => {
      if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.setTextColor(30, 77, 183);
      doc.text(sec, margin, y);
      y += 2;

      const rows = [...secRows].sort((a, b) => {
        const aIdx = a.item_id ? (lensIdxMap.get(a.item_id) ?? 999) : 999;
        const bIdx = b.item_id ? (lensIdxMap.get(b.item_id) ?? 999) : 999;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.sort_order - b.sort_order;
      });

      const head = [includeMargin ? ["Description", `${currency} Price`, "Margin %"] : ["Description", `${currency} Price`]];
      const body = rows.map((r) => {
        const line = [r.display_description, hpStr(r.bbd_price, r.row_key, r.row_type)];
        if (includeMargin) line.push(calcMargin(r));
        return line;
      });

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head, body,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 251] },
        tableWidth: "auto",
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = margin; }
        doc.setFontSize(9);
        doc.setTextColor(30, 77, 183);
        doc.text(sec, margin, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Description", `Price (${currency})`]],
          body: rows.map((r) => [r.display_description, hpStr(r.bbd_price, r.row_key, r.row_type)]),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 251] },
          tableWidth: "auto",
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 5);
    }

    doc.save(`${version.name}_List.pdf`);
    toast({ title: "List PDF exported" });
    logExport("PDF", "List");
  };

  const btnBase = "h-7 text-[11px] gap-1 px-2.5 font-medium";
  const showMatrix = catalogType === "rx";

  return (
    <div className="flex items-center gap-1.5 flex-wrap no-print">
      {/* Show Margins toggle (internal only) */}
      {canEdit && (
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-[10px] font-medium text-muted-foreground">Show Margins</span>
          <Switch
            checked={showMargins}
            onCheckedChange={setShowMargins}
            className="h-4 w-7"
          />
        </div>
      )}

      {/* Matrix exports — only for RX */}
      {showMatrix && (
        <>
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
        </>
      )}

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
