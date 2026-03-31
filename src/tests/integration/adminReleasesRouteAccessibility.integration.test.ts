import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("admin releases route accessibility", () => {
  it("registers canonical releases route in the route registry", () => {
    expect(
      APP_ROUTE_REGISTRY.find(
        (route) => route.id === "admin.settings.releases" && route.path === "/admin/settings/releases" && route.status === "active",
      ),
    ).toBeTruthy();
  });

  it("declares runtime route for /admin/settings/releases", () => {
    const adminRoutesPath = path.resolve(process.cwd(), "src/routes/admin/AdminRoutes.tsx");
    const source = fs.readFileSync(adminRoutesPath, "utf8");

    expect(source).toContain('const ReleasesPage = lazy(() => import("@/pages/admin/settings/ReleasesPage"));');
    expect(source).toContain('<Route path="settings/releases" element={<ReleasesPage />} />');
  });

  it("adds releases navigation inside settings app", () => {
    const appConfigPath = path.resolve(process.cwd(), "src/features/admin/core/config/apps.ts");
    const source = fs.readFileSync(appConfigPath, "utf8");

    expect(source).toContain("{ label: 'System Releases', route: '/admin/settings/releases'");
  });
});
