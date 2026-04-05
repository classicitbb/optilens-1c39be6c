import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogTemplate } from "@/hooks/useCatalogTemplates";

const getCoverSubtitleForExport = (rawSubtitle: string | null | undefined): string => {
  if (!rawSubtitle) return "";
  try {
    const parsed = JSON.parse(rawSubtitle) as { subtitle?: string };
    return typeof parsed?.subtitle === "string" ? parsed.subtitle : rawSubtitle;
  } catch {
    return rawSubtitle;
  }
};

export const generateCatalogPdf = async (template: CatalogTemplate, settings: any) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(30, 77, 183);
  doc.rect(0, 0, pw, ph, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text(template.cover_title || template.name, pw / 2, ph / 2 - 10, { align: "center" });
  const coverSubtitle = getCoverSubtitleForExport(template.cover_subtitle);
  if (coverSubtitle) {
    doc.setFontSize(14);
    doc.text(coverSubtitle, pw / 2, ph / 2 + 5, { align: "center" });
  }
  if (settings?.company_name) {
    doc.setFontSize(10);
    doc.text(settings.company_name, pw / 2, ph - 30, { align: "center" });
    if (settings.tel) doc.text(settings.tel, pw / 2, ph - 24, { align: "center" });
    if (settings.email) doc.text(settings.email, pw / 2, ph - 18, { align: "center" });
  }

  const { data: versions } = await supabase
    .from("pricelist_versions").select("id, name").order("id", { ascending: true }).limit(1);
  const vId = versions?.[0]?.id;

  if (vId) {
    const { data: rows } = await supabase
      .from("pricelist_catalog_rows")
      .select("section, display_description, bbd_price, row_type, catalog_type")
      .eq("pricelist_version_id", vId)
      .order("sort_order");

    const sections: Record<string, { description: string; price: number | null }[]> = {};
    (rows ?? []).forEach((r: any) => {
      if (!sections[r.section]) sections[r.section] = [];
      sections[r.section].push({ description: r.display_description, price: r.bbd_price });
    });

    doc.addPage();
    doc.setTextColor(30, 77, 183);
    doc.setFontSize(18);
    doc.text("Table of Contents", 20, 30);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    const sKeys = Object.keys(sections);
    sKeys.forEach((s, i) => { doc.text(`${i + 1}. ${s}`, 25, 48 + i * 8); });

    for (const sectionName of sKeys) {
      doc.addPage();
      doc.setFillColor(30, 77, 183);
      doc.rect(0, 0, pw, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(sectionName, 15, 10);
      autoTable(doc, {
        startY: 20,
        head: [["Description", "Price (BBD)"]],
        body: sections[sectionName].map((r) => [r.description, r.price != null ? `$${r.price.toFixed(2)}` : "—"]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 1: { halign: "right", cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
    }

    const { data: addons } = await supabase.from("addons").select("name, price").eq("is_active", true).order("sort_order");
    if (addons && addons.length > 0) {
      doc.addPage();
      doc.setFillColor(30, 77, 183);
      doc.rect(0, 0, pw, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text("Add-Ons & Extras", 15, 10);
      autoTable(doc, {
        startY: 20,
        head: [["Add-On", "Price (BBD)"]],
        body: addons.map((a: any) => [a.name, `$${a.price.toFixed(2)}`]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 1: { halign: "right", cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i - 1} of ${pages - 1}`, pw / 2, ph - 8, { align: "center" });
    if (settings?.company_name) doc.text(settings.company_name, 15, ph - 8);
  }

  doc.save(`${template.name.replace(/\s+/g, "_")}_Catalog.pdf`);
};
