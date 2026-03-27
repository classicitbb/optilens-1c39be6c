import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("supabase edge-function auth hardening", () => {
  it("enables verify_jwt for privileged functions", () => {
    const config = read("supabase/config.toml");

    for (const fn of [
      "admin-user-management",
      "lens-assistant",
      "send-transactional-email",
      "preview-transactional-email",
    ]) {
      expect(config).toMatch(
        new RegExp(`\\[functions\\.${fn.replace(/-/g, "\\-")}\\]\\s+verify_jwt = true`),
      );
    }
  });

  it("keeps only explicitly public webhook/form endpoints unauthenticated", () => {
    const config = read("supabase/config.toml");

    for (const fn of [
      "auth-email-hook",
      "contact-inquiry",
      "handle-email-unsubscribe",
      "handle-email-suppression",
    ]) {
      expect(config).toMatch(
        new RegExp(`\\[functions\\.${fn.replace(/-/g, "\\-")}\\]\\s+verify_jwt = false`),
      );
    }
  });

  it("uses shared middleware to deny unauthorized traffic for privileged functions", () => {
    for (const file of [
      "supabase/functions/admin-user-management/index.ts",
      "supabase/functions/lens-assistant/index.ts",
      "supabase/functions/send-transactional-email/index.ts",
      "supabase/functions/preview-transactional-email/index.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("requireAuthenticatedUser");
      expect(source).toMatch(/requireAuthenticatedUser|requireUserRole/);
    }
  });

  it("removes wildcard CORS origin headers from edge functions", () => {
    const files = [
      "supabase/functions/admin-user-management/index.ts",
      "supabase/functions/lens-assistant/index.ts",
      "supabase/functions/contact-inquiry/index.ts",
      "supabase/functions/preview-transactional-email/index.ts",
      "supabase/functions/send-transactional-email/index.ts",
      "supabase/functions/lead-intelligence/index.ts",
      "supabase/functions/auth-email-hook/index.ts",
      "supabase/functions/handle-email-unsubscribe/index.ts",
      "supabase/functions/_shared/odoo/runtime.ts",
    ];

    for (const file of files) {
      expect(read(file)).not.toContain("Access-Control-Allow-Origin': '*");
      expect(read(file)).not.toContain('Access-Control-Allow-Origin": "*"');
    }
  });

  it("enforces anti-abuse validation on public endpoints", () => {
    const contactInquiry = read("supabase/functions/contact-inquiry/index.ts");
    const unsubscribe = read("supabase/functions/handle-email-unsubscribe/index.ts");

    expect(contactInquiry).toContain("MAX_SUBMISSIONS_PER_HOUR");
    expect(contactInquiry).toContain("MAX_SUBMISSIONS_PER_EMAIL_PER_HOUR");
    expect(contactInquiry).toContain("Payload too large");

    expect(unsubscribe).toContain("tokenSchema");
    expect(unsubscribe).toContain("Payload too large");
  });
});
