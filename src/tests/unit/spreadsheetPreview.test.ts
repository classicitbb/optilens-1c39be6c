import { describe, expect, it } from "vitest";
import writeXlsxFile from "write-excel-file/browser";
import { attachmentPreviewKind } from "@/features/admin/email/attachmentPreview";
import { loadSpreadsheet, SPREADSHEET_MAX_BYTES, spreadsheetFormat } from "@/lib/spreadsheetPreview";

describe("spreadsheetFormat", () => {
  it("detects xlsx and csv by extension or MIME type", () => {
    expect(spreadsheetFormat("prices.XLSX", "application/octet-stream")).toBe("xlsx");
    expect(spreadsheetFormat("blob", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("xlsx");
    expect(spreadsheetFormat("orders.csv", null)).toBe("csv");
    expect(spreadsheetFormat("orders", "text/csv; charset=utf-8")).toBe("csv");
  });
  it("does not claim legacy .xls or other files", () => {
    expect(spreadsheetFormat("old.xls", "application/vnd.ms-excel")).toBeNull();
    expect(spreadsheetFormat("notes.txt", "text/plain")).toBeNull();
  });
  it("lets the email preview open xlsx attachments", () => {
    expect(attachmentPreviewKind("prices.xlsx", "application/octet-stream")).toEqual({ kind: "xlsx" });
  });
});

describe("loadSpreadsheet", () => {
  it("reads csv rows with quoted commas", async () => {
    const [sheet] = await loadSpreadsheet(new Blob(['sku,name\n1,"Lens, 1.50"\n']), "csv");
    expect(sheet.rows).toEqual([["sku", "name"], ["1", "Lens, 1.50"]]);
    expect(sheet.truncated).toBe(false);
  });
  it("flags csv files longer than the row cap", async () => {
    const csv = Array.from({ length: 250 }, (_, i) => `row${i}`).join("\n");
    const [sheet] = await loadSpreadsheet(new Blob([csv]), "csv");
    expect(sheet.rows).toHaveLength(200);
    expect(sheet.truncated).toBe(true);
  });
  it("rejects files over the size limit", async () => {
    const big = new Blob([new Uint8Array(SPREADSHEET_MAX_BYTES.csv + 1)]);
    await expect(loadSpreadsheet(big, "csv")).rejects.toThrow(/too large/);
  });
  it("reads every sheet of an xlsx workbook", async () => {
    const blob = await writeXlsxFile([
      { sheet: "Prices", data: [[{ value: "sku" }, { value: "price" }], [{ value: "A1" }, { value: 12.5 }]] },
      { sheet: "Notes", data: [[{ value: "hello" }]] },
    ]).toBlob();
    const sheets = await loadSpreadsheet(blob, "xlsx");
    expect(sheets.map((sheet) => sheet.name)).toEqual(["Prices", "Notes"]);
    expect(sheets[0].rows).toEqual([["sku", "price"], ["A1", "12.5"]]);
  });
  it("reports unreadable xlsx files", async () => {
    await expect(loadSpreadsheet(new Blob(["not a zip"]), "xlsx")).rejects.toThrow(/could not be read/);
  });
});
