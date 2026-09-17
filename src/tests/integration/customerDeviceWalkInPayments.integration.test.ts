import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

const MIGRATION = "supabase/migrations/20260917101500_customer_device_walk_in_payments.sql";

describe("customer-device walk-in payments", () => {
  it("stores link tokens and claim codes only as hashes", () => {
    const migration = read(MIGRATION);

    expect(migration).toContain("link_token_hash");
    expect(migration).toContain("claim_code_hash");
    expect(migration).toContain("encode(extensions.digest(v_token, 'sha256'), 'hex')");
    expect(migration).toContain("encode(extensions.digest(v_code, 'sha256'), 'hex')");
    // A plaintext token or code column would survive a database dump.
    expect(migration).not.toMatch(/^\s*(link_token|claim_code)\s+text/m);
  });

  it("keeps anonymous browsers off the table and behind the Edge Function", () => {
    const migration = read(MIGRATION);
    const helper = read("src/lib/payments/walkInPay.ts");

    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.resolve_walk_in_payment_link(text, text, boolean) TO service_role",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.resolve_walk_in_payment_link(text, text, boolean)\n  FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.create_self_serve_walk_in_payment(numeric, text, text, text) TO service_role",
    );
    // The public page must never query the table directly.
    expect(helper).not.toContain('.from("walk_in_payments")');
    expect(helper).toContain('supabase.functions.invoke("walkin-pay"');
  });

  it("signs a customer form only for an already-stored amount", () => {
    const fn = read("supabase/functions/walkin-pay/index.ts");

    expect(fn).toContain("resolve_walk_in_payment_link");
    expect(fn).toContain("signForm(payment.payment_reference, Number(payment.amount), req)");
    // Nothing the customer sends may set the charge on an assisted or emailed link.
    expect(fn).not.toContain("chargetotal: body.amount");
  });

  it("fails closed when Turnstile is not configured", () => {
    const fn = read("supabase/functions/walkin-pay/index.ts");

    expect(fn).toContain('const secret = Deno.env.get("TURNSTILE_SECRET_KEY");');
    expect(fn).toContain("if (!secret) {");
    expect(fn).toContain("refusing self-serve");
    expect(fn).toContain("if (!await turnstilePassed(body.turnstileToken, ip)) {");
  });

  it("bounds self-service amounts in the database, not only in the UI", () => {
    const migration = read(MIGRATION);

    expect(migration).toContain("self_serve_enabled");
    expect(migration).toContain("IF NOT v_settings.self_serve_enabled THEN");
    expect(migration).toContain("v_settings.self_serve_min_amount");
    expect(migration).toContain("v_settings.self_serve_max_amount");
    expect(migration).toContain("needs_matching");
  });

  it("gives the same answer for wrong, expired and already-used links", () => {
    const fn = read("supabase/functions/walkin-pay/index.ts");
    const migration = read(MIGRATION);

    expect(fn).toContain("const NOT_FOUND_MESSAGE");
    // Every rejection path returns the one message; a distinct 'expired' reply
    // would confirm that a guessed code exists.
    expect(fn.match(/NOT_FOUND_MESSAGE/g)?.length ?? 0).toBeGreaterThan(2);
    expect(migration).toContain("IF v_row.token_used_at IS NOT NULL THEN RETURN; END IF;");
    expect(migration).toContain("IF v_row.link_expires_at IS NULL OR v_row.link_expires_at < now() THEN RETURN; END IF;");
  });

  it("rate-limits the public endpoints durably rather than in isolate memory", () => {
    const fn = read("supabase/functions/walkin-pay/index.ts");
    const migration = read(MIGRATION);

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.public_payment_attempts");
    expect(fn).toContain("record_public_payment_attempt");
    expect(fn).toContain('overRateLimit(ip, "self_serve"');
    expect(fn).toContain('overRateLimit(ip, "claim"');
    // Losing the counter must not open the endpoint up.
    expect(fn).toContain("// Fail closed: if we cannot count attempts we cannot bound abuse.");
  });

  it("returns a customer to the public result page, and staff to the admin page", () => {
    const callback = read("supabase/functions/scotia-return/index.ts");

    expect(callback).toContain('const WALK_IN_RETURN_PATH = "/admin/settings/walk-in-payments"');
    expect(callback).toContain('const WALK_IN_PUBLIC_RETURN_PATH = "/pay/result"');
    expect(callback).toContain('data.origin !== "staff_terminal"');
  });

  it("publishes the public pay routes and keeps them out of search results", () => {
    const routes = read("src/routes/public/PublicRoutes.tsx");
    const registry = read("src/config/routeRegistry.ts");
    const page = read("src/pages/PayPage.tsx");
    const config = read("supabase/config.toml");

    expect(routes).toContain('path="pay"');
    expect(routes).toContain('path="pay/result"');
    expect(registry).toContain('path: "/pay"');
    expect(registry).toContain('authMode: "public"');
    expect(page).toContain("noindex");
    // The customer page must never collect card data itself.
    expect(page).not.toMatch(/cardnumber|cvv|card number/i);
    expect(config).toContain("[functions.walkin-pay]");
    expect(config).toContain("verify_jwt = false");
  });

  it("corrects the stored currency to the BBD code the gateway actually charges", () => {
    const migration = read(MIGRATION);

    expect(migration).toContain("UPDATE public.walk_in_payments SET currency = '052'");
    expect(migration).toContain("CHECK (currency = '052')");
    expect(migration).not.toContain("CHECK (currency = '840')");
  });

  it("emails the pay link without ever handing the token to the staff browser", () => {
    const fn = read("supabase/functions/scotia-payment/index.ts");
    const page = read("src/pages/admin/WalkInPaymentsPage.tsx");

    expect(fn).toContain('action: z.literal("send-walkin-request")');
    expect(fn).toContain("sendWalkInPaymentRequest");
    expect(fn).toContain("requireStaffRole(authContext)");
    // The staff page asks for the send and gets back an id, never a token.
    expect(page).toContain('action: "send-walkin-request"');
    expect(page).not.toContain("published.token");
  });
});
