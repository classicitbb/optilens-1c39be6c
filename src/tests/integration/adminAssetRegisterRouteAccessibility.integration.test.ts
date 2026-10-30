import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const ROUTES = [
  { id: "admin.finance.assets", path: "/admin/finance/assets", page: "AssetsPage" },
  { id: "admin.finance.assets.detail", path: "/admin/finance/assets/:assetId", page: "AssetDetailPage" },
  { id: "admin.finance.assets.runs", path: "/admin/finance/assets/runs", page: "DepreciationRunsPage" },
  { id: "admin.finance.assets.run", path: "/admin/finance/assets/runs/:runId", page: "DepreciationRunPage" },
  { id: "admin.finance.assets.reports", path: "/admin/finance/assets/reports", page: "AssetReportsPage" },
  { id: "admin.finance.assets.import", path: "/admin/finance/assets/import", page: "AssetImportPage" },
];

describe("asset register routes", () => {
  it("registers each canonical, admin-only route", () => {
    for (const r of ROUTES) {
      expect(APP_ROUTE_REGISTRY.find((route) => route.id === r.id && route.path === r.path && route.authMode === "admin" && route.status === "active")).toBeTruthy();
    }
  });

  it("keeps every page behind the asset guard", () => {
    const routes = read("src/routes/admin/AdminRoutes.tsx");
    for (const r of ROUTES) {
      expect(routes).toContain(`const ${r.page} = lazyWithRetry(() => import("@/pages/admin/finance/assets/${r.page}"));`);
      expect(routes).toContain(`path="${r.path.replace("/admin/", "")}" element={<AssetsRoute><${r.page} /></AssetsRoute>}`);
    }
  });

  it("lets only admins and the office administrator in, matching can_manage_assets()", () => {
    const guard = read("src/features/admin/finance/assets/AssetsRoute.tsx");
    const migration = read("supabase/migrations/20261030200000_asset_register.sql");
    expect(guard).toContain('realRole !== "admin" && realRole !== "office_admin"');
    expect(migration).toContain("WHERE user_id = _user_id AND role IN ('admin', 'office_admin')");
  });

  it("lists the register and runs in Finance navigation", () => {
    const apps = read("src/features/admin/core/config/apps.ts");
    expect(apps).toContain("{ label: 'Fixed Assets', route: '/admin/finance/assets'");
    expect(apps).toContain("{ label: 'Depreciation Runs', route: '/admin/finance/assets/runs'");
  });
});
