import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const read = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("portal company access and statement billing gate", () => {
  const migration = read("supabase/migrations/20260716133000_portal_company_access_statement_tags.sql");

  it("adds explicit staff approval override fields without faking profile completion", () => {
    expect(migration).toContain("portal_access_approved_override boolean NOT NULL DEFAULT false");
    expect(migration).toContain("portal_access_approved_by uuid REFERENCES auth.users");
    expect(migration).toContain("portal_access_approved_at timestamptz");
    expect(migration).toContain("portal_access_approved_note text");
    expect(migration).toContain("v_manual_approved := COALESCE(v_profile.portal_access_approved_override, false)");
    expect(migration).toContain("v_email_verified AND (v_profile_completed OR v_manual_approved)");
  });

  it("gates statement access by Owner, CEO, or Buyer contact tags", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.can_access_customer_statement");
    expect(migration).toContain("lower(btrim(tag.name)) IN ('owner', 'ceo', 'buyer')");
    expect(migration).toContain("JOIN public.contacts parent ON parent.id = child.parent_id");
    expect(migration).toContain("JOIN public.contacts customer_contact ON customer_contact.id = customer.contact_id");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.can_access_customer_statement(uuid) TO service_role");
  });

  it("keeps statements financially gated in the shared feature helper", () => {
    expect(migration).toContain("IF p_feature_key = 'statements' THEN");
    expect(migration).toContain("AND public.can_access_customer_statement(p_user_id)");
  });

  it("enforces the same statement gate in live-data-gateway and uses current staff roles", () => {
    const source = read("supabase/functions/live-data-gateway/index.ts");

    expect(source).toContain('["admin", "operator"].includes(row.role)');
    expect(source).not.toContain('["admin", "editor", "author"].includes(row.role)');
    expect(source).toContain('config.feature === "statements"');
    expect(source).toContain('rpc("can_access_customer_statement"');
    expect(source).toContain("Statements are available only to contacts tagged Owner, CEO, or Buyer.");
  });
});
