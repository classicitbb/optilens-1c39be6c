import ExcelJS from "exceljs";

/**
 * Drop-in helpers replacing the vulnerable `xlsx` (SheetJS) package.
 * All Excel generation now uses `exceljs`.
 */

/** Create a workbook, add a sheet from an array-of-arrays, and trigger download. */
export async function writeAoaWorkbook(
  aoa: any[][],
  sheetName: string,
  fileName: string,
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  for (const row of aoa) {
    ws.addRow(row);
  }
  await downloadWorkbook(wb, fileName);
}

/** Create a workbook with multiple sheets from json arrays and trigger download. */
export async function writeMultiSheetWorkbook(
  sheets: { name: string; json: Record<string, any>[] }[],
  fileName: string,
) {
  const wb = new ExcelJS.Workbook();
  for (const { name, json } of sheets) {
    const ws = wb.addWorksheet(name);
    if (json.length === 0) continue;
    const headers = Object.keys(json[0]);
    ws.addRow(headers);
    for (const row of json) {
      ws.addRow(headers.map((h) => row[h]));
    }
  }
  await downloadWorkbook(wb, fileName);
}

async function downloadWorkbook(wb: ExcelJS.Workbook, fileName: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
