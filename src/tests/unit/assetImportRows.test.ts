import { describe, expect, it } from "vitest";
import { lifeMonths, parseImport, totalsByAccount } from "@/features/admin/finance/assets/importRows";

const CLASSES = ["Machinery & Equipment", "Vehicles"];
const HEADER = "name,class,acquired_on,in_service_on,cost,opening_accum_dep,useful_life_months,expense_target,legacy_qbo_account";

describe("asset import rows", () => {
  it("reads a good row, accepting years for useful life and thousands separators", () => {
    const [row] = parseImport(`${HEADER}\nVelocity TT Coater,machinery & equipment,2025-08-22,,"83,276.24",18216.67,8 Yrs,cogs,Machinery and equipment:85 Velocity TT Coater`, CLASSES);
    expect(row).toMatchObject({
      line: 2,
      name: "Velocity TT Coater",
      class: "Machinery & Equipment",
      cost: 83276.24,
      opening_accum_dep: 18216.67,
      useful_life_months: 96,
      expense_target: "cogs",
      errors: [],
      warnings: [],
    });
  });

  it("blocks rows with more depreciation than cost, zero cost or an unknown class", () => {
    const rows = parseImport(
      [
        HEADER,
        "Lenovo Mini Computers,Machinery & Equipment,2019-12-31,,2046.19,2390.44,96,,F51",
        "Mazda 2,Vehicles,2012-12-02,,0,0,60,,",
        "Fridge,Kitchen,2016-12-31,,1899.98,0,96,,",
      ].join("\n"),
      CLASSES,
    );
    expect(rows[0].errors).toContain("Depreciation is more than cost (negative book value)");
    expect(rows[1].errors).toContain("Cost must be more than zero");
    expect(rows[2].errors).toContain('Unknown class "Kitchen"');
  });

  it("warns about fully depreciated assets, missing QBO accounts and duplicates", () => {
    const rows = parseImport([HEADER, "Coburn 506,Machinery & Equipment,2005-12-20,,4200,4200,120,,F10", "Coburn 506,Machinery & Equipment,2005-12-20,,4200,4200,120,,F10", "Planer,Machinery & Equipment,,,100,0,96,,"].join("\n"), CLASSES);
    expect(rows[0].warnings).toEqual(["Fully depreciated; confirm it still exists"]);
    expect(rows[1].warnings).toContain("Same name and QBO account as line 2");
    expect(rows[2].warnings).toContain("No purchase date; the cut-over date will be used");
    expect(rows[2].warnings).toContain("No QBO account; it will be left out of the reclass journal");
  });

  it("says which required columns are missing", () => {
    expect(() => parseImport("name,cost\nx,1", CLASSES)).toThrow("class, opening_accum_dep, useful_life_months");
  });

  it("totals per QBO cost account so classes sharing an account reconcile together", () => {
    const rows = parseImport([HEADER, "A,Machinery & Equipment,,,100,40,96,,", "B,Vehicles,,,50.10,0.05,60,,"].join("\n"), CLASSES);
    const totals = totalsByAccount(rows, new Map([["Machinery & Equipment", "Furniture & Fixtures"], ["Vehicles", "Furniture & Fixtures"]]));
    expect(totals).toEqual([{ account: "Furniture & Fixtures", cost: 150.1, accumDep: 40.05, nbv: 110.05 }]);
  });

  it("parses useful life in months or years", () => {
    expect(lifeMonths("96")).toBe(96);
    expect(lifeMonths("5Yrs")).toBe(60);
    expect(lifeMonths("10 years")).toBe(120);
    expect(lifeMonths("")).toBeNaN();
  });
});
