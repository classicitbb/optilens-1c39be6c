import { useMemo, useState } from "react";
import { useMatrixAllocations, MATERIAL_COLUMNS } from "@/hooks/useMatrixAllocations";
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
import { writeAoaWorkbook } from "@/lib/excelExport";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { compareCategoryOrder, compareMaterialOrder } from "@/lib/sortOrder";
import { useRxPricingStructure } from "@/hooks/useRxPricingStructure";
import { buildMatrixSectionLabel, parseMatrixRowKey } from "@/features/admin/rx-pricing/structure";

interface Props {
  version: PricelistVersion;
  showUSD: boolean;
  fxRate: number;
  catalogType?: "rx" | "stock" | "buysell";
}

const STANDARD_FOOTER = "Prices subject to change without notice. All prices in BBD unless otherwise stated.";

const RxExportBar = ({ version, showUSD, fxRate, catalogType = "rx" }: Props) => {
  const { data: allocations = [] } = useMatrixAllocations(version.id);
  const { data: catalogRows = [] } = usePricelistCatalogRows(version.id, catalogType);
  const { structure: rxStructure } = useRxPricingStructure(version.id);
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
  const categoryMetaMap = useMemo(() => new Map(rxStructure.flatMap((grouping) => grouping.categories.map((category) => [`${grouping.key}::${category.key}`, { grouping, category }] as const))), [rxStructure]);

  // ── Standardised branding ─────────────────────────────────────────────────
  const companyName = company?.company_name ?? "Classic Visions";
  const tagline = "Helping People See Better";
  const phone = "+1 246 433-4928";
  const website = "www.classicvisions.net";
  const versionTitle = `${companyName} ${version.name} — ${today} (${currency})`;
  const logoUrl = company?.logo_url ?? null;

  // Text header lines for PDF / Excel / CSV
  const companyHeader = [companyName, tagline, `Phone: ${phone}  |  ${website}`, versionTitle];

  const buildLogoHtml = (url: string | null | undefined) => {
    if (!url) return "";
    return `<img src="${url}" alt="Logo" style="max-height:60px;margin-bottom:8px;display:block" crossorigin="anonymous" />`;
  };

  // ── Price calculation helpers ──────────────────────────────────────────────
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
    return catalogRows
      .filter((row) => row.row_type === primaryType)
      .map((row) => {
        const parsed = parseMatrixRowKey(row.row_key);
        const meta = parsed ? categoryMetaMap.get(`${parsed.groupKey}::${parsed.categoryKey}`) : null;
        return {
          ...row,
          section: meta ? buildMatrixSectionLabel(meta.grouping.name, meta.category.name) : row.section,
        };
      });
  };

  const matrixGroups = rxStructure;

  const getActiveCols = (groupKey: string) => {
    const cols = MATERIAL_COLUMNS.filter((col) =>
      allocations.some((a) => a.treatment_type === groupKey && a.material_index === col.key && a.allocated_price_bbd != null)
    );
    return [...(cols.length ? cols : MATERIAL_COLUMNS)].sort((a, b) => compareMaterialOrder(a.key, b.key));
  };

  const getActiveCats = (grouping: (typeof matrixGroups)[number], cols: readonly { key: string; label: string }[]) =>
    grouping.categories.filter((category) =>
      cols.some((col) => allocations.some((a) => a.category === category.key && a.material_index === col.key && a.treatment_type === grouping.key && a.allocated_price_bbd != null)) || grouping.key === "clear"
    );

  const isCustomerExport = !canEdit;

  // ── PDF header helper (adds logo + text to doc, returns y) ────────────────
  const drawPdfHeader = (doc: jsPDF, margin: number): number => {
    let y = margin;
    // Logo — attempt to add if available (will be text-only if image fails)
    // We write text header lines
    doc.setFontSize(14);
    doc.setTextColor(30, 77, 183);
    doc.text(companyName, margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(tagline, margin, y);
    y += 4;
    doc.text(`Phone: ${phone}  |  ${website}`, margin, y);
    y += 4;
    doc.setFontSize(9);
    doc.setTextColor(30, 77, 183);
    doc.text(versionTitle, margin, y);
    y += 5;
    return y;
  };

  // ── PDF footer helper (page numbers + standard footer on every page) ──────
  const drawPdfFooters = (doc: jsPDF, margin: number) => {
    const totalPages = doc.getNumberOfPages();
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Footer text left
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(STANDARD_FOOTER, margin, pageH - 5);
      // Page numbers centred
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 5, { align: "center" });
    }
  };

  // ── Matrix Excel ─────────────────────────────────────────────────────────────
  const exportMatrixExcel = () => {
    const aoa: any[][] = [];
    companyHeader.forEach((h) => aoa.push([h]));
    aoa.push([]);

    matrixGroups.forEach((grouping) => {
      const visibleCols = getActiveCols(grouping.key);
      const activeCats = getActiveCats(grouping, visibleCols);
      if (activeCats.length === 0 && grouping.key !== "clear") return;

      aoa.push([grouping.name]);
      aoa.push([grouping.name, ...visibleCols.map((c) => c.key)]);

      activeCats.forEach((category) => {
        const row = [category.name];
        visibleCols.forEach((col) => {
          const alloc = allocations.find((a) => a.category === category.key && a.material_index === col.key && a.treatment_type === grouping.key);
          row.push(hpNum(alloc?.allocated_price_bbd ?? null, alloc?.id ? String(alloc.id) : undefined, "matrix_allocation"));
        });
        aoa.push(row);
      });
      aoa.push([]);
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        aoa.push([sec]);
        aoa.push([sec, `${currency} Price`]);
        rows.forEach((row) => {
          aoa.push([row.display_description, hpNum(row.bbd_price, row.row_key, row.row_type)]);
        });
        aoa.push([]);
      }
    }

    aoa.push([STANDARD_FOOTER]);

    writeAoaWorkbook(aoa, "Matrix", `${version.name}_Matrix.xlsx`);
    toast({ title: "Matrix Excel exported" });
    logExport("Excel", "Matrix");
  };

  // ── Matrix CSV ───────────────────────────────────────────────────────────────
  const exportMatrixCSV = () => {
    const lines: string[] = [];
    companyHeader.forEach((h) => lines.push(h));
    lines.push("");

    matrixGroups.forEach((grouping) => {
      const visibleCols = getActiveCols(grouping.key);
      const activeCats = getActiveCats(grouping, visibleCols);
      if (activeCats.length === 0 && grouping.key !== "clear") return;

      lines.push(grouping.name);
      lines.push([grouping.name, ...visibleCols.map((c) => c.key)].join(","));
      activeCats.forEach((category) => {
        const vals = visibleCols.map((col) => {
          const alloc = allocations.find((a) => a.category === category.key && a.material_index === col.key && a.treatment_type === grouping.key);
          return hpNum(alloc?.allocated_price_bbd ?? null, alloc?.id ? String(alloc.id) : undefined, "matrix_allocation");
        });
        lines.push([category.name, ...vals].join(","));
      });
      lines.push("");
    });

    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        lines.push(`"${sec}"`);
        lines.push(`"${sec}",${currency} Price`);
        rows.forEach((row) => {
          lines.push([`"${row.display_description}"`, hpNum(row.bbd_price, row.row_key, row.row_type)].join(","));
        });
        lines.push("");
      }
    }

    lines.push(STANDARD_FOOTER);

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
    const sectionsHtml = matrixGroups.map((grouping) => {
      const visibleCols = getActiveCols(grouping.key);
      const activeCats = getActiveCats(grouping, visibleCols);
      if (activeCats.length === 0 && grouping.key !== "clear") return "";

      const colHeaders = visibleCols.map((c) => `<th>${c.key}</th>`).join("");
      const rowsHtml = activeCats
        .map((category) => {
          const cells = visibleCols
            .map((col) => {
              const alloc = allocations.find((a) => a.category === category.key && a.material_index === col.key && a.treatment_type === grouping.key);
              return `<td style="text-align:right">${hpStr(alloc?.allocated_price_bbd ?? null, alloc?.id ? String(alloc.id) : undefined, "matrix_allocation")}</td>`;
            })
            .join("");
          return `<tr><td>${category.name}</td>${cells}</tr>`;
        })
        .join("");
      return `<h3 style="color:#1e4db7;margin:20px 0 8px">${grouping.name}</h3>
      <table><thead><tr><th>${grouping.name}</th>${colHeaders}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    }).join("");

    const addonsBySection = getAddonsBySection();
    let addonsHtml = "";
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        const rowsH = rows
          .map((row) => `<tr><td>${row.display_description}</td><td style="text-align:right">${hpStr(row.bbd_price, row.row_key, row.row_type)}</td></tr>`)
          .join("");
        addonsHtml += `<h3 style="color:#1e4db7;margin:16px 0 6px">${sec}</h3>
        <table><thead><tr><th>${sec}</th><th>Price (${currency})</th></tr></thead><tbody>${rowsH}</tbody></table>`;
      }
    }

    const headerBlock = `${buildLogoHtml(logoUrl)}<h1>${companyName}</h1><p class="tagline">${tagline}</p><p class="contact">Phone: ${phone} &nbsp;|&nbsp; ${website}</p><h2>${versionTitle}</h2>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${version.name}</title>
<style>body{font-family:sans-serif;font-size:12px;margin:40px}h1{color:#1e4db7;margin-bottom:2px}h2{color:#444;font-size:11px;font-weight:normal;margin-bottom:2px}.tagline{font-size:11px;color:#444;margin:2px 0}.contact{font-size:10px;color:#666;margin:2px 0 8px}h3{color:#1e4db7;font-size:12px;font-weight:bold}table{border-collapse:collapse;width:100%;margin-bottom:12px}th,td{border:1px solid #ccc;padding:4px 10px}th{background:#1e4db7;color:#fff;text-align:left}tr:nth-child(even){background:#f5f7fb}footer{font-size:10px;color:#888;margin-top:24px;text-align:center}</style></head><body>
${headerBlock}
${sectionsHtml}
${addonsHtml}
<footer>${STANDARD_FOOTER}</footer>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${version.name}_Matrix.html`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Matrix HTML exported" });
    logExport("HTML", "Matrix");
  };

  // ── Matrix PDF (Portrait A4, compact, lens names, deltas) ────────────────
  const exportMatrixPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 10;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = drawPdfHeader(doc, margin);

    // Build a lens-name lookup: allocation id → lens name
    const lensNameMap = new Map<string, string>();
    for (const a of allocations) {
      if (a.lens_id) {
        const lens = allLenses.find((l) => l.id === a.lens_id);
        if (lens) lensNameMap.set(String(a.id), lens.name);
      }
    }

    const getColAvg = (mat: string, grouping: (typeof matrixGroups)[number]): number | null => {
      const vals = grouping.categories
        .map((category) => {
          const a = allocations.find((al) => al.category === category.key && al.material_index === mat && al.treatment_type === grouping.key);
          if (!a?.allocated_price_bbd) return null;
          return hp(a.allocated_price_bbd, String(a.id), "matrix_allocation");
        })
        .filter((v): v is number => v !== null);
      if (!vals.length) return null;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    };

    const treatmentsToPrint = matrixGroups.filter((grouping) => {
      const visibleCols = getActiveCols(grouping.key);
      const activeCats = getActiveCats(grouping, visibleCols);
      return activeCats.length > 0 || grouping.key === "clear";
    });

    treatmentsToPrint.forEach((grouping) => {
      const visibleCols = getActiveCols(grouping.key);
      const activeCats = getActiveCats(grouping, visibleCols);
      if (activeCats.length === 0 && grouping.key !== "clear") return;

      if (y > pageH - 40) { doc.addPage(); y = margin; }

      doc.setFontSize(8);
      doc.setTextColor(30, 77, 183);
      doc.text(grouping.name, margin, y);
      y += 1.5;

      const body: any[][] = activeCats.map((category) => ([
        category.name,
        ...visibleCols.map((col) => {
          const alloc = allocations.find((a) => a.category === category.key && a.material_index === col.key && a.treatment_type === grouping.key);
          if (!alloc?.allocated_price_bbd) return "—";
          const price = hpStr(alloc.allocated_price_bbd, String(alloc.id), "matrix_allocation");
          const lensName = lensNameMap.get(String(alloc.id));
          return lensName ? `${price}
${lensName}` : price;
        }),
      ]));

      if (grouping.key !== "clear") {
        const clearGrouping = matrixGroups.find((entry) => entry.key === "clear");
        body.push([
          "Δ vs Clear",
          ...visibleCols.map((col) => {
            const treatAvg = getColAvg(col.key, grouping);
            const clearAvg = clearGrouping ? getColAvg(col.key, clearGrouping) : null;
            if (treatAvg == null || clearAvg == null) return "—";
            const delta = treatAvg - clearAvg;
            return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;
          }),
        ]);
      }

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [[grouping.name, ...visibleCols.map((c) => c.key)]],
        body,
        styles: { fontSize: 5.5, cellPadding: 1.2, overflow: "linebreak" },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold", fontSize: 6 },
        alternateRowStyles: { fillColor: [245, 247, 251] },
        columnStyles: { 0: { cellWidth: 32, fontStyle: "bold" } },
        tableWidth: "auto",
        didParseCell: (data: any) => {
          if (data.section === "body" && data.row.index === body.length - 1 && grouping.key !== "clear") {
            data.cell.styles.fillColor = [255, 248, 230];
            data.cell.styles.textColor = [160, 120, 0];
            data.cell.styles.fontStyle = "italic";
            data.cell.styles.fontSize = 5;
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    });

    // Add-ons / Treatments sections
    const addonsBySection = getAddonsBySection();
    if (addonsBySection.size > 0) {
      for (const [sec, rows] of addonsBySection.entries()) {
        if (y > pageH - 25) { doc.addPage(); y = margin; }
        doc.setFontSize(7);
        doc.setTextColor(30, 77, 183);
        doc.text(sec, margin, y);
        y += 1.5;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[sec, `Price (${currency})`]],
          body: rows.map((r) => [r.display_description, hpStr(r.bbd_price, r.row_key, r.row_type)]),
          styles: { fontSize: 5.5, cellPadding: 1.2 },
          headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold", fontSize: 6 },
          alternateRowStyles: { fillColor: [245, 247, 251] },
          tableWidth: "auto",
        });
        y = (doc as any).lastAutoTable.finalY + 3;
      }
    }

    drawPdfFooters(doc, margin);
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
    const sections = [...new Set(lensRows.map((r) => r.section))].sort(compareCategoryOrder);
    sections.forEach((sec) => {
      aoa.push([sec]);
      const headers = [sec, `${currency} Price`];
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
        aoa.push([sec, `${currency} Price`]);
        rows.forEach((row) => {
          aoa.push([row.display_description, hpNum(row.bbd_price, row.row_key, row.row_type)]);
        });
        aoa.push([]);
      }
    }

    aoa.push([STANDARD_FOOTER]);

    writeAoaWorkbook(aoa, "List", `${version.name}_List.xlsx`);
    toast({ title: "List Excel exported" });
    logExport("Excel", "List");
  };

  // ── List CSV ─────────────────────────────────────────────────────────────────
  const exportListCSV = () => {
    const lines: string[] = [];
    companyHeader.forEach((h) => lines.push(h));
    lines.push("");

    const lensRows = getPrimaryRows();
    const sections = [...new Set(lensRows.map((r) => r.section))].sort(compareCategoryOrder);
    sections.forEach((sec) => {
      lines.push(`"${sec}"`);
      const csvHeaders = [`"${sec}"`, `${currency} Price`];
      if (showMargins && !isCustomerExport) csvHeaders.push("Margin %");
      lines.push(csvHeaders.join(","));
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
        lines.push([`"${sec}"`, `${currency} Price`].join(","));
        rows.forEach((row) => {
          lines.push([`"${row.display_description}"`, hpNum(row.bbd_price, row.row_key, row.row_type)].join(","));
        });
      }
    }

    lines.push("");
    lines.push(STANDARD_FOOTER);

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
    const sections = [...new Set(lensRows.map((r) => r.section))].sort(compareCategoryOrder);
    const sectionsHtml = sections
      .map((sec) => {
        const rowsHtml = lensRows
          .filter((r) => r.section === sec)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((row) => `<tr><td>${row.display_description}</td><td style="text-align:right">${hpStr(row.bbd_price, row.row_key, row.row_type)}</td></tr>`)
          .join("");
        return `<h3 style="color:#1e4db7;margin:20px 0 8px">${sec}</h3>
      <table><thead><tr><th>${sec}</th><th>Price (${currency})</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
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
        <table><thead><tr><th>${sec}</th><th>Price (${currency})</th></tr></thead><tbody>${rowsH}</tbody></table>`;
      }
    }

    const headerBlock = `${buildLogoHtml(logoUrl)}<h1>${companyName}</h1><p class="tagline">${tagline}</p><p class="contact">Phone: ${phone} &nbsp;|&nbsp; ${website}</p><h2>${versionTitle}</h2>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${version.name}</title>
<style>
  body{font-family:sans-serif;font-size:12px;margin:40px}
  h1{color:#1e4db7;margin-bottom:2px} h2{color:#444;font-size:11px;font-weight:normal;margin-bottom:2px}
  .tagline{font-size:11px;color:#444;margin:2px 0}.contact{font-size:10px;color:#666;margin:2px 0 8px}
  h3{color:#1e4db7;font-size:12px;font-weight:bold}
  table{border-collapse:collapse;width:100%;margin-bottom:12px}
  th,td{border:1px solid #ccc;padding:4px 10px}
  th{background:#1e4db7;color:#fff;text-align:left}
  tr:nth-child(even){background:#f5f7fb}
  footer{font-size:10px;color:#888;margin-top:24px;text-align:center}
</style></head><body>
${headerBlock}
${sectionsHtml}
${addonsHtml}
<footer>${STANDARD_FOOTER}</footer>
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
    let y = drawPdfHeader(doc, margin);

    const lensRows = getPrimaryRows();

    const lensSectionMap = new Map<string, typeof lensRows>();
    for (const row of lensRows) {
      const section = row.section || "Lenses";
      if (!lensSectionMap.has(section)) lensSectionMap.set(section, []);
      lensSectionMap.get(section)!.push(row);
    }

    const sortedSections = [...lensSectionMap.entries()].sort((a, b) => compareCategoryOrder(a[0], b[0]));

    const lensIdxMap = new Map<string, number>();
    allLenses.forEach((l) => lensIdxMap.set(l.id, l.index_value));

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

      const head = [includeMargin ? [sec, `${currency} Price`, "Margin %"] : [sec, `${currency} Price`]];
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
          head: [[sec, `Price (${currency})`]],
          body: rows.map((r) => [r.display_description, hpStr(r.bbd_price, r.row_key, r.row_type)]),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 251] },
          tableWidth: "auto",
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }

    drawPdfFooters(doc, margin);
    doc.save(`${version.name}_List.pdf`);
    toast({ title: "List PDF exported" });
    logExport("PDF", "List");
  };

  const btnBase = "h-6 text-[10px] gap-1 px-2 font-medium";
  const showMatrix = catalogType === "rx";

  return (
    <div className="flex items-center gap-1 flex-wrap no-print">
      {/* Show Margins toggle (internal only) */}
      {canEdit && (
        <div className="flex items-center gap-1 mr-1.5">
          <span className="text-[9px] font-medium text-muted-foreground">Margins</span>
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
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide pr-0.5">Matrix</span>
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
          <div className="w-px h-4 bg-border mx-0.5" />
        </>
      )}

      {/* List exports */}
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide pr-0.5">List</span>
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
