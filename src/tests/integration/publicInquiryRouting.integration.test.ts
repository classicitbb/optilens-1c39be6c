import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("public inquiry routing", () => {
  it("routes public website forms through the shared inquiry helper", () => {
    const helper = read("src/lib/publicInquiry.ts");
    expect(helper).toContain('supabase.functions.invoke("contact-inquiry"');

    for (const file of [
      "src/components/ContactForm.tsx",
      "src/pages/OpticalRetailWebsitesPage.tsx",
      "src/pages/ProfessionalsPortalPage.tsx",
      "src/pages/zenvue/ZenvueWholesale.tsx",
      "src/features/assistant/CompanionAssistantContext.tsx",
    ]) {
      const source = read(file);
      expect(source).toContain("submitPublicInquiry");
    }
  });

  it("does not bypass resend-backed routing with direct public inquiry inserts on website forms", () => {
    const professionalsPortal = read("src/pages/ProfessionalsPortalPage.tsx");
    const zenvueWholesale = read("src/pages/zenvue/ZenvueWholesale.tsx");

    expect(professionalsPortal).not.toContain('.from("public_inquiries").insert');
    expect(zenvueWholesale).not.toContain('.from("wholesale_inquiries").insert');
  });

  it("resolves the email recipient from company settings feedback_email with a Russell fallback and includes unsubscribe tokens", () => {
    const source = read("supabase/functions/contact-inquiry/index.ts");

    expect(source).toContain("feedback_email");
    expect(source).toContain("FEEDBACK_EMAIL_FALLBACK");
    expect(source).toContain("resolvedRecipient");
    expect(source).toContain("getOrCreateUnsubscribeToken");
    expect(source).toContain("unsubscribe_token");
    expect(source).toContain("contact-inquiry-notification");
    expect(source).toContain("inquiry-confirmation");
  });
});
