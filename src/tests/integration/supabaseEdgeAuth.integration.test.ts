import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("supabase edge-function auth hardening", () => {
  const privilegedFunctions = [
    "lead-intelligence",
    "lens-assistant",
    "order-confirmation",
    "odoo-sync-pull-contacts",
    "odoo-sync-push-contacts",
    "preview-transactional-email",
    "send-transactional-email",
  ] as const;

  /** Functions that set verify_jwt = false but enforce auth in code */
  const codeAuthFunctions = [
    "admin-user-management",
  ] as const;

  const explicitPublicFunctions = [
    "auth-email-hook",
    "contact-inquiry",
    "handle-email-suppression",
    "handle-email-unsubscribe",
    "odoo-sync-webhook",
  ] as const;

  it("enables verify_jwt for privileged functions", () => {
    const config = read("supabase/config.toml");

    for (const fn of privilegedFunctions) {
      expect(config).toMatch(
        new RegExp(`\\[functions\\.${fn.replace(/-/g, "\\-")}\\]\\s+verify_jwt = true`),
      );
    }
  });

  it("keeps only explicitly public webhook/form endpoints unauthenticated", () => {
    const config = read("supabase/config.toml");

    for (const fn of explicitPublicFunctions) {
      expect(config).toMatch(
        new RegExp(`\\[functions\\.${fn.replace(/-/g, "\\-")}\\]\\s+verify_jwt = false`),
      );
    }
  });

  it("uses shared deny-by-default auth middleware for privileged functions", () => {
    for (const file of [
      "supabase/functions/admin-user-management/index.ts",
      "supabase/functions/lead-intelligence/index.ts",
      "supabase/functions/odoo-sync-pull-contacts/index.ts",
      "supabase/functions/odoo-sync-push-contacts/index.ts",
      "supabase/functions/send-transactional-email/index.ts",
      "supabase/functions/preview-transactional-email/index.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("requirePrivilegedAccess");
      expect(source).toContain("allowedRoles");
      expect(source).toContain("instanceof Response");
    }
  });

  it("fails unauthorized requests for every privileged function", () => {
    const middleware = read("supabase/functions/_shared/http/auth.ts");
    expect(middleware).toContain('createAuthErrorResponse("Unauthorized", 401');
    expect(middleware).toContain('createAuthErrorResponse("Forbidden", 403');

    const privilegeMap: Array<{ file: string; sourceFunction: string }> = [
      { file: "supabase/functions/admin-user-management/index.ts", sourceFunction: "admin-user-management" },
      { file: "supabase/functions/lead-intelligence/index.ts", sourceFunction: "lead-intelligence" },
      { file: "supabase/functions/odoo-sync-pull-contacts/index.ts", sourceFunction: "odoo-sync-pull-contacts" },
      { file: "supabase/functions/odoo-sync-push-contacts/index.ts", sourceFunction: "odoo-sync-push-contacts" },
      { file: "supabase/functions/send-transactional-email/index.ts", sourceFunction: "send-transactional-email" },
      { file: "supabase/functions/preview-transactional-email/index.ts", sourceFunction: "preview-transactional-email" },
    ];

    for (const item of privilegeMap) {
      const source = read(item.file);
      expect(source).toMatch(new RegExp(`sourceFunction:\\s*['"]${item.sourceFunction}['"]`));
      expect(source).toMatch(/allowedRoles:\s*\[['"]admin['"]\]/);
      expect(source).toContain("if (authContext instanceof Response)");
    }

    const lensAssistant = read("supabase/functions/lens-assistant/index.ts");
    expect(lensAssistant).toContain("requireAuthenticatedUser");
    expect(lensAssistant).toContain("if (authContext instanceof Response)");
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
