import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculatePayslip } from "@/features/admin/hr/payroll/engine";

// Local-only check against the salary workbook; see scripts/hr/export_workbook_parity.py.
// The export holds pay data, so it never lives in the repo and CI skips this file.
const exportPath = process.env.HR_PARITY_JSON;

interface WorkbookMonth { month: number; gross: number; nis: number; paye: number; rr: number }
interface WorkbookEmployee { employee_no: string; annual_allowances: number; months: WorkbookMonth[] }

describe.skipIf(!exportPath)("payroll engine vs salary workbook", () => {
  // The describe body still runs when skipped, so only read the file when it was given.
  const { employees } = (exportPath ? JSON.parse(readFileSync(exportPath, "utf8")) : { employees: [] }) as { employees: WorkbookEmployee[] };
  const mismatches: string[] = [];
  const payeGaps: string[] = [];

  for (const emp of employees) {
    for (const m of emp.months) {
      const period = `2026-${String(m.month).padStart(2, "0")}-01`;
      // A blank R&R column means the employee was not charged the levy.
      const slip = calculatePayslip({ periodStart: period, basePay: m.gross, annualAllowances: emp.annual_allowances, rrLevyExempt: m.rr === 0 });
      const at = `${emp.employee_no} ${period.slice(0, 7)}`;
      if (slip.nis !== m.nis) mismatches.push(`${at} NIS engine ${slip.nis} workbook ${m.nis}`);
      // CV-02's R&R column holds a flat amount that is not the levy. Elsewhere the
      // workbook rounds exact half cents up in some months and down in others, so
      // the engine (always half up) may differ by one cent there.
      if (Math.abs(slip.rrLevy - m.rr) > 0.011 && emp.employee_no !== "CV-02") mismatches.push(`${at} R&R engine ${slip.rrLevy} workbook ${m.rr}`);
      if (slip.paye !== m.paye) payeGaps.push(`${at} PAYE engine ${slip.paye} workbook ${m.paye} diff ${(slip.paye - m.paye).toFixed(2)}`);
    }
  }

  if (process.env.HR_PARITY_REPORT) {
    writeFileSync(process.env.HR_PARITY_REPORT, [...mismatches, "", "PAYE gaps:", ...payeGaps].join("\n"));
  }

  it("matches NIS and R&R to the cent", () => {
    expect(mismatches).toEqual([]);
  });
});
