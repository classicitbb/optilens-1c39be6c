import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("public route accessibility", () => {
  it("does not register /v2 in the public route registry", () => {
    expect(
      APP_ROUTE_REGISTRY.find((route) => route.path === "/v2"),
    ).toBeFalsy();
  });

  it("registers /optical-retail-websites in the public route registry", () => {
    expect(
      APP_ROUTE_REGISTRY.find((route) => route.id === "public.optical-retail-websites" && route.path === "/optical-retail-websites" && route.status === "active"),
    ).toBeTruthy();
  });

  it("does not declare a runtime route for /v2", () => {
    const publicRoutesPath = path.resolve(process.cwd(), "src/routes/public/PublicRoutes.tsx");
    const source = fs.readFileSync(publicRoutesPath, "utf8");

    expect(source).not.toContain('path="v2"');
  });

  it("declares a runtime route for /optical-retail-websites", () => {
    const publicRoutesPath = path.resolve(process.cwd(), "src/routes/public/PublicRoutes.tsx");
    const source = fs.readFileSync(publicRoutesPath, "utf8");

    expect(source).toContain('<Route path="optical-retail-websites" element={<OpticalRetailWebsitesPage />} />');
  });
});
