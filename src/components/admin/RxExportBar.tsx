import { useMatrixAllocations, MATERIAL_COLUMNS, TREATMENT_TYPES, TreatmentType } from "@/hooks/useMatrixAllocations";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLenses } from "@/hooks/useLenses";
import { PricelistVersion } from "@/hooks/usePricelistVersions";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
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

const fmt = (val: number | null | undefined, showUSD: boolean, fxRate: number) => {
  if (val == null) return "";
  const v = showUSD ? val * fxRate : val;
  return parseFloat(v.toFixed(2));
};

const fmtStr = (val: number | null | undefined, showUSD: boolean, fxRate: number) => {
  if (val == null) return "—";
  const v = showUSD ? val * fxRate : val;
  return v.toFixed(2);
};

// Build a logo HTML snippet from company settings
const buildLogoHtml = (logoUrl: string | null | undefined) => {
  if (!logoUrl) return "";
  return `<img src="${logoUrl}" alt="Logo" style="max-height:60px;margin-bottom:8px;display:block" crossorigin="anonymous" />`;
};

// Strip HTML tags for text-based exports
const stripHtml = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

const RxExportBar = ({ version, showUSD, fxRate, catalogType = "rx" }: Props) => {
  const { data: allocations = [] } = useMatrixAllocations(version.id);
  const { data: matrixRows = [] } = usePriceMatrix();
  const { data: catalogRows = [] } = usePricelistCatalogRows(version.id, catalogType);
  const { data: company } = useCompanySettings();
  const { data: allLenses = [] } = useLenses();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

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

  // For text-based exports: use stripped header or fallback
  const companyHeader = headerHtml
    ? [stripHtml(headerHtml), `${version.name} — ${today} (${currency})`]
    : [
        company?.company_name ?? "",
        company?.slogan ?? "",
        `${company?.tel ?? ""} | ${company?.email ?? ""}`,
        `${version.name} — ${today} (${currency})`,
      ];

  const footerText = footerHtml
    ? stripHtml(footerHtml)
    : `All prices in ${currency}. Prices subject to change without notice. · ${company?.company_name ?? ""}`;

  // Helper: get addon rows grouped by section
  const getAddonsBySection = () => {
    const primaryType = catalogType === "buysell" ? "supply" : "lens";
    const addonRows = catalogRows
      .filter((r) => r.row_type !== primaryType)
      .sort((a, b) => a.sort_order - b.sort_order);
    const map = new Map<string, typeof addonRows>();
    for (const r of addonRows) {
      const sec = r.section || "Other";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(r);
    }
    return map;
  };

  // Helper: get primary rows (lens for rx/stock, supply for buysell)
  const getPrimaryRows = () => {
    const primaryType = catalogType === "buysell" ? "supply" : "lens";
    return catalogRows.filter((r) => r.row_type === primaryType);
  };

  // Helper: get active columns per treatment
  const getActiveCols = (tt: TreatmentType) =>
    MATERIAL_COLUMNS.filter((col) =>
      allocations.some((a) => a.treatment_type === tt && a.material_index === col.key && a.allocated_price_bbd != null)
    );

  // Helper: get active categories per treatment/cols
  const getActiveCats = (tt: TreatmentType, cols: readonly { key: string; label: string }[]) =>
    categories.filter((cat) =>
      cols.some((col) =>
        allocations.some((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt && a.allocated_price_bbd != null)
      )
    );

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
          row.push(fmt(alloc?.allocated_price_bbd, showUSD, fxRate) as any);
        });
        aoa.push(row);
      });
      aoa.push([]);
    });

    // Add addons
    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      aoa.push(["ADD ONS"]);
      for (const [sec, rows] of addonsBySection.entries()) {
        aoa.push([sec]);
        aoa.push(["Description", `${currency} Price`]);
        rows.forEach((row) => {
          aoa.push([row.display_description, fmt(row.bbd_price, showUSD, fxRate) ?? ""]);
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
          return fmt(alloc?.allocated_price_bbd, showUSD, fxRate) ?? "";
        });
        lines.push([cat, ...vals].join(","));
      });
      lines.push("");
    });

    // Add addons
    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      lines.push("ADD ONS");
      for (const [sec, rows] of addonsBySection.entries()) {
        lines.push(`"${sec}"`);
        lines.push(`Description,${currency} Price`);
        rows.forEach((row) => {
          lines.push([`"${row.display_description}"`, fmt(row.bbd_price, showUSD, fxRate) ?? ""].join(","));
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
      const rowsHtml = activeCats.map((cat) => {
        const cells = visibleCols.map((col) => {
          const alloc = allocations.find((a) => a.category === cat && a.material_index === col.key && a.treatment_type === tt);
          return `<td style="text-align:right">${alloc?.allocated_price_bbd != null ? fmtStr(alloc.allocated_price_bbd, showUSD, fxRate) : "—"}</td>`;
        }).join("");
        return `<tr><td>${cat}</td>${cells}</tr>`;
      }).join("");
      return `<h3 style="color:#1e4db7;margin:20px 0 8px">${TREATMENT_LABELS[tt]}</h3>
      <table><thead><tr><th>Category</th>${colHeaders}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    }).join("");

    // Addons HTML
    const addonsBySection = getAddonsBySection();
    let addonsHtml = "";
    if (addonsBySection.size > 0) {
      addonsHtml = `<h2 style="color:#1e4db7;margin:24px 0 8px">ADD ONS</h2>`;
      for (const [sec, rows] of addonsBySection.entries()) {
        const rowsH = rows.map((row) =>
          `<tr><td>${row.display_description}</td><td style="text-align:right">${row.bbd_price != null ? fmtStr(row.bbd_price, showUSD, fxRate) : "—"}</td></tr>`
        ).join("");
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

  // ── Matrix PDF (jsPDF + autoTable) ──────────────────────────────────────────
  const exportMatrixPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const margin = 12;
    let y = margin;

    // Header
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

      // Section label
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
          return alloc?.allocated_price_bbd != null ? fmtStr(alloc.allocated_price_bbd, showUSD, fxRate) : "—";
        }),
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head,
        body,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 251] },
        tableWidth: "auto",
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    });

    // Addons
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
          body: rows.map((r) => [r.display_description, r.bbd_price != null ? fmtStr(r.bbd_price, showUSD, fxRate) : "—"]),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 251] },
          tableWidth: "auto",
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }

    // Footer
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
      aoa.push(["Description", `${currency} Price`]);
      lensRows.filter((r) => r.section === sec).sort((a, b) => a.sort_order - b.sort_order).forEach((row) => {
        aoa.push([row.display_description, fmt(row.bbd_price, showUSD, fxRate) ?? ""]);
      });
      aoa.push([]);
    });

    // Add addons
    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        aoa.push([sec]);
        aoa.push(["Description", `${currency} Price`]);
        rows.forEach((row) => {
          aoa.push([row.display_description, fmt(row.bbd_price, showUSD, fxRate) ?? ""]);
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
    lines.push(`Description,${currency} Price`);

    const lensRows = getPrimaryRows();
    const sections = [...new Set(lensRows.map((r) => r.section))].sort();
    sections.forEach((sec) => {
      lines.push(`"${sec}"`);
      lensRows.filter((r) => r.section === sec).sort((a, b) => a.sort_order - b.sort_order).forEach((row) => {
        lines.push([`"${row.display_description}"`, fmt(row.bbd_price, showUSD, fxRate) ?? ""].join(","));
      });
    });

    // Add addons
    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      lines.push("");
      for (const [sec, rows] of addonsBySection.entries()) {
        lines.push(`"${sec}"`);
        rows.forEach((row) => {
          lines.push([`"${row.display_description}"`, fmt(row.bbd_price, showUSD, fxRate) ?? ""].join(","));
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
    const sectionsHtml = sections.map((sec) => {
      const rowsHtml = lensRows
        .filter((r) => r.section === sec)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => `<tr><td>${row.display_description}</td><td style="text-align:right">${fmtStr(row.bbd_price, showUSD, fxRate)}</td></tr>`)
        .join("");
      return `<h3 style="color:#1e4db7;margin:20px 0 8px">${sec}</h3>
      <table><thead><tr><th>Description</th><th>Price (${currency})</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
    }).join("");

    // Addons HTML
    const addonsBySection = getAddonsBySection();
    let addonsHtml = "";
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        const rowsH = rows.map((row) =>
          `<tr><td>${row.display_description}</td><td style="text-align:right">${row.bbd_price != null ? fmtStr(row.bbd_price, showUSD, fxRate) : "—"}</td></tr>`
        ).join("");
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

  // ── List PDF (jsPDF + autoTable) ─────────────────────────────────────────────
  const exportListPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const margin = 12;
    let y = margin;

    // Header
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

    // Group by category (stripping treatment prefixes, matching preview)
    const TREATMENT_PREFIXES = ["Clear Lenses", "Transitions", "Photochromic", "Polarized", "Bluefilter"];
    const lensSectionMap = new Map<string, typeof lensRows>();
    for (const r of lensRows) {
      const sec = r.section || "Lenses";
      const parts = sec.split(" — ");
      const isMatrixSection = TREATMENT_PREFIXES.some(tp => parts[0].trim() === tp);
      const category = isMatrixSection ? (parts.slice(1).join(" — ") || sec) : sec;
      if (!lensSectionMap.has(category)) lensSectionMap.set(category, []);
      lensSectionMap.get(category)!.push(r);
    }

    // Sort sections by matrix category order (matching preview)
    const sortedSections = [...lensSectionMap.entries()].sort((a, b) => {
      const aIdx = categories.indexOf(a[0]);
      const bIdx = categories.indexOf(b[0]);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    // Build lens index map for sorting rows within sections
    const lensIdxMap = new Map<string, number>();
    allLenses.forEach((l) => lensIdxMap.set(l.id, l.index_value));

    sortedSections.forEach(([sec, secRows]) => {
      if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.setTextColor(30, 77, 183);
      doc.text(sec, margin, y);
      y += 2;

      // Sort rows by lens index then sort_order (matching preview)
      const rows = [...secRows].sort((a, b) => {
        const aIdx = a.item_id ? (lensIdxMap.get(a.item_id) ?? 999) : 999;
        const bIdx = b.item_id ? (lensIdxMap.get(b.item_id) ?? 999) : 999;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.sort_order - b.sort_order;
      });

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Description", `${currency} Price`]],
        body: rows.map((r) => [r.display_description, r.bbd_price != null ? fmtStr(r.bbd_price, showUSD, fxRate) : "—"]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 251] },
        tableWidth: "auto",
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    });

    // Addons
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
          body: rows.map((r) => [r.display_description, r.bbd_price != null ? fmtStr(r.bbd_price, showUSD, fxRate) : "—"]),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 251] },
          tableWidth: "auto",
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }

    // Footer on each page
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