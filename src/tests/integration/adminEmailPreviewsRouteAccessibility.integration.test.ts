import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

describe("admin email previews route accessibility", () => {
  it("registers the canonical email previews route", () => {
    expect(APP_ROUTE_REGISTRY.find((route) => route.id === "admin.settings.email-previews" && route.path === "/admin/settings/email-previews" && route.status === "active")).toBeTruthy();
  });

  it("declares the runtime route and settings navigation", () => {
    const routes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/admin/AdminRoutes.tsx"), "utf8");
    const settingsApp = fs.readFileSync(path.resolve(process.cwd(), "src/features/admin/core/config/apps.ts"), "utf8");

    expect(routes).toContain('const EmailPreviewsPage = lazy(() => import("@/pages/admin/settings/EmailPreviewsPage"));');
    expect(routes).toContain('<Route path="settings/email-previews" element={<EmailPreviewsPage />} />');
    expect(settingsApp).toContain("{ label: 'Email Previews', route: '/admin/settings/email-previews'");
  });
});
