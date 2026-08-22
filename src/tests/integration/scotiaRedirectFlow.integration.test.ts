import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Scotia redirect payment flow", () => {
  it("requires an authenticated owner before signing a gateway form", () => {
    const config = read("supabase/config.toml");
    const source = read("supabase/functions/scotia-payment/index.ts");

    expect(config).toMatch(/\[functions\.scotia-payment\]\s+verify_jwt = true/);
    expect(source).toContain("requireAuthenticatedUser");
    expect(source).toContain("assertPaymentOwnership");
    expect(source).toContain("order.checkout_method !== \"scotia_ecom\"");
    expect(source).toContain("amountsMatch(order.total_amount, chargetotal)");
  });

  it("settles only a signed callback whose order id and amount match", () => {
    const callback = read("supabase/functions/scotia-return/index.ts");
    const migration = read("supabase/migrations/20260724110000_harden_scotia_payment_outcomes.sql");

    expect(callback).toContain("chargetotal: result.chargetotal");
    expect(callback).toContain('const CHECKOUT_RETURN_PATH = "/order-complete"');
    expect(migration).toContain("Gateway order reference does not match this order.");
    expect(migration).toContain("Gateway amount does not match the order payment.");
    expect(migration).toContain("A settled payment cannot be changed by a later gateway result.");
    expect(migration).toContain("place_customer_order_with_shipping");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.place_customer_order");
  });

  it("uses the required hosted-form language and USD currency, in redirect mode only", () => {
    const prepare = read("supabase/functions/scotia-payment/index.ts");
    const config = read("supabase/functions/_shared/scotia/config.ts");
    const checkout = read("src/pages/CheckoutPage.tsx");

    expect(prepare).toContain('currency: "840"');
    expect(prepare).toContain('language: "en_GB"');
    expect(prepare).toContain("formParams.transactionNotificationURL = notificationURL");
    expect(prepare).not.toContain("formParams.notificationURL = notificationURL");
    expect(config).toContain('currency: "840"');
    // Scotia's hosted page refuses framing (frame-ancestors 'self'), so
    // checkout must POST a freshly-signed form as a top-level navigation and
    // never mount an iframe.
    expect(checkout).not.toContain("ScotiaPaymentFrame");
    expect(checkout).toContain("prepareScotiaPayment");
    expect(checkout).toContain("redirectToScotiaPayment(prepared)");
    expect(read("src/lib/payments/scotiaConnect.ts")).toContain('form.target = "_top"');
  });

  it("uses an RLS-backed completion page instead of trusting query parameters", () => {
    const page = read("src/pages/OrderCompletePage.tsx");

    expect(page).toContain('.from("orders")');
    expect(page).toContain('.from("order_payments")');
    expect(page).toContain('orderData.status === "confirmed" && paymentData.status === "settled"');
    expect(page).toContain("MAX_POLL_ATTEMPTS");
    expect(page).toContain("Order unavailable");
  });
});
