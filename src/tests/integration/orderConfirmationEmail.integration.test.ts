import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("order confirmation email routing", () => {
  it("sends a formatted order confirmation after checkout succeeds", () => {
    const useOrders = read("src/hooks/useOrders.ts");
    const edgeFunction = read("supabase/functions/order-confirmation/index.ts");

    expect(useOrders).toContain('supabase.functions.invoke("order-confirmation"');
    expect(edgeFunction).toContain("order-confirmation");
    expect(edgeFunction).toContain("transactional-email-templates/order-confirmation.tsx");
    expect(edgeFunction).toContain("renderAsync");
    expect(edgeFunction).toContain("sendManagedEmail");
  });

  it("requires an authenticated order owner or staff user", () => {
    const edgeFunction = read("supabase/functions/order-confirmation/index.ts");
    const config = read("supabase/config.toml");

    expect(config).toMatch(/\[functions\.order-confirmation\]\s+verify_jwt = true/);
    expect(edgeFunction).toContain("requireAuthenticatedUser");
    expect(edgeFunction).toContain("order.user_id !== authContext.user.id");
    expect(edgeFunction).toContain("requireUserRole");
    expect(edgeFunction).toContain("['admin', 'operator']");
  });

  it("sends an idempotent operations notice only after a Scotia order is paid", () => {
    const fulfillment = read("supabase/functions/_shared/email/paid-order-fulfillment.ts");
    const callback = read("supabase/functions/scotia-return/index.ts");
    const notification = read("supabase/functions/scotia-notify/index.ts");
    const useOrders = read("src/hooks/useOrders.ts");

    expect(fulfillment).toContain("orders@classicvisions.net");
    expect(fulfillment).toContain('order.status !== "confirmed"');
    expect(fulfillment).toContain("paid-order-fulfillment-");
    expect(callback).toContain("queuePaidOrderFulfillmentEmail");
    expect(notification).toContain("queuePaidOrderFulfillmentEmail");
    expect(useOrders).toContain('checkout.checkoutMethod !== "scotia_ecom"');
  });
});
