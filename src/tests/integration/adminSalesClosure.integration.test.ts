import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("sales app closure", () => {
  it("registers CRM proposals and the Orders app as canonical admin routes", () => {
    expect(APP_ROUTE_REGISTRY).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "admin.crm.proposals", path: "/admin/crm/proposals", authMode: "admin", status: "active" }),
      expect.objectContaining({ id: "admin.orders.quotations", path: "/admin/orders/quotations", authMode: "admin", status: "active" }),
      expect.objectContaining({ id: "admin.orders", path: "/admin/orders", authMode: "admin", status: "active" }),
    ]));
  });

  it("declares the replacements and no longer declares Sales routes", () => {
    const routes = read("src/routes/admin/AdminRoutes.tsx");

    expect(routes).toContain('<Route path="crm/proposals" element={<CatalogPublisherV2Page />} />');
    expect(routes).toContain('<Route path="orders/quotations" element={<QuotationsListPage />} />');
    expect(routes).toContain('<Route path="orders" element={<OrdersPage />} />');
    expect(routes).not.toContain('path="sales');
  });

  it("places each surface in its destination app and removes Sales from the launcher", () => {
    const apps = read("src/features/admin/core/config/apps.ts");
    const navigation = read("src/config/navigationRegistry.ts");

    expect(apps).toContain("{ label: 'Proposals', route: '/admin/crm/proposals'");
    expect(apps).toContain("{ label: 'Quotations', route: '/admin/orders/quotations'");
    expect(apps).toContain("{ label: 'Orders', route: '/admin/orders'");
    expect(apps).not.toContain("sales: {");
    expect(navigation).not.toContain('id: "admin.sales"');
  });
});
