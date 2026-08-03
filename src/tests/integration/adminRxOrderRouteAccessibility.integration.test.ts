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
});
