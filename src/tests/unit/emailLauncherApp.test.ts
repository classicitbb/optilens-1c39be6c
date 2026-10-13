import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ACTIVE_NAVIGATION_REGISTRY } from "@/config/navigationRegistry";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";

describe("Email launcher app", () => {
  it("is a launcher application next to CRM", () => {
    const entry = ACTIVE_NAVIGATION_REGISTRY.find((item) => item.appKey === "email" && !item.shortcutKey);
    expect(entry).toMatchObject({ group: "launcher", routeId: "admin.email", status: "active" });
    const crm = ACTIVE_NAVIGATION_REGISTRY.find((item) => item.id === "admin.crm");
    expect(entry!.order).toBeGreaterThan(crm!.order);
    expect(ADMIN_APPS.email.defaultRoute).toBe("/admin/email");
  });

  it("opens without the admin sidebar (its own app rail replaces it)", () => {
    const layout = readFileSync("src/components/admin/AdminLayout.tsx", "utf8");
    expect(layout).toMatch(/hideSidebar = [^;]*isEmail/);
  });
});
