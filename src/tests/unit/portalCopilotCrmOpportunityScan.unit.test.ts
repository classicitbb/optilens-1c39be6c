import { describe, expect, it } from "vitest";
import {
  buildQualifiedCrmPlan,
  isQualifiedCrmScanCommand,
  type CrmScanContact,
} from "../../../supabase/functions/_shared/copilot/crmOpportunityScan";

const contact = (overrides: Partial<CrmScanContact> = {}): CrmScanContact => ({
  id: "contact-1",
  name: "I Care Express",
  business_name: "I Care Express",
  email: "orders@icare.example",
  phone: "+1 246 555 0100",
  pipeline: "opticals",
  stage: "customer",
  next_action_at: null,
  lead_score: 80,
  is_company: true,
  is_archived: false,
  ...overrides,
});

describe("qualified CRM Copilot planning", () => {
  it("prioritises a lapsed-buyer signal and explains evidence without inventing a cause", () => {
    const plan = buildQualifiedCrmPlan(
      [contact()],
      [{ contact_id: "contact-1", last_order_date: "2026-06-01", quiet_days: 74, avg_gap_days: 12, orders_last_30_days: 0, health: "alarm" }],
      [],
      [],
      new Date("2026-08-14T12:00:00Z"),
    );

    expect(plan.counts).toMatchObject({ suggestionsPrepared: 1, lapsedBuyers: 1 });
    expect(plan.actions[0]).toMatchObject({ reasonCode: "lapsed_buyer", priority: "urgent", actionType: "create_followup_task" });
    expect(plan.actions[0].summary).toContain("not a prediction of why volume changed");
    expect(plan.actions[0].evidence.join(" ")).toContain("74 quiet days");
    expect(plan.actions[0].inference).toContain("does not establish why");
  });

  it("does not add noise when an open activity already covers the contact", () => {
    const plan = buildQualifiedCrmPlan(
      [contact()],
      [{ contact_id: "contact-1", last_order_date: "2026-06-01", quiet_days: 74, avg_gap_days: 12, orders_last_30_days: 0, health: "alarm" }],
      [],
      [{ contact_id: "contact-1", status: "planned" }],
      new Date("2026-08-14T12:00:00Z"),
    );

    expect(plan.actions).toEqual([]);
  });

  it("recommends review rather than silently creating a missing opportunity", () => {
    const plan = buildQualifiedCrmPlan(
      [contact({ stage: "qualifying" })],
      [],
      [],
      [],
      new Date("2026-08-14T12:00:00Z"),
    );

    expect(plan.actions[0]).toMatchObject({ reasonCode: "no_active_opportunity", opportunityId: null });
    expect(plan.actions[0].recommendedNextAction).toContain("decide whether to create");
  });

  it("does not treat a closed opportunity as active", () => {
    const plan = buildQualifiedCrmPlan(
      [contact({ stage: "qualifying" })],
      [],
      [{ id: "old-opportunity", contact_id: "contact-1", title: "Old deal", stage: "closed_lost" }],
      [],
      new Date("2026-08-14T12:00:00Z"),
    );

    expect(plan.actions[0]).toMatchObject({ reasonCode: "no_active_opportunity", opportunityId: null });
  });

  it("recognises explicit CRM recommendation commands but not ordinary chat", () => {
    expect(isQualifiedCrmScanCommand("Scan CRM for lapsed buyers and suggested follow-ups")).toBe(true);
    expect(isQualifiedCrmScanCommand("What is the weather today?")).toBe(false);
  });
});
