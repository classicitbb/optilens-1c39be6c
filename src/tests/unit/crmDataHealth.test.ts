import { describe, expect, it } from "vitest";
import { findDataHealthIssues, survivorScore, type DataHealthContact } from "@/features/admin/crm/dataHealth";

let n = 0;
const c = (o: Partial<DataHealthContact>): DataHealthContact => ({
  id: `id${++n}`, name: null, business_name: null, email: null, phone: null, is_company: false, parent_id: null,
  linked_customer_id: null, innovations_parent_customer_id: null, pipeline: null, stage: null, notes: null,
  created_at: "2026-07-01T00:00:00Z", ...o,
});

describe("findDataHealthIssues", () => {
  it("does not flag a company and its person sharing an email", () => {
    const co = c({ id: "co", name: "Wade's Optical", is_company: true, email: "w@x.com" });
    const p = c({ name: "Roxanne Wade", business_name: "Wade's Optical", parent_id: "co", email: "w@x.com" });
    expect(findDataHealthIssues([co, p])).toEqual([]);
  });

  it("finds duplicate companies and recommends the ERP-synced one", () => {
    const old = c({ id: "old", name: "EYEFOCUS INC", is_company: true, created_at: "2026-03-31T00:00:00Z" });
    const erp = c({ id: "erp", name: "Eye Focus Inc.", is_company: true, notes: "Created from imported Innovations customer.", stage: "customer" });
    const [f] = findDataHealthIssues([old, erp]);
    expect(f.kind).toBe("duplicate_company");
    expect(f.contacts.map((x) => x.id)).toEqual(["erp", "old"]);
  });

  it("finds the same person saved twice under one business, ignoring the (#id) suffix", () => {
    const a = c({ name: "Navin Singh", business_name: "Singhs Eye Care" });
    const b = c({ name: "Navin Singh (#144)", business_name: "Singhs Eye Care" });
    expect(findDataHealthIssues([a, b]).map((f) => f.kind)).toEqual(["duplicate_person"]);
  });

  it("does not treat two different people at one business as duplicates", () => {
    const a = c({ name: "Kym Charles", business_name: "BelZye", email: "a@x.com" });
    const b = c({ name: "Wendy", business_name: "BelZye", email: "b@x.com" });
    expect(findDataHealthIssues([a, b])).toEqual([]);
  });

  it("proposes linking an unlinked person to the single matching company", () => {
    const co = c({ id: "co", name: "Calsea Vision Aids", is_company: true });
    const p = c({ name: "Eugene Holder", business_name: "Calsea Vision Aids" });
    const [f] = findDataHealthIssues([co, p]);
    expect(f).toMatchObject({ kind: "unlinked_person", company: { id: "co" } });
  });

  it("does not guess when two companies share the name", () => {
    const a = c({ name: "Eyeland Optical", is_company: true });
    const b = c({ name: "EYELAND OPTICAL", is_company: true });
    const p = c({ name: "Sam", business_name: "Eyeland Optical" });
    expect(findDataHealthIssues([a, b, p]).map((f) => f.kind)).toEqual(["duplicate_company"]);
  });

  it("flags multi-address and malformed emails only", () => {
    const ok = c({ email: "a@b.com" });
    const multi = c({ email: "a@b.com; c@d.com" });
    const bad = c({ email: "nope" });
    expect(findDataHealthIssues([ok, multi, bad]).filter((f) => f.kind === "email_format")).toHaveLength(2);
  });

  it("scores a classified ERP record above a bare one", () => {
    expect(survivorScore(c({ linked_customer_id: 5, stage: "customer" }))).toBeGreaterThan(survivorScore(c({})));
  });
});
