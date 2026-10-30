import { describe, expect, it } from "vitest";
import {
  buildRunLines,
  journalCsv,
  monthlyCharge,
  parseCsv,
  projectSchedule,
  reclassJournal,
  rollForward,
  runJournal,
  type AssetInput,
  type BookInput,
  type ClassAccounts,
} from "@/features/admin/finance/assets/engine";

const asset = (over: Partial<Omit<AssetInput, "book">> & { book?: Partial<BookInput> } = {}): AssetInput => ({
  id: "a1",
  classId: "me",
  cost: 9600,
  inServiceOn: "2026-11-15",
  status: "in_service",
  expenseTarget: "overhead",
  ...over,
  book: { method: "straight_line", usefulLifeMonths: 96, residualValue: 0, convention: "full_year", accumDep: 0, openingAsOf: null, ...over.book },
});

const classes: ClassAccounts[] = [
  { id: "me", name: "Machinery & Equipment", costAccount: "Machinery and equipment", accumAccount: "Accum dep - M&E", expenseOverheadAccount: "Depreciation", expenseCogsAccount: "Depreciation - COS" },
  { id: "veh", name: "Vehicles", costAccount: "Vehicles", accumAccount: "Accum dep - Vehicles", expenseOverheadAccount: "Depreciation", expenseCogsAccount: "Depreciation - COS" },
];

describe("monthly depreciation", () => {
  it("continues imported assets at a twelfth of the annual charge after the cut-over", () => {
    // Velocity TT coater: QBO has been charging 867.46 a month.
    const coater = asset({ cost: 83276.24, inServiceOn: "2025-08-22", book: { accumDep: 18216.67, openingAsOf: "2026-10-31" } });
    expect(monthlyCharge(coater, "2026-10-01")).toBe(0);
    expect(monthlyCharge(coater, "2026-11-01")).toBe(867.46);
  });

  it("charges only what is left on the last month of life", () => {
    const nearlyDone = asset({ cost: 1000, inServiceOn: "2019-01-01", book: { usefulLifeMonths: 96, accumDep: 995, openingAsOf: "2026-10-31" } });
    expect(monthlyCharge(nearlyDone, "2026-11-01")).toBe(5);
    expect(monthlyCharge({ ...nearlyDone, book: { ...nearlyDone.book, accumDep: 1000 } }, "2026-12-01")).toBe(0);
  });

  it("charges a full year in the year of purchase under the full-year convention", () => {
    // Bought in November: November catches up January to November, December adds one month.
    const a = asset();
    expect(monthlyCharge(a, "2026-11-01")).toBe(1100);
    const dec = monthlyCharge({ ...a, book: { ...a.book, accumDep: 1100 } }, "2026-12-01");
    expect(dec).toBe(100);
    expect(1100 + dec).toBe(1200);
    expect(monthlyCharge({ ...a, book: { ...a.book, accumDep: 1200 } }, "2027-01-01")).toBe(100);
  });

  it("starts in the in-service month under full-month and halves it under mid-month", () => {
    expect(monthlyCharge(asset({ book: { convention: "full_month" } }), "2026-11-01")).toBe(100);
    expect(monthlyCharge(asset({ book: { convention: "mid_month" } }), "2026-11-01")).toBe(50);
  });

  it("charges nothing before service, for drafts or after disposal", () => {
    expect(monthlyCharge(asset(), "2026-10-01")).toBe(0);
    expect(monthlyCharge(asset({ status: "draft" }), "2026-11-01")).toBe(0);
    expect(monthlyCharge(asset({ status: "disposed" }), "2026-11-01")).toBe(0);
  });

  it("stops at the residual value", () => {
    const a = asset({ cost: 1200, inServiceOn: "2026-01-10", book: { usefulLifeMonths: 12, residualValue: 200, convention: "full_month", accumDep: 950 } });
    expect(monthlyCharge(a, "2026-12-01")).toBe(50);
  });

  it("switches declining balance to straight line when that charges more", () => {
    const db = asset({ cost: 12000, inServiceOn: "2026-01-01", book: { method: "declining_balance", ratePct: 25, usefulLifeMonths: 60, convention: "full_month" } });
    expect(monthlyCharge(db, "2026-01-01")).toBe(250);
    // Late in life the remaining NBV over the months left is larger than 25% a year.
    const late = { ...db, book: { ...db.book, accumDep: 10000 } };
    expect(monthlyCharge(late, "2030-11-01")).toBe(1000);
  });

  it("builds run lines only for assets with a charge", () => {
    const lines = buildRunLines([asset({ id: "x" }), asset({ id: "y", status: "draft" }), asset({ id: "z", classId: "veh", expenseTarget: "cogs" })], "2026-11-01");
    expect(lines).toEqual([
      { assetId: "x", classId: "me", expenseTarget: "overhead", amount: 1100 },
      { assetId: "z", classId: "veh", expenseTarget: "cogs", amount: 1100 },
    ]);
  });

  it("projects a schedule that ends at full depreciation", () => {
    const rows = projectSchedule(asset({ cost: 1200, inServiceOn: "2026-01-01", book: { usefulLifeMonths: 12, convention: "full_month" } }), "2026-01-01", 14);
    expect(rows[0].charge).toBe(100);
    expect(rows[11].accumDep).toBe(1200);
    expect(rows[11].nbv).toBe(0);
  });
});

describe("journals", () => {
  it("summarises a run per class and expense target, balanced", () => {
    const journal = runJournal(
      [
        { assetId: "a", classId: "me", expenseTarget: "cogs", amount: 867.46 },
        { assetId: "b", classId: "me", expenseTarget: "overhead", amount: 10 },
        { assetId: "c", classId: "veh", expenseTarget: "overhead", amount: 1303.88 },
      ],
      classes,
      "2026-11-01",
    );
    const debits = journal.reduce((s, l) => s + l.debit, 0);
    const credits = journal.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBeCloseTo(2181.34, 2);
    expect(credits).toBeCloseTo(debits, 2);
    expect(journal.find((l) => l.account === "Depreciation")?.debit).toBe(1313.88);
    expect(journal.find((l) => l.account === "Depreciation - COS")?.debit).toBe(867.46);
    expect(journal.find((l) => l.account === "Accum dep - M&E")?.credit).toBe(877.46);
    expect(journal[0].memo).toBe("Depreciation November 2026");
  });

  it("reclasses per-asset QBO sub-accounts into the class accounts", () => {
    const journal = reclassJournal([{ classId: "me", legacyAccount: "Machinery and equipment:85 Velocity TT Coater", cost: 83276.24, accumDep: 18216.67 }], classes);
    expect(journal).toEqual([
      { account: "Machinery and equipment", debit: 83276.24, credit: 0, memo: expect.any(String) },
      { account: "Machinery and equipment:85 Velocity TT Coater:Depreciation", debit: 18216.67, credit: 0, memo: expect.any(String) },
      { account: "Accum dep - M&E", debit: 0, credit: 18216.67, memo: expect.any(String) },
      { account: "Machinery and equipment:85 Velocity TT Coater:Original cost", debit: 0, credit: 83276.24, memo: expect.any(String) },
    ]);
  });

  it("writes QBO's journal import layout and reads it back", () => {
    const csv = journalCsv([{ account: 'Depreciation, "COS"', debit: 5, credit: 0, memo: "m" }], "DEP-2026-11", "2026-11-30");
    expect(parseCsv(csv)).toEqual([
      ["Journal No", "Journal Date", "Account Name", "Debits", "Credits", "Description"],
      ["DEP-2026-11", "2026-11-30", 'Depreciation, "COS"', "5.00", "", "m"],
    ]);
  });
});

describe("roll-forward", () => {
  const assets = [
    { id: "old", classId: "me", cost: 1000, acquiredOn: "2020-01-01", inServiceOn: "2020-01-01", disposedOn: null, openingAccumDep: 400, openingAsOf: "2026-10-31" },
    { id: "sold", classId: "me", cost: 500, acquiredOn: "2021-01-01", inServiceOn: "2021-01-01", disposedOn: "2026-12-15", openingAccumDep: 300, openingAsOf: "2026-10-31" },
    { id: "new", classId: "me", cost: 1200, acquiredOn: "2026-11-15", inServiceOn: "2026-11-15", disposedOn: null, openingAccumDep: 0, openingAsOf: null },
  ];
  const lines = [
    { assetId: "old", period: "2026-11-01", amount: 10 },
    { assetId: "old", period: "2026-12-01", amount: 10 },
    { assetId: "sold", period: "2026-11-01", amount: 5 },
    { assetId: "new", period: "2026-11-01", amount: 1100 },
    { assetId: "new", period: "2026-12-01", amount: 100 },
  ];

  it("reconciles opening, additions, disposals and depreciation per class", () => {
    const [row] = rollForward(assets, lines, "2026-11-01", "2026-12-31");
    expect(row).toMatchObject({
      openingCost: 1500,
      additions: 1200,
      disposalsCost: 500,
      closingCost: 2200,
      openingAccum: 700,
      depreciation: 1225,
      disposalsAccum: 305,
      closingAccum: 1620,
      openingNbv: 800,
      closingNbv: 580,
    });
  });
});

describe("csv reader", () => {
  it("handles quotes, embedded commas and newlines, CRLF and a BOM", () => {
    expect(parseCsv('\uFEFFa,b\r\n"x, y","line\nbreak"\r\n\r\n')).toEqual([["a", "b"], ["x, y", "line\nbreak"]]);
  });
});
