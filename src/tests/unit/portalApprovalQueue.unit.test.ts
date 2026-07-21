import { describe, expect, it } from "vitest";
import { buildPortalApprovalQueue, type PendingSignupProfile } from "@/lib/portalApprovalQueue";

const profile = (over: Partial<PendingSignupProfile>): PendingSignupProfile => ({
  user_id: "u1",
  full_name: "Jane Doe",
  email: "jane@acme.com",
  organization_name: "Acme",
  claimed_account_number: null,
  crm_contact_id: "c1",
  updated_at: "2026-07-21T00:00:00Z",
  ...over,
});

const customers = [
  { id: 1, name: "Acme Optical", account_number: "RETAIL" },
  { id: 2, name: "Beta Vision", account_number: "BETA" },
];

describe("buildPortalApprovalQueue", () => {
  it("routes an exact single account-number match to staff-at-existing", () => {
    const q = buildPortalApprovalQueue([profile({ claimed_account_number: "retail" })], customers, { 1: [{ full_name: "Boss", email: "boss@acme.com" }] });
    expect(q.staffAtExisting).toHaveLength(1);
    expect(q.newOrUnresolved).toHaveLength(0);
    expect(q.staffAtExisting[0].matchedCustomer?.id).toBe(1);
    expect(q.staffAtExisting[0].existingStaff).toEqual([{ full_name: "Boss", email: "boss@acme.com" }]);
    expect(q.staffAtExisting[0].emailDomain).toBe("acme.com");
  });

  it("normalizes case/whitespace when matching the claim", () => {
    const q = buildPortalApprovalQueue([profile({ claimed_account_number: "  retail  " })], customers, {});
    expect(q.staffAtExisting).toHaveLength(1);
  });

  it("treats no claim as unresolved", () => {
    const q = buildPortalApprovalQueue([profile({ claimed_account_number: null })], customers, {});
    expect(q.newOrUnresolved).toHaveLength(1);
    expect(q.newOrUnresolved[0].matchedCustomer).toBeNull();
  });

  it("treats a non-matching claim as unresolved", () => {
    const q = buildPortalApprovalQueue([profile({ claimed_account_number: "NOPE" })], customers, {});
    expect(q.newOrUnresolved).toHaveLength(1);
  });

  it("treats an ambiguous multi-match as unresolved rather than guessing", () => {
    const dupes = [
      { id: 1, name: "Acme One", account_number: "RETAIL" },
      { id: 3, name: "Acme Two", account_number: "RETAIL" },
    ];
    const q = buildPortalApprovalQueue([profile({ claimed_account_number: "RETAIL" })], dupes, {});
    expect(q.newOrUnresolved).toHaveLength(1);
    expect(q.staffAtExisting).toHaveLength(0);
  });

  it("does not match a customer with a blank account number", () => {
    const q = buildPortalApprovalQueue(
      [profile({ claimed_account_number: "" })],
      [{ id: 9, name: "No Account", account_number: "" }],
      {},
    );
    expect(q.newOrUnresolved).toHaveLength(1);
  });
});
