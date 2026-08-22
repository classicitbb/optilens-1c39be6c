import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("admin Rx order route accessibility", () => {
  const routeIds = [
    "admin.pricing.alias-mapping",
    "admin.website.quotations.new-rx",
    "admin.website.quotations.rx",
    "admin.website.rx-submissions",
  ];

  it("registers each canonical Rx route as an admin route", () => {
    for (const id of routeIds) {
      expect(APP_ROUTE_REGISTRY.find((route) =>
        route.id === id && route.authMode === "admin" && route.status === "active",
      )).toBeTruthy();
    }
  });

  it("declares each canonical Rx route in the admin router", () => {
    const adminRoutesPath = path.resolve(process.cwd(), "src/routes/admin/AdminRoutes.tsx");
    const source = fs.readFileSync(adminRoutesPath, "utf8");

    expect(source).toContain('path="pricing/alias-mapping"');
    expect(source).toContain('path="website/quotations/new-rx"');
    expect(source).toContain('path="website/quotations/rx/:id"');
    expect(source).toContain('path="website/rx-submissions"');
  });

  it("exposes Activities and the Rx order form as direct header launcher shortcuts", () => {
    const navigation = fs.readFileSync(path.resolve(process.cwd(), "src/config/navigationRegistry.ts"), "utf8");
    const launcher = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/AppLauncher.tsx"), "utf8");

    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({
      id: "admin.crm.activities",
      path: "/admin/crm/activities",
      authMode: "admin",
    }));
    expect(navigation).toContain('shortcutKey: "activities"');
    expect(navigation).toContain('shortcutKey: "rx-order"');
    expect(launcher).toContain('defaultRoute: "/admin/crm/activities"');
    expect(launcher).toContain('defaultRoute: "/admin/website/quotations/new-rx"');
  });
});
