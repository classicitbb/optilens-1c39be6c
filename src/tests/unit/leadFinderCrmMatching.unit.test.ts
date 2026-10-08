import { describe, expect, it } from "vitest";
import {
  annotateLead,
  applyCrmMatching,
  buildCrmIndex,
  buildIdentityKey,
  unavailableAnnotation,
  type ConfirmedLink,
  type CrmContact,
} from "../../../supabase/functions/lead-intelligence/crmMatching";

const contact = (overrides: Partial<CrmContact> & { id: string }): CrmContact => ({
  name: null,
  business_name: null,
  city: null,
  country: "Barbados",
  website: null,
  parent_id: null,
  is_customer: false,
  linked_customer_id: null,
  ...overrides,
});

const prospect = contact({ id: "c1", name: "Vision Plus Ltd", city: "Bridgetown", website: "https://www.visionplus.bb" });
const customer = contact({ id: "c2", name: "Optical Hub", city: "Port of Spain", linked_customer_id: 77 });

const index = buildCrmIndex([prospect, customer], []);

describe("annotateLead matching", () => {
  it("auto-associates an exact normalised name in the same city", () => {
    const crm = annotateLead({ name: "Vision Plus", city: "bridgetown" }, index, []);
    expect(crm.status).toBe("matched");
    expect(crm.match).toMatchObject({ contactId: "c1", basis: "name_location", confirmed: false });
    expect(crm.isCurrentCustomer).toBe(false);
  });

  it("only suggests when the city differs or is missing", () => {
    const differentCity = annotateLead({ name: "Vision Plus", city: "Oistins" }, index, []);
    expect(differentCity.status).toBe("suggested");
    expect(differentCity.match).toBeNull();
    const noCity = annotateLead({ name: "Vision Plus" }, index, []);
    expect(noCity.status).toBe("suggested");
  });

  it("does not auto-match when two CRM records share the name and city", () => {
    const twin = contact({ id: "c3", name: "Vision Plus", city: "Bridgetown" });
    const crm = annotateLead({ name: "Vision Plus", city: "Bridgetown" }, buildCrmIndex([prospect, twin], []), []);
    expect(crm.status).toBe("suggested");
    expect(crm.suggestions.map((s) => s.contactId).sort()).toEqual(["c1", "c3"]);
  });

  it("suggests fuzzy names without associating them", () => {
    const crm = annotateLead({ name: "Vision Plus Optical Centre", city: "Bridgetown" }, index, []);
    expect(crm.status).toBe("suggested");
    expect(crm.suggestions[0]).toMatchObject({ contactId: "c1" });
  });

  it("associates by website only with supporting identity evidence", () => {
    const supported = annotateLead(
      { name: "Vision Plus Optical", city: "Bridgetown", website: "https://visionplus.bb/contact" },
      index,
      [],
    );
    expect(supported.match).toMatchObject({ contactId: "c1", basis: "website" });

    const unsupported = annotateLead({ name: "Totally Different Eyes", city: "Oistins", website: "https://visionplus.bb" }, index, []);
    expect(unsupported.status).toBe("suggested");
    expect(unsupported.match).toBeNull();
  });

  it("treats a shared domain as a suggestion, never an association", () => {
    const sibling = contact({ id: "c4", name: "Vision Plus Annex", city: "Bridgetown", website: "visionplus.bb" });
    const crm = annotateLead(
      { name: "Vision Plus Annex", city: "Bridgetown", website: "https://visionplus.bb" },
      buildCrmIndex([prospect, sibling], []),
      [],
    );
    // exact name+city to c4 is the only reliable signal; the domain alone must not pick between them
    expect(crm.match?.basis).toBe("name_location");
    const ambiguous = annotateLead(
      { name: "Vision Plus Group", city: "Speightstown", website: "https://visionplus.bb" },
      buildCrmIndex([prospect, sibling], []),
      [],
    );
    expect(ambiguous.match).toBeNull();
    expect(ambiguous.suggestions.map((s) => s.contactId).sort()).toEqual(["c1", "c4"]);
    expect(ambiguous.suggestions[0].reason).toMatch(/shares website/i);
  });

  it("ignores generic social hosts as identity", () => {
    const social = contact({ id: "c5", name: "Eye Care One", city: "Bridgetown", website: "https://facebook.com/eyecareone" });
    const crm = annotateLead(
      { name: "Sunrise Opticians", city: "Bridgetown", website: "https://facebook.com/eyecareone" },
      buildCrmIndex([social], []),
      [],
    );
    expect(crm.match).toBeNull();
    expect(crm.suggestions).toEqual([]);
  });
});

describe("alternate names and confirmed links", () => {
  const lead = { name: "VP Eyes", city: "Bridgetown" };
  const link: ConfirmedLink = {
    identity_key: buildIdentityKey(lead),
    normalized_name: "vp eyes",
    city: "bridgetown",
    link_kind: "contact",
    contact_id: "c1",
  };

  it("recognises a business linked earlier under a different name", () => {
    expect(annotateLead(lead, index, []).status).toBe("none");
    const crm = annotateLead(lead, index, [link]);
    expect(crm.match).toMatchObject({ contactId: "c1", basis: "confirmed_link", confirmed: true });
  });

  it("recognises the alias when the search surfaces a different identity key but the same name and city", () => {
    const crm = annotateLead({ name: "VP Eyes Ltd.", city: "Bridgetown" }, index, [{ ...link, identity_key: "name:other|x" }]);
    expect(crm.match?.basis).toBe("confirmed_link");
  });

  it("falls back to normal matching when the linked contact no longer exists", () => {
    const crm = annotateLead(lead, index, [{ ...link, contact_id: "gone" }]);
    expect(crm.status).toBe("none");
  });
});

describe("customer recognition and exclusion", () => {
  const leads = [
    { name: "Optical Hub", city: "Port of Spain" },
    { name: "Vision Plus", city: "Bridgetown" },
    { name: "Fresh Prospect", city: "Oistins" },
  ];

  it("derives customer status from linked account, flag, parent company or account contact", () => {
    const parentCustomer = contact({ id: "p", name: "Chain HQ", is_customer: true });
    const child = contact({ id: "k", name: "Chain Branch", city: "Speightstown", parent_id: "p" });
    const byAccount = contact({ id: "a", name: "Account Owner", city: "Oistins" });
    const idx = buildCrmIndex([parentCustomer, child, byAccount], [{ id: 5, name: "Account Owner", contact_id: "a" }]);
    expect(annotateLead({ name: "Chain Branch", city: "Speightstown" }, idx, []).isCurrentCustomer).toBe(true);
    expect(annotateLead({ name: "Account Owner", city: "Oistins" }, idx, []).customerSource).toBe("crm_record");
  });

  it("recognises a customer account that has no CRM contact", () => {
    const idx = buildCrmIndex([], [{ id: 9, name: "Lone Account Ltd", contact_id: null }]);
    const crm = annotateLead({ name: "Lone Account", city: "Bridgetown" }, idx, []);
    expect(crm).toMatchObject({ isCurrentCustomer: true, customerSource: "customer_account" });
  });

  it("excludes customers before the limit is applied and counts them", () => {
    const result = applyCrmMatching(leads, index, [], { showCurrentCustomers: false });
    expect(result.leads.map((l) => l.name)).toEqual(["Vision Plus", "Fresh Prospect"]);
    expect(result.excludedCustomerCount).toBe(1);
    // a limit of 2 applied afterwards still yields both prospects
    expect(result.leads.slice(0, 2)).toHaveLength(2);
  });

  it("keeps a linked prospect visible and excludes a linked customer on the next search", () => {
    const link = (key: string, contactId: string): ConfirmedLink => ({
      identity_key: key, normalized_name: "x", city: null, link_kind: "contact", contact_id: contactId,
    });
    const lead = { name: "Different Name", city: "Nowhere" };
    const toProspect = applyCrmMatching([lead], index, [link(buildIdentityKey(lead), "c1")], { showCurrentCustomers: false });
    expect(toProspect.leads).toHaveLength(1);
    expect(toProspect.leads[0].crm.match?.contactId).toBe("c1");
    const toCustomer = applyCrmMatching([lead], index, [link(buildIdentityKey(lead), "c2")], { showCurrentCustomers: false });
    expect(toCustomer.leads).toHaveLength(0);
    expect(toCustomer.excludedCustomerCount).toBe(1);
  });

  it("honours an unlinked customer marking, and stops excluding once it is cleared", () => {
    const lead = { name: "Walk In Optics", city: "Bridgetown" };
    const mark: ConfirmedLink = {
      identity_key: buildIdentityKey(lead), normalized_name: "walk in optics", city: "bridgetown", link_kind: "customer_mark", contact_id: null,
    };
    const marked = applyCrmMatching([lead], index, [mark], { showCurrentCustomers: false });
    expect(marked.leads).toHaveLength(0);
    expect(marked.excludedCustomerCount).toBe(1);
    const cleared = applyCrmMatching([lead], index, [], { showCurrentCustomers: false });
    expect(cleared.leads).toHaveLength(1);
  });

  it("shows current customers on request with no exclusion count", () => {
    const result = applyCrmMatching(leads, index, [], { showCurrentCustomers: true });
    expect(result.leads).toHaveLength(3);
    expect(result.excludedCustomerCount).toBe(0);
  });

  it("reports a customer-only result set as fully excluded", () => {
    const result = applyCrmMatching([leads[0]], index, [], { showCurrentCustomers: false });
    expect(result.leads).toHaveLength(0);
    expect(result.excludedCustomerCount).toBe(1);
  });

  it("marks annotations unavailable when the CRM could not be read", () => {
    expect(unavailableAnnotation(leads[1])).toMatchObject({ status: "unavailable", isCurrentCustomer: false, match: null });
  });
});
