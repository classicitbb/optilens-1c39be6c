import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("atlas route accessibility", () => {
  it("registers Atlas as a standalone, admin-guarded route outside /admin", () => {
    for (const [id, routePath] of [
      ["atlas", "/atlas"],
      ["atlas.space", "/atlas/:space"],
      ["atlas.page", "/atlas/:space/:articleSlug"],
    ] as const) {
      const route = APP_ROUTE_REGISTRY.find((entry) => entry.id === id);
      expect(route).toMatchObject({ path: routePath, authMode: "admin", layout: "standalone-shell", status: "active" });
    }
  });

  it("mounts every Atlas route behind the admin guard in App.tsx", () => {
    const source = read("src/App.tsx");
    expect(source).toContain('<Route path="/atlas" element={<AtlasProtected />} />');
    expect(source).toContain('<Route path="/atlas/:space" element={<AtlasProtected />} />');
    expect(source).toContain('<Route path="/atlas/:space/:articleSlug" element={<AtlasProtected />} />');
    expect(source).toMatch(/const AtlasProtected = \(\) => \(\s*<AdminProtectedRoute>/);
  });

  it("keeps the old wiki, SOP and website-content URLs as redirect-only registry entries", () => {
    const expected: Record<string, string> = {
      "admin.knowledge.wiki": "/atlas/wiki",
      "admin.knowledge.wiki.article": "/atlas/wiki/:articleSlug",
      "admin.knowledge.sops": "/atlas/sops",
      "admin.knowledge.sops.article": "/atlas/sops/:articleSlug",
      "admin.website.content": "/atlas/website",
    };
    for (const [id, redirectTo] of Object.entries(expected)) {
      expect(APP_ROUTE_REGISTRY.find((route) => route.id === id)).toMatchObject({ status: "hidden", redirectTo });
    }
  });

  it("redirects the old admin routes, preserving the article slug", () => {
    const source = read("src/routes/admin/AdminRoutes.tsx");
    expect(source).toContain('<Route path="knowledge/wiki" element={<AtlasLegacyRedirect spaceId="wiki" />} />');
    expect(source).toContain('<Route path="knowledge/wiki/:articleSlug" element={<AtlasLegacyRedirect spaceId="wiki" />} />');
    expect(source).toContain('<Route path="knowledge/sops" element={<AtlasLegacyRedirect spaceId="sops" />} />');
    expect(source).toContain('<Route path="knowledge/sops/:articleSlug" element={<AtlasLegacyRedirect spaceId="sops" />} />');
    expect(source).toContain('<Route path="website/content" element={<AtlasLegacyRedirect spaceId="website" />} />');
    // The legacy aliases that used to point at the old pages now point at Atlas.
    expect(source).not.toContain('Navigate to="/admin/website/content"');
    expect(source).not.toContain('Navigate to="/admin/knowledge/');
  });

  it("has one editor: the duplicate pages are gone", () => {
    for (const file of ["src/pages/admin/ContentManagerPage.tsx", "src/pages/admin/AdminSopsPage.tsx", "src/pages/admin/AdminWikiPage.tsx"]) {
      expect(fs.existsSync(path.resolve(process.cwd(), file)), file).toBe(false);
    }
  });
});
