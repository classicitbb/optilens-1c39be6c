import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("sales app closure", () => {
  it("registers the CRM and Website replacements as canonical admin routes", () => {
    expect(APP_ROUTE_REGISTRY).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "admin.crm.proposals", path: "/admin/crm/proposals", authMode: "admin", status: "active" }),
      expect.objectContaining({ id: "admin.website.quotations", path: "/admin/website/quotations", authMode: "admin", status: "active" }),
      expect.objectContaining({ id: "admin.website.orders", path: "/admin/website/orders", authMode: "admin", status: "active" }),
    ]));
  });

  it("declares the replacements and no longer declares Sales or standalone order routes", () => {
    const routes = read("src/routes/admin/AdminRoutes.tsx");

    expect(routes).toContain('<Route path="crm/proposals" element={<CatalogPublisherV2Page />} />');
    expect(routes).toContain('<Route path="website/quotations" element={<QuotationsListPage />} />');
    expect(routes).toContain('<Route path="website/orders" element={<OrdersPage />} />');
    expect(routes).not.toContain('path="sales');
    expect(routes).not.toContain('path="orders"');
  });

  it("places each surface in its destination app and removes Sales from the launcher", () => {
    const apps = read("src/features/admin/core/config/apps.ts");
    const navigation = read("src/config/navigationRegistry.ts");

    expect(apps).toContain("{ label: 'Proposals', route: '/admin/crm/proposals'");
    expect(apps).toContain("{ label: 'Quotations', route: '/admin/website/quotations'");
    expect(apps).toContain("{ label: 'Orders', route: '/admin/website/orders'");
    expect(apps).not.toContain("sales: {");
    expect(navigation).not.toContain('id: "admin.sales"');
  });
});
