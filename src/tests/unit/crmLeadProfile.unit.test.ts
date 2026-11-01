import { describe, expect, it } from "vitest";
import { buildLeadProfile } from "@/features/admin/crm/leadProfile";

const base = { pipeline: "opticals", stage: "target", website: "https://x.example", instagram_handle: null };

describe("buildLeadProfile", () => {
  it("flags a well-reviewed independent and names the evidence", () => {
    const p = buildLeadProfile({ ...base, google_rating: 4.6, google_reviews_count: 85 });
    expect(p.persona).toBe("Established independent");
    expect(p.signals[0]).toEqual({ label: "Local reputation", evidence: "4.6★ from 85 Google reviews" });
  });

  it("treats a contact with no online presence as word-of-mouth and prefers WhatsApp", () => {
    const p = buildLeadProfile({ ...base, website: null });
    expect(p.persona).toBe("Word-of-mouth shop");
    expect(p.channel).toBe("whatsapp");
  });

  it("puts a quiet account first, ahead of other personas", () => {
    const p = buildLeadProfile({ ...base, stage: "customer", is_customer: true }, { health: "alarm", quiet_days: 24, avg_gap_days: 1.4 });
    expect(p.persona).toBe("At-risk account");
    expect(p.channel).toBe("call");
    expect(p.signals[p.signals.length - 1]?.evidence).toMatch(/24 quiet days/);
  });

  it("routes by pipeline for stores and labs", () => {
    expect(buildLeadProfile({ ...base, pipeline: "department_stores" }).persona).toBe("Chain or department store");
    expect(buildLeadProfile({ ...base, pipeline: "labs" }).persona).toBe("Lab");
  });
});
