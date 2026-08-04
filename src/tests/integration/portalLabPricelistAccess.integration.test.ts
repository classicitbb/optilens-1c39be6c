import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const read = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("portal lab pricelist access", () => {
  const migration = read("supabase/migrations/20260803223909_portal_lab_pricelist_access.sql");
  const followupMigration = read("supabase/migrations/20260804171342_fix_portal_lab_tag_resolution.sql");
  const section = read("src/components/account/sections/AssignedPricelistsSection.tsx");
  const contactsHook = read("src/hooks/useContacts.ts");

  it("grants lab access from either the signed-in person or their company contact", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.can_access_customer_lab_pricing");
    expect(migration).toContain("SELECT 'Is Lab', '#C89130', 'Portal Access'");
    expect(migration).toContain("lower(btrim(tag.name)) = 'is lab'");
    expect(migration).toContain("SELECT parent_id FROM public.contacts WHERE id = v_profile.crm_contact_id");
    expect(migration).toContain("SELECT contact_id FROM public.customers WHERE id = v_profile.crm_customer_id");
  });

  it("enforces the restriction in the RPC before catalog data reaches the browser", () => {
    expect(migration).toContain("IF p_catalog_type = 'stock' AND NOT v_can_access_lab_pricing THEN");
    expect(migration).toContain("lower(btrim(COALESCE(r.section, ''))) NOT IN ('lab', 'lab supplies')");
    expect(migration).toContain("lower(btrim(COALESCE(supply.category, ''))) NOT IN ('lab', 'lab supplies')");
    expect(migration).toContain("IF NOT public.can_access_customer_pricing(auth.uid()) THEN");
  });

  it("does not render or export the stock-lens tab for non-lab users", () => {
    expect(section).toContain('("can_access_customer_lab_pricing")');
    expect(section).toContain("enabled: hasPricelist && canAccessLabPricing");
    expect(section).toContain('{canAccessLabPricing && <TabsTrigger value="stock">Stock Lenses</TabsTrigger>}');
    expect(section).toContain("if (canAccessLabPricing) addCatalogSection(\"Stock Lenses\", stockBySection);");
    expect(section).toContain("const isLabSupplyRow = (row: CatalogRow)");
  });

  it("recognizes the CRM company resolved through contacts.linked_customer_id", () => {
    expect(followupMigration).toContain("linked_customer_id = v_profile.crm_customer_id");
  });

  it("refreshes a previously denied access decision after an administrator adds the tag", () => {
    expect(section).toContain('staleTime: 0');
    expect(section).toContain('refetchOnMount: "always"');
    expect(section).toContain('refetchOnWindowFocus: "always"');
  });

  it("does not report tag selection as saved when replacing existing links fails", () => {
    expect(contactsHook).toContain("const { error: deleteError }");
    expect(contactsHook).toContain("if (deleteError) throw deleteError");
  });
});
