import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("portal access deployment coupling", () => {
  it("materializes the selected person contact's company/customer links", () => {
    const adminFunction = read("supabase/functions/admin-user-management/index.ts");

    expect(adminFunction).toContain("contactUpdates.linked_customer_id = customer.id");
    expect(adminFunction).toContain("contactUpdates.innovations_parent_customer_id = customer.innovations_customer_id");
    expect(adminFunction).toContain("contactUpdates.parent_id = customer.contact_id");
    expect(adminFunction).toContain("crm_customer_id: customer.id");
    expect(adminFunction).toContain("crm_contact_id: resolvedContactId");
  });

  it("lets company account settings discover linked person portal profiles by ERP customer", () => {
    const contactsPage = read("src/pages/admin/erp/ContactsPage.tsx");

    expect(contactsPage).toContain('editContact?.is_company && accountSettingsCustomer?.id');
    expect(contactsPage).toContain('query.eq("crm_customer_id", accountSettingsCustomer.id)');
  });
});
