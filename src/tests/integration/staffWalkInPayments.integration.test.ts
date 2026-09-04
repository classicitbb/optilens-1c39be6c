import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("staff walk-in Scotia payments", () => {
  it("creates a staff-only, exact-amount intent before signing the hosted form", () => {
    const migration = read("supabase/migrations/20260902154434_staff_walk_in_payments.sql");
    const prepare = read("supabase/functions/scotia-payment/index.ts");

    expect(migration).toContain("CREATE TABLE public.walk_in_payments");
    expect(migration).toContain("public.has_edit_role(auth.uid())");
    expect(migration).toContain("payment_reference text NOT NULL UNIQUE");
    expect(migration).toContain("Gateway amount does not match the walk-in payment.");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.settle_walk_in_payment(uuid, jsonb) TO service_role");
    expect(prepare).toContain('orderId.startsWith("WALKIN-")');
    expect(prepare).toContain("data.payment_reference !== orderId");
    expect(prepare).toContain("amountsMatch(data.amount, chargetotal)");
  });

  it("settles both the browser return and the server notification through the signed callback path", () => {
    const callback = read("supabase/functions/scotia-return/index.ts");
    const notification = read("supabase/functions/scotia-notify/index.ts");

    expect(callback).toContain('const WALK_IN_RETURN_PATH = "/admin/settings/walk-in-payments"');
    expect(callback).toContain('supabaseAdmin.rpc("settle_walk_in_payment"');
    expect(callback).toContain('payment: paymentId');
    expect(notification).toContain('deps.admin.rpc("settle_walk_in_payment"');
    expect(notification).toContain('flow: "walk_in"');
  });

  it("keeps card entry outside the website and shows a receipt only after stored settlement", () => {
    const page = read("src/pages/admin/WalkInPaymentsPage.tsx");
    const routes = read("src/routes/admin/AdminRoutes.tsx");
    const registry = read("src/config/routeRegistry.ts");

    expect(page).toContain('realRole === "admin" || realRole === "operator"');
    expect(page).toContain("create_walk_in_payment");
    expect(page).toContain("redirectToScotiaPayment(prepared)");
    expect(page).toContain('displayedPayment?.status === "settled"');
    expect(page).toContain("Print receipt");
    expect(page).not.toMatch(/cardnumber|cvv|expiry input/i);
    expect(routes).toContain('path="settings/walk-in-payments"');
    expect(registry).toContain('path: "/admin/settings/walk-in-payments"');
  });
});
