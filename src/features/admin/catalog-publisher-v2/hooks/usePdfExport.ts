import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PackageLine, ProposalSection } from "../types";

interface ExportArgs {
  accountLabel?: string;
  lines: PackageLine[];
  sections: ProposalSection[];
  total: number;
}

export const exportClinicalProposalPdf = ({ accountLabel, lines, sections, total }: ExportArgs) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 58, 110);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Classic Visions — Clinical Proposal", 12, 15);
  doc.setFontSize(10);
  doc.text(`Account: ${accountLabel || "General"}`, 12, 21);

  doc.setTextColor(31, 41, 55);
  let y = 34;
  sections.forEach((section) => {
    doc.setFontSize(12);
    doc.setTextColor(15, 58, 110);
    doc.text(section.title, 12, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const wrapped = doc.splitTextToSize(section.body, 180);
    doc.text(wrapped, 12, y);
    y += wrapped.length * 4 + 4;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  doc.addPage();
  doc.setFontSize(13);
  doc.setTextColor(15, 58, 110);
  doc.text("Selected Package", 12, 16);

  autoTable(doc, {
    startY: 20,
    head: [["SKU", "Product", "Qty", "Unit", "Line Total"]],
    body: lines.map((line) => [
      line.item.sku || "—",
      line.item.name,
      String(line.qty),
      `$${(line.item.unit_price ?? 0).toFixed(2)}`,
      `$${((line.item.unit_price ?? 0) * line.qty).toFixed(2)}`,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 58, 110], textColor: 255 },
    columnStyles: { 2: { halign: "center", cellWidth: 16 }, 3: { halign: "right", cellWidth: 24 }, 4: { halign: "right", cellWidth: 28 } },
    margin: { left: 12, right: 12 },
  });

  const endY = (doc as any).lastAutoTable?.finalY ?? 40;
  doc.setFontSize(11);
  doc.text(`Proposal Total: $${total.toFixed(2)}`, 150, endY + 8, { align: "right" });

  doc.save(`classic-visions-proposal-${Date.now()}.pdf`);
};
