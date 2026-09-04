import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";

describe("admin stock order builder route accessibility", () => {
  it("registers the canonical stock order route", () => {
    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({
      id: "admin.website.stock-orders",
      path: "/admin/website/stock-orders",
      authMode: "admin",
      status: "active",
    }));
  });

  it("keeps Orders and Pages / Content as the third and fourth Website buttons", () => {
    expect(ADMIN_APPS.website.sidebarItems.slice(0, 4).map((item) => item.label)).toEqual([
      "Website Portals",
      "Store / Products",
      "Orders",
      "Pages / Content",
    ]);
  });

  it("declares the runtime route, sidebar item, navigation entry, and role permission", () => {
    const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    const routes = read("src/routes/admin/AdminRoutes.tsx");
    const apps = read("src/features/admin/core/config/apps.ts");
    const navigation = read("src/config/navigationRegistry.ts");
    const permissions = read("src/hooks/useRolePermissions.ts");
    const launcher = read("src/components/admin/AppLauncher.tsx");
    const search = read("src/components/admin/GlobalSearch.tsx");
    const labScopeMigration = read("supabase/migrations/20260811010000_scope_stock_order_accounts_to_labs.sql");

    expect(routes).toContain('const StockOrderBuilderPage = lazyWithRetry(() => import("@/pages/admin/StockOrderBuilderPage")');
    expect(routes).toContain('<Route path="website/stock-orders" element={<StockOrderBuilderPage />} />');
    expect(apps).toContain("{ label: 'Stock Order Builder', route: '/admin/website/stock-orders'");
    expect(navigation).toContain('id: "admin.website.stock-orders"');
    expect(navigation).toContain('shortcutKey: "stock-order"');
    expect(launcher).toContain('defaultRoute: "/admin/website/stock-orders"');
    expect(search).toContain("APP_ROUTE_REGISTRY");
    expect(search).toContain('route.domain === "admin-console"');
    expect(permissions).toContain('"/admin/website/stock-orders": "website"');
    expect(labScopeMigration).toContain("lower(btrim(tag.name)) = 'is lab'");
  });

  it("creates and updates stock-order drafts automatically through the protected save RPC", () => {
    const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    const page = read("src/pages/admin/StockOrderBuilderPage.tsx");
    const hook = read("src/hooks/useStockOrderBuilder.ts");
    const migration = read("supabase/migrations/20260815122810_autosave_stock_order_drafts.sql");

    expect(page).toContain('const hasDraftContent = Boolean(stageItems.length || poNumber.trim() || orderReference.trim());');
    expect(page).toContain("const timeout = window.setTimeout(() => {");
    expect(page).toContain("void saveStockOrder({");
    expect(page).toContain("Order</span> {staged?.id ? staged.id.slice(0, 8).toUpperCase() : \"—\"}");
    expect(page).not.toContain("Save draft");
    expect(page).not.toContain('value="gatekeeper"');
    expect(hook).toContain('supabase.rpc as any)("save_stock_order_draft"');
    expect(hook).toContain("p_submission_id: input.submissionId ?? null");
    expect(hook).toContain('p_dispatch_provider: "innovations"');
    expect(migration).toContain("CREATE FUNCTION public.save_stock_order_draft(");
    expect(migration).toContain("IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 0 THEN");
    expect(migration).toContain("AND status IN ('staged', 'failed')");
    expect(migration).toContain("IF p_dispatch_provider <> 'innovations' THEN");
  });

  it("uses a protected non-zero price resolver and creates linked canonical quotations", () => {
    const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    const page = read("src/pages/admin/StockOrderBuilderPage.tsx");
    const hook = read("src/hooks/useStockOrderBuilder.ts");
    const migration = read("supabase/migrations/20260815130253_stock_quote_pricing_and_canonical_quotes.sql");
    const studio = read("public/ds/studio-logic.js");
    const studioRoute = read("src/features/admin/doc-studio/DocStudioEmbed.tsx");

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.resolve_stock_order_price(");
    expect(migration).toContain("lower(btrim(name)) = 'retail'");
    expect(migration).toContain("'assigned_pricelist'");
    expect(migration).toContain("'retail_pricelist'");
    expect(migration).toContain("'catalog'");
    expect(migration).toContain("No non-zero price exists");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.save_stock_order_as_quote(p_submission_id uuid)");
    expect(migration).toContain("docstudio_document_id");
    expect(hook).toContain('supabase.rpc as any)("save_stock_order_as_quote"');
    expect(page).toContain("Save as quotation");
    expect(page).toContain("stock-order-profit");
    expect(studio).toContain("billingDocument");
    expect(studioRoute).toContain("billingDocument");
  });

  it("retires the legacy STOCK quote editor without changing RX quote routing", () => {
    const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    const list = read("src/pages/admin/QuotationsListPage.tsx");
    const editor = read("src/pages/admin/QuoteEditorPage.tsx");
    const builder = read("src/pages/admin/StockOrderBuilderPage.tsx");

    expect(list).toContain('navigate("/admin/website/stock-orders")');
    expect(list).toContain('`/admin/website/stock-orders?quote=${encodeURIComponent(q.id)}`');
    expect(editor).toContain('navigate(`/admin/website/stock-orders?quote=${encodeURIComponent(quote.id)}`, { replace: true })');
    expect(editor).toContain('navigate(`/admin/website/quotations/rx/${quote.id}`, { replace: true })');
    expect(builder).toContain('useStockOrderDraftForQuote(quoteId)');
  });

  it("keeps populated order details collapsible and makes catalogue availability actionable", () => {
    const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    const page = read("src/pages/admin/StockOrderBuilderPage.tsx");
    const styles = read("src/pages/admin/stock-order-builder.css");

    expect(page).toContain("onBlur={collapseOrderDetailsOnBlur}");
    expect(page).toContain("if (loadedDraftId && poNumber.trim() && orderReference.trim())");
    expect(page).toContain("useStoreProducts()");
    expect(page).toContain("Configure price & variants");
    expect(page).toContain('target="_blank"');
    expect(page).toContain("stock-order-product-type");
    expect(page).toContain('disabled={item.available === false}');
    expect(page).toContain('SelectTrigger className="stock-order-account"');
    expect(page).toContain('SelectTrigger className="stock-order-currency"');
    expect(page).not.toContain("stock-order-currency-label");
    expect(page).toContain("new Intl.NumberFormat");
    expect(page).toContain("Unit price");
    expect(page).toContain("No items added yet");
    expect(page).toContain('className="stock-order-actions"');
    expect(page).toContain('name="poNumber"');
    expect(page).toContain('name="orderReference"');
    expect(page).toContain('name="scanCode"');
    expect(page).toContain("<ToastAction");
    expect(page).toContain('to="/admin/website/quotations"');
    expect(styles).toContain(".stock-order-panel-result.is-unavailable");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("@media (max-width: 1220px)");
  });
});
