import { describe, expect, it } from "vitest";
import { resolveCompatibleCustomerAccounts } from "@/lib/accessDeployment";
import type { Contact } from "@/hooks/useContacts";

const contact = (overrides: Partial<Contact>): Contact => ({
  id: "person-1",
  name: "Nadia Reifer",
  type: "individual",
  business_name: null,
  is_company: false,
  parent_id: null,
  email: "nadia@example.com",
  phone: "",
  street: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  country_code: "",
  country: "",
  address: null,
  tax_id: "",
  website: "",
  google_place_id: null,
  facebook_page_id: null,
  instagram_handle: null,
  industry_id: null,
  notes: "",
  salesperson: "",
  is_archived: false,
  avatar_url: "",
  business_card_image_url: null,
  business_card_uploaded_at: null,
  business_card_file_name: null,
  is_customer: false,
  lead_source: "",
  pipeline_stage: "New",
  status: "lead",
  lead_score: 0,
  created_at: "",
  updated_at: "",
  innovations_parent_customer_id: null,
  linked_customer_id: null,
  ...overrides,
});

describe("resolveCompatibleCustomerAccounts", () => {
  it("includes the ERP account attached to a linked parent company", () => {
    const linkedPerson = contact({ parent_id: "company-1" });
    const customers = [
      { id: 3, name: "Enhanced Vision", account_number: "RETAIL", email: null, contact_id: "company-1", innovations_customer_id: null },
      { id: 9, name: "Other Optical", account_number: "OTHER", email: null, contact_id: "company-9", innovations_customer_id: null },
    ];

    expect(resolveCompatibleCustomerAccounts(linkedPerson, customers)).toEqual([customers[0]]);
  });

  it("deduplicates accounts that match by more than one link", () => {
    const linkedPerson = contact({ parent_id: "company-1", linked_customer_id: 3 });
    const customers = [
      { id: 3, name: "Enhanced Vision", account_number: "RETAIL", email: null, contact_id: "company-1", innovations_customer_id: null },
    ];

    expect(resolveCompatibleCustomerAccounts(linkedPerson, customers)).toHaveLength(1);
  });
});
