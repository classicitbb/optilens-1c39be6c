import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { archiveTotals, buildPayrollArchive, sha256Hex, type ArchiveInput } from "@/features/admin/hr/payroll/archivePack";
import type { Employee, EmployeeSensitive } from "@/features/admin/hr/useEmployees";
import type { PayrollRun, PayslipRow } from "@/features/admin/hr/payroll/usePayroll";

// Made-up people and figures only: packs hold real pay data in production.
const employee = (id: string, no: string, first: string, last: string) =>
  ({ id, employee_no: no, first_name: first, last_name: last, preferred_name: null, job_title: "Technician" }) as Employee;

const payslip = (employeeId: string, gross: number, nis: number, paye: number, rr: number, other: number, splits: PayslipRow["splits"] = []): PayslipRow => ({
  id: `slip-${employeeId}`,
  run_id: "run-1",
  employee_id: employeeId,
  base_pay: gross,
  annual_allowances: 25000,
  gross,
  taxable: gross,
  nis,
  paye,
  rr_levy: rr,
  other_deductions: other,
  net: Math.round((gross - nis - paye - rr - other) * 100) / 100,
  lines: [
    { code: "base", label: "Salary", amount: gross },
    { code: "nis", label: "NIS", amount: nis, deductionKey: "nis" },
    { code: "paye", label: "PAYE", amount: paye, deductionKey: "paye", calculated: paye - 1 },
    { code: "rr_levy", label: "R&R levy", amount: rr, deductionKey: "rr_levy" },
  ],
  splits,
  adjustments: [],
  overrides: {},
  warnings: [],
  rules_source: "BRA Policy Note OGC No. 001/2026",
});

const run: PayrollRun = {
  id: "run-1",
  period_start: "2026-10-01",
  pay_date: "2026-10-28",
  status: "approved",
  notes: null,
  approved_at: "2026-10-27T15:00:00Z",
  paid_at: null,
  created_at: "2026-10-20T12:00:00Z",
};

const input = (): ArchiveInput => ({
  run,
  payslips: [
    payslip("e2", 3000.1, 330.01, 120, 7.5, 0),
    payslip("e1", 4000, 440, 250, 10, 100, [
      { label: "Savings", method: "third_party", amount: 500 },
      { label: "Main account", method: "bank_transfer", amount: 2700 },
    ]),
  ],
  employees: new Map([
    ["e1", employee("e1", "T-01", "Ann", "Tester")],
    ["e2", employee("e2", "T-02", "Ben", "Sample")],
  ]),
  sensitive: new Map<string, EmployeeSensitive | null>([
    ["e1", { employee_id: "e1", national_registration_no: null, nis_no: "N-111", tax_file_no: "TF-1", bank_name: "Test Bank", bank_branch: "Main", bank_account_no: "000123" }],
    ["e2", null],
  ]),
  version: 1,
  generatedAt: new Date("2026-10-30T18:00:00Z"),
  generatedBy: "hr@example.com",
});

describe("payroll archive pack", () => {
  it("totals to the cent", () => {
    const totals = archiveTotals(input().payslips);
    expect(totals).toMatchObject({ employees: 2, gross: 7000.1, nis: 770.01, paye: 370, rr_levy: 17.5, other_deductions: 100 });
    expect(totals.net).toBe(5742.59);
  });

  it("builds a zip with the register, workbook, a payslip each and a manifest", async () => {
    const pack = await buildPayrollArchive(input());
    expect(pack.fileName).toBe("payroll-2026-10-v1.zip");
    expect(pack.storagePath).toBe("2026-10/payroll-2026-10-v1.zip");

    const entries = unzipSync(pack.zip);
    expect(Object.keys(entries).sort()).toEqual([
      "payroll-2026-10-v1/Payroll 2026-10.xlsx",
      "payroll-2026-10-v1/Payroll register 2026-10.pdf",
      "payroll-2026-10-v1/manifest.json",
      "payroll-2026-10-v1/payslips/T-01 Ann Tester.pdf",
      "payroll-2026-10-v1/payslips/T-02 Ben Sample.pdf",
    ]);
    expect(strFromU8(entries["payroll-2026-10-v1/Payroll register 2026-10.pdf"].slice(0, 5))).toBe("%PDF-");
    // xlsx is itself a zip.
    expect(strFromU8(entries["payroll-2026-10-v1/Payroll 2026-10.xlsx"].slice(0, 2))).toBe("PK");
  });

  it("lists every file in the manifest with a checksum that matches", async () => {
    const pack = await buildPayrollArchive(input());
    const entries = unzipSync(pack.zip);
    const manifest = JSON.parse(strFromU8(entries["payroll-2026-10-v1/manifest.json"]));
    expect(manifest).toMatchObject({ period: "2026-10", version: 1, run_id: "run-1", rules_sources: ["BRA Policy Note OGC No. 001/2026"] });
    expect(manifest.files).toHaveLength(4);
    for (const file of manifest.files) {
      const data = entries[`payroll-2026-10-v1/${file.path}`];
      expect(file.bytes).toBe(data.byteLength);
      expect(file.sha256).toBe(await sha256Hex(data));
    }
    expect(pack.sha256).toBe(await sha256Hex(pack.zip));
  });

  it("puts bank details only on bank transfer lines", async () => {
    const pack = await buildPayrollArchive(input());
    const xlsx = unzipSync(unzipSync(pack.zip)["payroll-2026-10-v1/Payroll 2026-10.xlsx"]);
    const strings = Object.entries(xlsx)
      .filter(([name]) => name.startsWith("xl/"))
      .map(([, data]) => strFromU8(data))
      .join("\n");
    expect(strings).toContain("000123");
    expect(strings).toContain("Bank payments");
    expect(strings.match(/000123/g)).toHaveLength(1);
  });
});
