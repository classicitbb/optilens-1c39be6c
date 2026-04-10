import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("order confirmation email routing", () => {
  it("queues a formatted order confirmation after checkout succeeds", () => {
    const useOrders = read("src/hooks/useOrders.ts");
    const edgeFunction = read("supabase/functions/order-confirmation/index.ts");

    expect(useOrders).toContain('supabase.functions.invoke("order-confirmation"');
    expect(edgeFunction).toContain("order-confirmation");
    expect(edgeFunction).toContain("transactional-email-templates/order-confirmation.tsx");
    expect(edgeFunction).toContain("renderAsync");
    expect(edgeFunction).toContain("enqueue_email");
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
});
