import { parseCsvPreview } from "@/features/admin/email/csvPreview";

export type SpreadsheetFormat = "csv" | "xlsx";
export type PreviewSheet = { name: string; rows: string[][]; truncated: boolean };

export const SPREADSHEET_MAX_ROWS = 200;
export const SPREADSHEET_MAX_COLUMNS = 40;
export const SPREADSHEET_MAX_BYTES: Record<SpreadsheetFormat, number> = { csv: 1024 * 1024, xlsx: 5 * 1024 * 1024 };

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Spreadsheet kind we can render in the browser, from file name and/or MIME type. Legacy .xls is not supported. */
export function spreadsheetFormat(filename: string, mime: string | null | undefined): SpreadsheetFormat | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const type = (mime ?? "").toLowerCase().split(";")[0].trim();
  if (ext === "xlsx" || type === XLSX_MIME) return "xlsx";
  if (ext === "csv" || type === "text/csv" || type === "application/csv") return "csv";
  return null;
}

const cellText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  return String(value);
};

/** Read the visible part (first rows and columns) of every sheet. */
export async function loadSpreadsheet(file: Blob, format: SpreadsheetFormat): Promise<PreviewSheet[]> {
  if (file.size > SPREADSHEET_MAX_BYTES[format]) {
    throw new Error("This file is too large to preview. Download it to open the full spreadsheet.");
  }
  if (format === "csv") {
    const rows = parseCsvPreview(await file.text(), SPREADSHEET_MAX_ROWS + 1);
    return [{ name: "Sheet 1", rows: rows.slice(0, SPREADSHEET_MAX_ROWS), truncated: rows.length > SPREADSHEET_MAX_ROWS }];
  }
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  let sheets;
  try {
    sheets = await readXlsxFile(file);
  } catch {
    throw new Error("This spreadsheet could not be read. Download it to open it in Excel.");
  }
  return sheets.map(({ sheet, data }) => ({
    name: sheet,
    rows: data.slice(0, SPREADSHEET_MAX_ROWS).map((row) => row.map(cellText)),
    truncated: data.length > SPREADSHEET_MAX_ROWS,
  }));
}
