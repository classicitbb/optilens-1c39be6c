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

  it("registers /professionals/freight-delivery-policy in the public route registry", () => {
    expect(
      APP_ROUTE_REGISTRY.find((route) => route.id === "public.professionals.freight-delivery-policy" && route.path === "/professionals/freight-delivery-policy" && route.status === "active"),
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

  it("declares a runtime route for /professionals/freight-delivery-policy", () => {
    const publicRoutesPath = path.resolve(process.cwd(), "src/routes/public/PublicRoutes.tsx");
    const source = fs.readFileSync(publicRoutesPath, "utf8");

    expect(source).toContain('<Route path="professionals/freight-delivery-policy" element={<FreightDeliveryPolicyPage />} />');
  });

  it("registers canonical patient topic routes in the public route registry", () => {
    const patientRouteIds = [
      "public.patients",
      "public.patients.lens-differences",
      "public.patients.progressive-lenses",
      "public.patients.anti-fatigue-lenses",
      "public.patients.caring-for-glasses",
      "public.patients.computer-mobile-use",
      "public.patients.sunlight-protection",
      "public.patients.regular-eye-exams",
    ];

    for (const routeId of patientRouteIds) {
      expect(APP_ROUTE_REGISTRY.find((route) => route.id === routeId && route.status === "active")).toBeTruthy();
    }
  });

  it("declares runtime routes for the canonical patient topic pages", () => {
    const publicRoutesPath = path.resolve(process.cwd(), "src/routes/public/PublicRoutes.tsx");
    const source = fs.readFileSync(publicRoutesPath, "utf8");

    expect(source).toContain('<Route path="patients/lens-differences" element={<LensDifferencesPage />} />');
    expect(source).toContain('<Route path="patients/progressive-lenses" element={<ProgressiveLensesPage />} />');
    expect(source).toContain('<Route path="patients/anti-fatigue-lenses" element={<AntiFatigueLensesPage />} />');
    expect(source).toContain('<Route path="patients/caring-for-glasses" element={<CaringForGlassesPage />} />');
    expect(source).toContain('<Route path="patients/computer-mobile-use" element={<ComputerMobileUsePage />} />');
    expect(source).toContain('<Route path="patients/sunlight-protection" element={<SunlightProtectionPage />} />');
    expect(source).toContain('<Route path="patients/regular-eye-exams" element={<RegularEyeExamsPage />} />');
  });
});
