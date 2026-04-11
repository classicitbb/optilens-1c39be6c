import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("admin wiki route accessibility", () => {
  it("registers canonical admin wiki routes in the route registry", () => {
    expect(
      APP_ROUTE_REGISTRY.find((route) => route.id === "admin.knowledge.wiki" && route.path === "/admin/knowledge/wiki" && route.status === "active"),
    ).toBeTruthy();
    expect(
      APP_ROUTE_REGISTRY.find((route) => route.id === "admin.knowledge.wiki.article" && route.path === "/admin/knowledge/wiki/:articleSlug" && route.status === "active"),
    ).toBeTruthy();
  });

  it("declares admin wiki routes under the admin layout", () => {
    const adminRoutesPath = path.resolve(process.cwd(), "src/routes/admin/AdminRoutes.tsx");
    const source = fs.readFileSync(adminRoutesPath, "utf8");

    expect(source).toContain('<Route path="knowledge/wiki" element={<AdminWikiPage />} />');
    expect(source).toContain('<Route path="knowledge/wiki/:articleSlug" element={<AdminWikiPage />} />');
  });
});
