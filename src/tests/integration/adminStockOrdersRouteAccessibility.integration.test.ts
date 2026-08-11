import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("admin stock order builder route accessibility", () => {
  it("registers the canonical stock order route", () => {
    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({
      id: "admin.website.stock-orders",
      path: "/admin/website/stock-orders",
      authMode: "admin",
      status: "active",
    }));
  });

  it("declares the runtime route, sidebar item, navigation entry, and role permission", () => {
    const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    const routes = read("src/routes/admin/AdminRoutes.tsx");
    const apps = read("src/features/admin/core/config/apps.ts");
    const navigation = read("src/config/navigationRegistry.ts");
    const permissions = read("src/hooks/useRolePermissions.ts");

    expect(routes).toContain('const StockOrderBuilderPage = lazy(() => import("@/pages/admin/StockOrderBuilderPage"));');
    expect(routes).toContain('<Route path="website/stock-orders" element={<StockOrderBuilderPage />} />');
    expect(apps).toContain("{ label: 'Stock Order Builder', route: '/admin/website/stock-orders'");
    expect(navigation).toContain('id: "admin.website.stock-orders"');
    expect(permissions).toContain('"/admin/website/stock-orders": "website"');
  });
});
