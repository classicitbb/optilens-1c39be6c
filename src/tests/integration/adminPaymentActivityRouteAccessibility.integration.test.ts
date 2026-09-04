import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("admin payment activity route", () => {
  it("registers the canonical, admin-only route", () => {
    expect(
      APP_ROUTE_REGISTRY.find((route) => (
        route.id === "admin.settings.payment-activity"
        && route.path === "/admin/settings/payment-activity"
        && route.authMode === "admin"
        && route.status === "active"
      )),
    ).toBeTruthy();
  });

  it("keeps the runtime route behind the admin guard and in Settings navigation", () => {
    const routes = read("src/routes/admin/AdminRoutes.tsx");
    const settingsApp = read("src/features/admin/core/config/apps.ts");

    expect(routes).toContain('const PaymentActivityPage = lazyWithRetry(() => import("@/pages/admin/settings/PaymentActivityPage"));');
    expect(routes).toContain('path="settings/payment-activity"');
    expect(routes).toMatch(/<AdminOnlyRoute>\s*<PaymentActivityPage\s*\/?>\s*<\/AdminOnlyRoute>/);
    expect(settingsApp).toContain("{ label: 'Payment Activity', route: '/admin/settings/payment-activity'");
  });

  it("uses only the approved activity projection fields", () => {
    const page = read("src/pages/admin/settings/PaymentActivityPage.tsx");
    const activityMigration = read("supabase/migrations/20260904170609_card_payment_activity_and_statement_token_save.sql");
    const eventLogger = read("supabase/functions/_shared/scotia/events.ts");

    expect(page).toContain('.from("scotia_payment_activity")');
    expect(page).toContain('.select("occurred_at,payment_reference,transaction_type,status,amount,currency")');
    for (const prohibitedField of ["response_params", "fail_rc", "card_brand", "card_last4", "expiry_month", "expiry_year", "payment_token", "cvv", "pan"]) {
      expect(page).not.toContain(prohibitedField);
    }
    expect(activityMigration).toContain("SET request_params = NULL,");
    expect(activityMigration).toContain("response_params = NULL");
    expect(eventLogger).not.toContain("requestParams");
    expect(eventLogger).not.toContain("responseParams");
  });

  it("requires an explicit customer opt-in before the statement checkout requests a token", () => {
    const statements = read("src/components/account/sections/StatementsSection.tsx");

    expect(statements).toContain("assignToken: saveCardForFuturePayments");
    expect(statements).toContain('id="statement-save-card"');
    expect(statements).toContain("Save this card securely for future payments");
  });
});
