import writeXlsxFile, { type SheetData } from "write-excel-file/browser";

/**
 * Drop-in helpers for browser-side `.xlsx` generation.
 */

/** Create a workbook, add a sheet from an array-of-arrays, and trigger download. */
export async function writeAoaWorkbook(
  aoa: any[][],
  sheetName: string,
  fileName: string,
) {
  await writeXlsxFile(toSheetData(aoa), { sheet: sheetName }).toFile(fileName);
}

/** Create a workbook with multiple sheets from json arrays and trigger download. */
export async function writeMultiSheetWorkbook(
  sheets: { name: string; json: Record<string, any>[] }[],
  fileName: string,
) {
  await writeXlsxFile(
    sheets.map(({ name, json }) => ({
      sheet: name,
      data: toSheetData(jsonToAoa(json)),
    })),
  ).toFile(fileName);
}

function jsonToAoa(json: Record<string, any>[]) {
  if (json.length === 0) return [];

  const headers = Object.keys(json[0]);
  return [headers, ...json.map((row) => headers.map((header) => row[header]))];
}

function toSheetData(rows: any[][]): SheetData {
  return rows.map((row) => row.map((value) => value ?? null));
}
