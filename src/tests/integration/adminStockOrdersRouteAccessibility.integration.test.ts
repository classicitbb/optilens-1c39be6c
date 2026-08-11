import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";

describe("admin stock order builder route accessibility", () => {
  it("registers the canonical stock order route", () => {
    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({
      id: "admin.website.stock-orders",
      path: "/admin/website/stock-orders",
      authMode: "admin",
      status: "active",
    }));
  });

  it("keeps Orders and Pages / Content as the third and fourth Website buttons", () => {
    expect(ADMIN_APPS.website.sidebarItems.slice(0, 4).map((item) => item.label)).toEqual([
      "Website Portals",
      "Store / Products",
      "Orders",
      "Pages / Content",
    ]);
  });

  it("declares the runtime route, sidebar item, navigation entry, and role permission", () => {
    const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    const routes = read("src/routes/admin/AdminRoutes.tsx");
    const apps = read("src/features/admin/core/config/apps.ts");
    const navigation = read("src/config/navigationRegistry.ts");
    const permissions = read("src/hooks/useRolePermissions.ts");
    const launcher = read("src/components/admin/AppLauncher.tsx");
    const search = read("src/components/admin/GlobalSearch.tsx");
    const labScopeMigration = read("supabase/migrations/20260811010000_scope_stock_order_accounts_to_labs.sql");

    expect(routes).toContain('const StockOrderBuilderPage = lazy(() => import("@/pages/admin/StockOrderBuilderPage"));');
    expect(routes).toContain('<Route path="website/stock-orders" element={<StockOrderBuilderPage />} />');
    expect(apps).toContain("{ label: 'Stock Order Builder', route: '/admin/website/stock-orders'");
    expect(navigation).toContain('id: "admin.website.stock-orders"');
    expect(navigation).toContain('shortcutKey: "stock-order"');
    expect(launcher).toContain('defaultRoute: "/admin/website/stock-orders"');
    expect(search).toContain("APP_ROUTE_REGISTRY");
    expect(search).toContain('route.domain === "admin-console"');
    expect(permissions).toContain('"/admin/website/stock-orders": "website"');
    expect(labScopeMigration).toContain("lower(btrim(tag.name)) = 'is lab'");
  });
});
