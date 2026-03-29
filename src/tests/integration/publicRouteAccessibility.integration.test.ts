import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("public route accessibility", () => {
  it("registers /v2 in the public route registry", () => {
    expect(
      APP_ROUTE_REGISTRY.find((route) => route.id === "public.home-v2" && route.path === "/v2" && route.status === "active"),
    ).toBeTruthy();
  });

  it("declares a runtime route for /v2", () => {
    const publicRoutesPath = path.resolve(process.cwd(), "src/routes/public/PublicRoutes.tsx");
    const source = fs.readFileSync(publicRoutesPath, "utf8");

    expect(source).toContain('<Route path="v2" element={<FrontPageV2 />} />');
  });
});
