import { describe, expect, it } from "vitest";
import { clickUpImportSource } from "@/features/atlas/import/clickUpImportSource";
import { detectLoss, planImport } from "@/features/atlas/import/planImport";
import { clickUpFinanceExport } from "./clickUpFixture";

describe("ClickUp import dry run", () => {
  const bundle = clickUpImportSource.parse(clickUpFinanceExport);

  it("maps space, folders, documents and nested pages", () => {
    expect(bundle.spaceName).toBe("Business Manual");
    expect(bundle.documentCount).toBe(3);
    expect(bundle.groups.map((group) => group.sectionName)).toEqual(["40000 Finance", "10000 Leadership"]);
  });

  it("reports counts, hierarchy depth and empty pages", () => {
    const report = planImport(bundle);
    expect(report.spaceId).toBe("business-manual");
    expect(report.counts).toMatchObject({ documents: 3, sections: 2, pages: 12, emptyPages: 4, maxDepth: 4 });
    const supplier = report.pages.find((page) => page.title === "Supplier Cost");
    expect(supplier).toMatchObject({ depth: 3, section: "40000 Finance", parentExternalId: "p5234" });
  });

  it("flags what would not survive, per page, with counts", () => {
    const report = planImport(bundle);
    const supplier = report.lossy.filter((item) => item.title === "Supplier Cost");
    expect(supplier.find((item) => item.kind === "table")).toMatchObject({ count: 2, severity: "lossy" });
    expect(supplier.find((item) => item.kind === "image")?.count).toBe(1);
    expect(supplier.find((item) => item.kind === "mention")?.severity).toBe("lossy");
    expect(supplier.find((item) => item.kind === "html")?.count).toBeGreaterThan(0);
    expect(supplier.find((item) => item.kind === "rule")?.severity).toBe("note");
    expect(report.lossy.find((item) => item.title === "Modifying Pricing" && item.kind === "checklist")?.count).toBe(2);
    expect(report.counts.pagesWithLoss).toBe(2);
  });

  it("reports slug collisions inside the import and against existing pages, and numbers them", () => {
    const report = planImport(bundle, ["welcome-guide", "business-manual-index"]);
    expect(report.collisions.some((collision) => collision.slug === "index" && collision.kind === "within-import")).toBe(true);
    const slugs = report.pages.filter((page) => page.title === "Index").map((page) => page.slug);
    expect(new Set(slugs).size).toBe(2);
    const clash = planImport(bundle, ["supplier-cost"]);
    expect(clash.collisions).toContainEqual({ slug: "supplier-cost", titles: ["Supplier Cost"], kind: "existing-page" });
    expect(clash.pages.find((page) => page.title === "Supplier Cost")?.slug).toBe("supplier-cost-2");
  });

  it("is read-only and rejects a file that is not an export", () => {
    expect(() => clickUpImportSource.parse({ nope: true })).toThrow(/docs/);
    expect(detectLoss({ externalId: "x", title: "Plain", markdown: "Just text." })).toEqual([]);
  });
});
