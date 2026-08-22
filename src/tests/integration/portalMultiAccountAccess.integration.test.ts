import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("portal multi-account access", () => {
  const migration = read("supabase/migrations/20260804194006_portal_multi_account_memberships.sql");

  it("models account access independently from the profile default pointer", () => {
    expect(migration).toContain("CREATE TABLE public.portal_account_memberships");
    expect(migration).toContain("UNIQUE (user_id, customer_id)");
    expect(migration).toContain("portal_account_memberships_one_default_per_user_idx");
    expect(migration).toContain("profile.crm_customer_id");
  });

  it("keeps account authorization and sensitive features server-side", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.can_access_portal_account(");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.can_access_portal_account_feature(");
    expect(migration).toContain("membership.status = 'active'");
    expect(migration).toContain("portal_membership_has_contact_tag");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.can_access_portal_account");
  });

  it("scopes overrides to memberships and backfills existing users", () => {
    expect(migration).toContain("CREATE TABLE public.portal_membership_feature_overrides");
    expect(migration).toContain("INSERT INTO public.portal_account_memberships");
    expect(migration).toContain("JOIN public.contacts backfill_contact ON backfill_contact.id = profile.crm_contact_id");
    expect(migration).toContain("JOIN public.customers backfill_customer ON backfill_customer.id = profile.crm_customer_id");
    expect(migration).toContain("INSERT INTO public.portal_membership_feature_overrides");
  });

  it("requires live-data requests to authorize the selected customer", () => {
    const gateway = read("supabase/functions/live-data-gateway/index.ts");
    expect(gateway).toContain("portal_account_memberships");
    expect(gateway).toContain("This login is not authorized for the requested customer account.");
    expect(gateway).toContain('rpc("can_access_portal_account_feature"');
  });

  it("adds a membership without replacing an existing profile account", () => {
    const adminFunction = read("supabase/functions/admin-user-management/index.ts");
    expect(adminFunction).toContain("Adding a second account must never overwrite it");
    expect(adminFunction).toContain('from("portal_account_memberships")');
    expect(adminFunction).toContain('event_type: isFirstAccount ? "membership_created_default" : "membership_granted"');
  });

  it("passes the active customer to customer live-data requests", () => {
    for (const path of [
      "src/pages/Profile.tsx",
      "src/components/account/sections/MyOrdersSection.tsx",
      "src/components/account/sections/StatementsSection.tsx",
    ]) {
      expect(read(path)).toContain('const websiteCustomerId = typeof');
    }
  });
});
