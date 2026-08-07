import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("profile account-link hardening", () => {
  const hardening = read("supabase/migrations/20260807135510_allow_profile_account_claim_updates.sql");

  it("keeps CRM links and approval state staff-only", () => {
    expect(hardening).toContain("NEW.crm_contact_id IS DISTINCT FROM OLD.crm_contact_id");
    expect(hardening).toContain("NEW.crm_customer_id IS DISTINCT FROM OLD.crm_customer_id");
    expect(hardening).toContain("NEW.portal_access_status IS DISTINCT FROM OLD.portal_access_status");
    expect(hardening).toContain("NEW.portal_access_approved_override IS DISTINCT FROM OLD.portal_access_approved_override");
    expect(hardening).toContain("public.has_edit_role(auth.uid())");
  });

  it("allows a customer to correct a non-authorizing account-number claim", () => {
    expect(hardening).not.toContain("NEW.claimed_account_number IS DISTINCT FROM OLD.claimed_account_number");
    expect(read("supabase/migrations/20260721200000_portal_signup_claim_and_archive.sql")).toMatch(/a claim alone\s+--\s+must not grant access/);
    expect(read("src/components/account/sections/MyAccountSection.tsx")).toContain('upsert({ user_id: user.id, claimed_account_number: trimmed || null }');
  });
});
