import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";
import { buildPricelistEditorPath, buildPricelistSelectionPath } from "@/features/pricelists/routes";
import { getPricelistRoute } from "@/lib/productLinks";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("pricelist navigation", () => {
  it("registers the list and version-scoped editor routes", () => {
    expect(APP_ROUTE_REGISTRY).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "admin.pricing.pricelists", path: "/admin/pricing/pricelists", status: "active" }),
      expect.objectContaining({ id: "admin.pricing.pricelist-editor", path: "/admin/pricing/pricelists/:versionId/:section", status: "hidden" }),
    ]));

    const routes = read("src/routes/admin/AdminRoutes.tsx");
    expect(routes).toContain('path="pricing/pricelists"');
    expect(routes).toContain('path="pricing/pricelists/:versionId/:section?"');
    expect(routes.match(/LegacyPricelistRedirect section=/g)).toHaveLength(6);
  });

  it("shows one Pricelists sidebar entry instead of three generic price editors", () => {
    const apps = read("src/features/admin/core/config/apps.ts");
    expect(apps).toContain("{ label: 'Pricelists', route: '/admin/pricing/pricelists'");
    expect(apps).not.toContain("{ label: 'RX Lens Prices', route: '/admin/pricing/rx-lenses'");
    expect(apps).not.toContain("{ label: 'Stock Lens Prices', route: '/admin/pricing/stock-lenses'");
    expect(apps).not.toContain("{ label: 'Supplies Prices', route: '/admin/pricing/supplies'");
  });

  it("builds explicit selection and editor links without choosing a version silently", () => {
    expect(buildPricelistSelectionPath("stock", "lens id")).toBe("/admin/pricing/pricelists?section=stock&id=lens+id");
    expect(buildPricelistEditorPath(42, "supplies", "supply/id")).toBe("/admin/pricing/pricelists/42/supplies?id=supply%2Fid");
    expect(getPricelistRoute("lens", "lens id")).toBe("/admin/pricing/pricelists?section=stock&id=lens+id");
    expect(getPricelistRoute("supply", "supply/id")).toBe("/admin/pricing/pricelists?section=supplies&id=supply%2Fid");
  });

  it("keeps visited editors mounted and guards unsaved exits", () => {
    const editor = read("src/pages/admin/PricelistEditorPage.tsx");
    expect(editor).toContain("visitedSections");
    expect(editor).toContain('hidden={section !== "rx"}');
    expect(editor).toContain('hidden={section !== "stock"}');
    expect(editor).toContain('hidden={section !== "supplies"}');
    expect(editor).toContain('window.addEventListener("beforeunload"');
    expect(editor).toContain("window.confirm(LEAVE_WARNING)");
    expect(editor).not.toContain("versions[0]");
  });

  it("places every section's actions beside the version editor tabs", () => {
    const editor = read("src/pages/admin/PricelistEditorPage.tsx");
    const rx = read("src/pages/admin/RxLensPricesPage.tsx");
    const stock = read("src/pages/admin/StockLensPricesPage.tsx");
    const supplies = read("src/pages/admin/BuySellPricesPage.tsx");

    expect(editor.match(/headerActionsElement=\{section ===/g)).toHaveLength(3);
    expect(rx).toContain("createPortal(");
    expect(stock).toContain("createPortal(");
    expect(supplies).toContain("createPortal(");
  });

  it("provides search, sorting, and 25-row pagination from the single properties manager", () => {
    const list = read("src/components/admin/PricelistVersionsSection.tsx");
    expect(list).toContain("const PAGE_SIZE = 25");
    expect(list).toContain('placeholder="Search pricelists by name"');
    expect(list).toContain("toggleSort");
    expect(list).toContain("Edit properties");
    expect(() => read("src/components/admin/VersionSelectorPanel.tsx")).toThrow();
  });
});
