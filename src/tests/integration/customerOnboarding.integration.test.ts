import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("customer onboarding email wiring", () => {
  it("registers the welcome-pricelist template in the shared transactional registry", () => {
    const registry = read("supabase/functions/_shared/transactional-email-templates/registry.ts");
    const previewFunction = read("supabase/functions/preview-transactional-email/index.ts");
    const senderFunction = read("supabase/functions/send-transactional-email/index.ts");

    expect(registry).toContain("welcome-pricelist");
    expect(registry).toContain("welcomePricelist");
    expect(previewFunction).toContain("Object.keys(TEMPLATES)");
    expect(senderFunction).toContain("TEMPLATES");
  });

  it("keeps customer-onboarding protected and deployable as a privileged edge function", () => {
    const config = read("supabase/config.toml");
    const onboardingFunction = read("supabase/functions/customer-onboarding/index.ts");

    expect(config).toMatch(/\[functions\.customer-onboarding\]\s+verify_jwt = true/);
    expect(onboardingFunction).toContain("requirePrivilegedAccess");
    expect(onboardingFunction).toMatch(/sourceFunction:\s*['"]customer-onboarding['"]/);
    expect(onboardingFunction).toMatch(/allowedRoles:\s*\[['"]admin['"]\]/);
    expect(onboardingFunction).toContain("if (authContext instanceof Response)");
  });

  it("keeps admin create and invite flows wired to trigger customer onboarding", () => {
    const adminFunction = read("supabase/functions/admin-user-management/index.ts");

    expect(adminFunction).toContain("functions/v1/customer-onboarding");
    expect(adminFunction).toContain('if (action === "invite-user")');
    expect(adminFunction).toContain('await triggerCustomerOnboarding(req, inviteData.user.id, email);');
    expect(adminFunction).toContain('if (action === "create-user")');
    expect(adminFunction).toContain('await triggerCustomerOnboarding(req, newUser.user.id, email, displayName);');
  });

  it("queues the welcome-pricelist email from customer onboarding", () => {
    const onboardingFunction = read("supabase/functions/customer-onboarding/index.ts");

    expect(onboardingFunction).toContain("transactional-email-templates/welcome-pricelist.tsx");
    expect(onboardingFunction).toContain("renderAsync");
    expect(onboardingFunction).toContain("enqueue_email");
    expect(onboardingFunction).toContain("template_name: 'welcome-pricelist'");
    expect(onboardingFunction).toContain("label: 'welcome-pricelist'");
  });
});
