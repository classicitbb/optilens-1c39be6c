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
    expect(adminFunction).toContain("profilePayload.crm_customer_id = customer.id");
    expect(adminFunction).toContain('from("portal_account_memberships")');
    expect(adminFunction).toContain("profilePayload.crm_contact_id = resolvedContactId");
  });

  it("lets company account settings discover linked person portal profiles by ERP customer", () => {
    const contactsPage = read("src/pages/admin/erp/ContactsPage.tsx");

    expect(contactsPage).toContain('editContact?.is_company && accountSettingsCustomer?.id');
    expect(contactsPage).toContain('query.eq("crm_customer_id", accountSettingsCustomer.id)');
  });

  it("hands a temporary-password deployment to Doc Studio without exposing the password in the URL", () => {
    const deploymentDialog = read("src/components/admin/AccessDeploymentAssistantDialog.tsx");
    const docStudioPage = read("src/features/admin/doc-studio/DocStudioEmbed.tsx");
    const studio = read("public/ds/studio-logic.js");

    expect(deploymentDialog).toContain("Draft Invite Email");
    expect(deploymentDialog).toContain("sessionStorage.setItem(`cv_doc_studio_staff_invite:${handoff}`");
    expect(deploymentDialog).toContain("navigate(`/admin/docs/studio?staffInvite=");
    expect(docStudioPage).toContain("staffInvite");
    expect(studio).toContain("consumeStaffInviteHandoff");
    expect(studio).toContain("sessionStorage.getItem(key)");
    expect(studio).toContain("Temporary password:");
  });
});
