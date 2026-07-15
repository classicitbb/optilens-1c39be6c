import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("admin edge-function status route accessibility", () => {
  it("registers the canonical internal status route", () => {
    expect(
      APP_ROUTE_REGISTRY.find((route) => route.id === "admin.settings.edge-functions" && route.path === "/admin/settings/edge-functions" && route.authMode === "admin" && route.status === "active"),
    ).toBeTruthy();
  });

  it("declares the runtime route and settings navigation", () => {
    const routes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/admin/AdminRoutes.tsx"), "utf8");
    const settingsApp = fs.readFileSync(path.resolve(process.cwd(), "src/features/admin/core/config/apps.ts"), "utf8");

    expect(routes).toContain('const EdgeFunctionStatusPage = lazy(() => import("@/pages/admin/settings/EdgeFunctionStatusPage"));');
    expect(routes).toContain('<Route path="settings/edge-functions" element={<EdgeFunctionStatusPage />} />');
    expect(settingsApp).toContain("{ label: 'Edge Function Status', route: '/admin/settings/edge-functions'");
  });
});
