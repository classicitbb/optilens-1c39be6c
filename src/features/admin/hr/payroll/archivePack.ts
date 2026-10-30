// Payroll archive pack: everything about an approved run in one zip, readable
// without the app. Register and payslips as PDF, the same figures plus the
// statutory and bank schedules as Excel, and a manifest with a checksum per file.
// Pure apart from the libraries' own output, so tests can open what it builds.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { zipSync } from "fflate";
import writeXlsxFile from "write-excel-file/browser";
import { employeeDisplayName, type Employee, type EmployeeSensitive } from "@/features/admin/hr/useEmployees";
import { periodLabel, remittanceDue, type PayrollRun, type PayslipRow } from "./usePayroll";

export const COMPANY_NAME = "Classic Visions";

export interface ArchiveTotals {
  employees: number;
  gross: number;
  nis: number;
  paye: number;
  rr_levy: number;
  other_deductions: number;
  net: number;
}

export interface ArchiveInput {
  run: PayrollRun;
  payslips: PayslipRow[];
  employees: Map<string, Employee>;
  /** Government IDs and bank details, for the statutory and bank schedules. */
  sensitive: Map<string, EmployeeSensitive | null>;
  version: number;
  generatedAt: Date;
  generatedBy: string;
}

export interface ArchiveFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface ArchivePack {
  fileName: string;
  storagePath: string;
  zip: Uint8Array;
  sha256: string;
  files: ArchiveFile[];
  totals: ArchiveTotals;
}

const MONEY_KEYS = ["gross", "nis", "paye", "rr_levy", "other_deductions", "net"] as const;

const amount = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const isEarning = (code: string) => code === "base" || code === "earning";

/** YYYY-MM of the pay period, the key the pack is filed under. */
export const periodKey = (periodStart: string) => periodStart.slice(0, 7);

export const archiveFileName = (periodStart: string, version: number) => `payroll-${periodKey(periodStart)}-v${version}`;

const safeName = (value: string) => value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();

export const sha256Hex = async (data: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const archiveTotals = (payslips: PayslipRow[]): ArchiveTotals => {
  const totals = { employees: payslips.length } as ArchiveTotals;
  for (const key of MONEY_KEYS) {
    // Sum in cents so the totals match the register to the cent.
    totals[key] = payslips.reduce((sum, p) => sum + Math.round(Number(p[key]) * 100), 0) / 100;
  }
  return totals;
};

interface Row {
  payslip: PayslipRow;
  employee: Employee | undefined;
  sensitive: EmployeeSensitive | null;
  number: string;
  name: string;
}

const sortedRows = (input: ArchiveInput): Row[] =>
  input.payslips
    .map((payslip) => {
      const employee = input.employees.get(payslip.employee_id);
      return {
        payslip,
        employee,
        sensitive: input.sensitive.get(payslip.employee_id) ?? null,
        number: employee?.employee_no ?? "",
        name: employee ? employeeDisplayName(employee) : "Unknown employee",
      };
    })
    .sort((a, b) => a.number.localeCompare(b.number) || a.name.localeCompare(b.name));

const pdfBytes = (doc: jsPDF) => new Uint8Array(doc.output("arraybuffer"));

const pdfHeader = (doc: jsPDF, title: string, lines: string[]) => {
  doc.setFontSize(14);
  doc.text(COMPANY_NAME, 14, 16);
  doc.setFontSize(11);
  doc.text(title, 14, 23);
  doc.setFontSize(9);
  lines.forEach((line, i) => doc.text(line, 14, 30 + i * 5));
  return 30 + lines.length * 5 + 2;
};

const runLines = (input: ArchiveInput) => {
  const { run } = input;
  return [
    `Pay date: ${run.pay_date ?? "not set"} · NIS, PAYE and R&R due by ${remittanceDue(run.period_start)}`,
    `Status: ${run.status} · Approved ${run.approved_at ? run.approved_at.slice(0, 16).replace("T", " ") + " UTC" : "—"}`,
    `Archive v${input.version}, generated ${input.generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC by ${input.generatedBy}`,
  ];
};

const registerPdf = (input: ArchiveInput, rows: Row[], totals: ArchiveTotals) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = pdfHeader(doc, `Payroll register · ${periodLabel(input.run.period_start)}`, runLines(input));
  autoTable(doc, {
    startY,
    head: [["No.", "Employee", "Gross", "NIS", "PAYE", "R&R", "Other deductions", "Net"]],
    body: rows.map((r) => [r.number, r.name, ...MONEY_KEYS.map((k) => amount(Number(r.payslip[k])))]),
    foot: [["", `Total (${totals.employees})`, ...MONEY_KEYS.map((k) => amount(totals[k]))]],
    styles: { fontSize: 9 },
    columnStyles: Object.fromEntries([2, 3, 4, 5, 6, 7].map((i) => [i, { halign: "right" as const }])),
  });
  return pdfBytes(doc);
};

const payslipPdf = (input: ArchiveInput, row: Row) => {
  const { payslip } = row;
  const doc = new jsPDF();
  const startY = pdfHeader(doc, `Payslip · ${periodLabel(input.run.period_start)}`, [
    `${row.name}${row.number ? ` (${row.number})` : ""}${row.employee?.job_title ? ` · ${row.employee.job_title}` : ""}`,
    `Pay date: ${input.run.pay_date ?? "not set"}`,
  ]);
  autoTable(doc, {
    startY,
    head: [["", "Amount"]],
    body: [
      ...payslip.lines.map((line) => [line.label, isEarning(line.code) ? amount(line.amount) : `-${amount(line.amount)}`]),
      ["Gross pay", amount(payslip.gross)],
      ["Net pay", amount(payslip.net)],
    ],
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: "right" } },
  });
  if (payslip.splits.length) {
    autoTable(doc, {
      head: [["Paid as", "Method", "Amount"]],
      body: payslip.splits.map((s) => [s.label, s.method.replace(/_/g, " "), amount(s.amount)]),
      styles: { fontSize: 10 },
      columnStyles: { 2: { halign: "right" } },
    });
  }
  return pdfBytes(doc);
};

const cell = (value: string | number | null | undefined) =>
  value == null || value === "" ? null : typeof value === "number" ? { value, format: "#,##0.00" } : { value };

const header = (labels: string[]) => labels.map((value) => ({ value, fontWeight: "bold" as const }));

const workbook = async (input: ArchiveInput, rows: Row[], totals: ArchiveTotals) => {
  const register = [
    header(["No.", "Employee", "Gross", "NIS", "PAYE", "R&R levy", "Other deductions", "Net"]),
    ...rows.map((r) => [cell(r.number), cell(r.name), ...MONEY_KEYS.map((k) => cell(Number(r.payslip[k])))]),
    [null, cell(`Total (${totals.employees})`), ...MONEY_KEYS.map((k) => cell(totals[k]))],
  ];
  const lines = [
    header(["No.", "Employee", "Line", "Type", "Amount", "Calculated (if edited)"]),
    ...rows.flatMap((r) =>
      r.payslip.lines.map((line) => [
        cell(r.number),
        cell(r.name),
        cell(line.label),
        cell(line.code),
        cell(isEarning(line.code) ? line.amount : -line.amount),
        cell(line.calculated ?? null),
      ]),
    ),
  ];
  const statutory = [
    header(["No.", "Employee", "NIS no.", "Tax file no.", "Gross", "NIS (employee)", "PAYE", "R&R levy"]),
    ...rows.map((r) => [
      cell(r.number),
      cell(r.name),
      cell(r.sensitive?.nis_no),
      cell(r.sensitive?.tax_file_no),
      cell(Number(r.payslip.gross)),
      cell(Number(r.payslip.nis)),
      cell(Number(r.payslip.paye)),
      cell(Number(r.payslip.rr_levy)),
    ]),
    [null, cell("Total"), null, null, cell(totals.gross), cell(totals.nis), cell(totals.paye), cell(totals.rr_levy)],
  ];
  const bank = [
    header(["No.", "Employee", "Paid as", "Method", "Bank", "Branch", "Account no.", "Amount"]),
    ...rows.flatMap((r) => {
      const splits = r.payslip.splits.length ? r.payslip.splits : [{ label: "Net pay", method: "not set", amount: Number(r.payslip.net) }];
      return splits.map((s) => {
        const toBank = s.method === "bank_transfer";
        return [
          cell(r.number),
          cell(r.name),
          cell(s.label),
          cell(s.method.replace(/_/g, " ")),
          cell(toBank ? r.sensitive?.bank_name : null),
          cell(toBank ? r.sensitive?.bank_branch : null),
          cell(toBank ? r.sensitive?.bank_account_no : null),
          cell(s.amount),
        ];
      });
    }),
  ];
  const blob = await writeXlsxFile([
    { sheet: "Register", data: register },
    { sheet: "Payslip lines", data: lines },
    { sheet: "Statutory", data: statutory },
    { sheet: "Bank payments", data: bank },
  ]).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
};

export const buildPayrollArchive = async (input: ArchiveInput): Promise<ArchivePack> => {
  const rows = sortedRows(input);
  const totals = archiveTotals(input.payslips);
  const base = archiveFileName(input.run.period_start, input.version);
  const period = periodKey(input.run.period_start);

  const contents: Record<string, Uint8Array> = {
    [`Payroll register ${period}.pdf`]: registerPdf(input, rows, totals),
    [`Payroll ${period}.xlsx`]: await workbook(input, rows, totals),
  };
  for (const row of rows) {
    contents[`payslips/${safeName(`${row.number} ${row.name}`)}.pdf`] = payslipPdf(input, row);
  }

  const files: ArchiveFile[] = [];
  for (const [path, data] of Object.entries(contents)) {
    files.push({ path, sha256: await sha256Hex(data), bytes: data.byteLength });
  }
  const manifest = {
    kind: "payroll-archive",
    company: COMPANY_NAME,
    run_id: input.run.id,
    period,
    pay_date: input.run.pay_date,
    status: input.run.status,
    approved_at: input.run.approved_at,
    version: input.version,
    generated_at: input.generatedAt.toISOString(),
    generated_by: input.generatedBy,
    rules_sources: [...new Set(input.payslips.map((p) => p.rules_source).filter(Boolean))],
    totals,
    files,
  };
  contents["manifest.json"] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

  // Fixed timestamps inside the zip keep its bytes, and so its checksum, the same for the same input.
  const zip = zipSync(
    Object.fromEntries(Object.entries(contents).map(([path, data]) => [`${base}/${path}`, data])),
    { mtime: input.generatedAt },
  );
  return {
    fileName: `${base}.zip`,
    storagePath: `${period}/${base}.zip`,
    zip,
    sha256: await sha256Hex(zip),
    files,
    totals,
  };
};
