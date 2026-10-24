import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("admin NPS dashboard route accessibility", () => {
  it("registers the canonical NPS dashboard route", () => {
    expect(APP_ROUTE_REGISTRY.find((route) => route.id === "admin.website.nps" && route.path === "/admin/website/nps" && route.status === "active")).toBeTruthy();
  });

  it("declares the runtime route, website navigation, and role permission", () => {
    const routes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/admin/AdminRoutes.tsx"), "utf8");
    const websiteApp = fs.readFileSync(path.resolve(process.cwd(), "src/features/admin/core/config/apps.ts"), "utf8");
    const permissions = fs.readFileSync(path.resolve(process.cwd(), "src/hooks/useRolePermissions.ts"), "utf8");

    expect(routes).toContain('const NpsDashboardPage = lazyWithRetry(() => import("@/pages/admin/NpsDashboardPage"));');
    expect(routes).toContain('<Route path="website/nps" element={<NpsDashboardPage />} />');
    expect(websiteApp).toContain("{ label: 'Customer Feedback (NPS)', route: '/admin/website/nps'");
    expect(permissions).toContain('"/admin/website/nps": "website"');
  });
});
