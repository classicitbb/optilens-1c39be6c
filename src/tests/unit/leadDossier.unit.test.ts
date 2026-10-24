import { describe, expect, it } from "vitest";
import {
  addBusinessHours,
  buildDossier,
  isSalesInquiry,
  parseInquiryNotes,
  whatsappHref,
  type DossierContact,
  type DossierInput,
} from "../../../supabase/functions/_shared/leads/dossier.ts";
import {
  emailListIncludes,
  escapeLikePattern,
  likePatternFor,
  parseEmailList,
  pickContactMatch,
} from "../../../supabase/functions/_shared/crm/contactEmailMatch.ts";

describe("contact email matching", () => {
  it("escapes LIKE wildcards so underscores and percents match literally", () => {
    expect(escapeLikePattern("a_b%c\\d@x.com")).toBe("a\\_b\\%c\\\\d@x.com");
    expect(likePatternFor(" Jo_e@x.com ")).toBe("%Jo\\_e@x.com%");
  });

  it("parses the CRM email list field", () => {
    expect(parseEmailList("A@x.com; b@x.com,\nA@X.com")).toEqual(["a@x.com", "b@x.com"]);
    expect(parseEmailList(null)).toEqual([]);
  });

  it("matches a secondary address but not a substring of another address", () => {
    expect(emailListIncludes("a@x.com, b@x.com", "B@X.com")).toBe(true);
    expect(emailListIncludes("ab@x.com", "b@x.com")).toBe(false);
  });

  it("prefers a live customer over duplicates and returns null with no exact match", () => {
    const rows = [
      { id: "old", email: "a@x.com", is_archived: true, is_customer: true, updated_at: "2026-01-01" },
      { id: "lead", email: "a@x.com", is_customer: false, updated_at: "2026-09-01" },
      { id: "cust", email: "z@x.com, a@x.com", is_customer: true, updated_at: "2026-02-01" },
      { id: "other", email: "ab@x.com", is_customer: true },
    ];
    expect(pickContactMatch(rows, "a@x.com")?.id).toBe("cust");
    expect(pickContactMatch(rows, "nobody@x.com")).toBeNull();
    expect(pickContactMatch([], "a@x.com")).toBeNull();
  });
});

describe("addBusinessHours (Barbados, Mon-Fri 09-17)", () => {
  const at = (iso: string, hours = 4) => addBusinessHours(iso, hours).toISOString();

  it("adds within the same day", () => {
    expect(at("2026-10-20T14:00:00Z")).toBe("2026-10-20T18:00:00.000Z"); // Tue 10:00 -> 14:00
  });

  it("rolls over the end of the day", () => {
    expect(at("2026-10-20T19:00:00Z")).toBe("2026-10-21T15:00:00.000Z"); // Tue 15:00 -> Wed 11:00
  });

  it("skips the weekend", () => {
    expect(at("2026-10-23T20:00:00Z")).toBe("2026-10-26T16:00:00.000Z"); // Fri 16:00 -> Mon 12:00
    expect(at("2026-10-24T16:00:00Z")).toBe("2026-10-26T17:00:00.000Z"); // Sat 12:00 -> Mon 13:00
  });

  it("starts counting at opening time for early submissions", () => {
    expect(at("2026-10-20T10:00:00Z")).toBe("2026-10-20T17:00:00.000Z"); // Tue 06:00 -> 13:00
  });
});

describe("parseInquiryNotes", () => {
  it("reads the trade form's Key: value lines", () => {
    expect(parseInquiryNotes("Website: specs.bb\nMonthly Volume: 50-100\nBusiness Type: Independent optical\nNotes: Hello: there")).toEqual({
      website: "specs.bb",
      monthly_volume: "50-100",
      business_type: "Independent optical",
      notes: "Hello: there",
    });
  });

  it("reads the portal signup JSON and ignores nested or empty values", () => {
    expect(parseInquiryNotes(JSON.stringify({ tax_id: "T-1", country: "Barbados", redirect: "/", nested: { a: 1 }, empty: "" }))).toEqual({
      tax_id: "T-1",
      country: "Barbados",
      redirect: "/",
    });
  });

  it("tolerates empty and malformed input", () => {
    expect(parseInquiryNotes("")).toEqual({});
    expect(parseInquiryNotes("{not json")).toEqual({});
  });
});

describe("whatsappHref", () => {
  it("only builds a link when the number carries its own country code", () => {
    expect(whatsappHref("+1 (246) 555-1234")).toBe("https://wa.me/12465551234");
    expect(whatsappHref("1-246-555-1234")).toBe("https://wa.me/12465551234");
    expect(whatsappHref("555-1234")).toBeNull();
    expect(whatsappHref("2465551234")).toBeNull();
  });
});

const contact = (over: Partial<DossierContact> = {}): DossierContact => ({
  id: "c1", name: "Jane Doe", businessName: "Specs Optical", stage: "qualifying", pipeline: "opticals",
  isCustomer: false, website: null, city: "Bridgetown", country: "Barbados", googleRating: 4.6,
  googleReviewsCount: 88, leadScore: 0, salesperson: null, leadSource: "website:trade_account", ...over,
});

const input = (over: Partial<DossierInput> = {}): DossierInput => ({
  inquiry: {
    id: "i1", type: "trade_account", name: "Jane Doe", email: "jane@specs.bb", phone: "+1 246 555 1234",
    businessName: "Specs Optical", message: "New trade account request submitted.",
    notes: "Monthly Volume: 50-100\nBusiness Type: Independent optical",
    pageSlug: "/professionals/trade-account", sourceChannel: "website", submittedAt: "2026-10-20T14:00:00Z",
  },
  contact: contact(),
  contactWasCreated: true,
  history: { priorInquiries: 0, ticketsOnFile: 0, lastOutreachAt: null },
  ticket: { id: "t1", number: "TCK-ABC" },
  adminBaseUrl: "https://admin.classicvisions.net/",
  ...over,
});

describe("buildDossier", () => {
  it("builds a trade-account summary with every section", () => {
    const d = buildDossier(input());
    expect(d.subject).toBe("Trade account request: Specs Optical (Bridgetown)");
    expect(d.respondBy).toBe("2026-10-20T18:00:00.000Z");
    expect(d.respondByLabel).toContain("Barbados time");
    expect(d.told).toEqual(expect.arrayContaining([
      { label: "Monthly volume", value: "50-100" },
      { label: "Business type", value: "Independent optical" },
    ]));
    expect(d.fit).toEqual(expect.arrayContaining([{ label: "Google rating", value: "4.6 (88 reviews)" }]));
    expect(d.history).toEqual(expect.arrayContaining([
      { label: "CRM record", value: "Created just now from this request" },
      { label: "Earlier requests", value: "First request" },
    ]));
    expect(d.nextMove.action).toMatch(/approve the account/);
    expect(d.contactActions.map((a) => a.label)).toEqual(["Reply by email", "WhatsApp", "Call +1 246 555 1234"]);
    expect(d.adminActions.map((a) => a.href)).toEqual([
      "https://admin.classicvisions.net/admin/crm/contacts?contact=c1",
      "https://admin.classicvisions.net/admin/helpdesk/tickets?ticket=t1",
      "https://admin.classicvisions.net/admin/website/portals?status=pending_approval",
    ]);
  });

  it("flags repeat requests and existing customers", () => {
    const repeat = buildDossier(input({ history: { priorInquiries: 2, ticketsOnFile: 1, lastOutreachAt: "2026-10-10T14:00:00Z" } }));
    expect(repeat.subject.startsWith("Repeat: ")).toBe(true);
    expect(repeat.nextMove.reason).toMatch(/request number 3, so reply today/);
    expect(repeat.history).toEqual(expect.arrayContaining([{ label: "Last outreach sent", value: "10 days ago" }]));

    const customer = buildDossier(input({ contact: contact({ isCustomer: true }), contactWasCreated: false }));
    expect(customer.nextMove.action).toMatch(/account manager/);
    expect(customer.adminActions.map((a) => a.label)).not.toContain("Review pending approvals");
  });

  it("reads the trade ID for portal signups", () => {
    const d = buildDossier(input({
      inquiry: { ...input().inquiry, type: "auth_onboarding_interest", notes: JSON.stringify({ tax_id: "T-77", country: "Barbados" }) },
    }));
    expect(d.kindLabel).toBe("Portal signup");
    expect(d.nextMove.action).toContain("T-77");
    expect(d.told).toEqual(expect.arrayContaining([{ label: "Trade / tax ID", value: "T-77" }]));
  });

  it("still produces a usable summary when no CRM contact could be matched or created", () => {
    const d = buildDossier(input({ contact: null, contactWasCreated: false, ticket: null, inquiry: { ...input().inquiry, phone: "" } }));
    expect(d.subject).toBe("Trade account request: Specs Optical");
    expect(d.fit).toEqual([{ label: "CRM", value: "No matching contact (could not create one)" }]);
    expect(d.contactActions.map((a) => a.label)).toEqual(["Reply by email"]);
    expect(d.adminActions.map((a) => a.label)).toEqual(["Review pending approvals"]);
  });

  it("never promises prices, discounts or dates in the suggested next move", () => {
    for (const type of ["trade_account", "price_list", "auth_onboarding_interest"] as const) {
      const d = buildDossier(input({ inquiry: { ...input().inquiry, type } }));
      expect(`${d.nextMove.action} ${d.nextMove.reason}`).not.toMatch(/\$|discount|free|guarantee/i);
    }
  });
});

describe("isSalesInquiry", () => {
  it("covers the three sales inquiry types only", () => {
    expect(["trade_account", "price_list", "auth_onboarding_interest"].every(isSalesInquiry)).toBe(true);
    expect(isSalesInquiry("contact")).toBe(false);
    expect(isSalesInquiry("assistant_request")).toBe(false);
  });
});
