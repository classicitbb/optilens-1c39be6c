import { describe, expect, it } from "vitest";
import {
  buildErpPortalRolloutPlan,
  isErpPortalRolloutCommand,
  type CopilotCustomer,
  type CopilotPersonContact,
} from "../../../supabase/functions/_shared/copilot/portalRollout";

const customer = (overrides: Partial<CopilotCustomer> = {}): CopilotCustomer => ({
  id: 7,
  name: "Acme Optical",
  account_number: "ACME",
  email: "office@acme.test",
  contact_id: "company-7",
  innovations_customer_id: 7007,
  ...overrides,
});

const person = (overrides: Partial<CopilotPersonContact> = {}): CopilotPersonContact => ({
  id: "person-7",
  name: "Alicia Clarke",
  email: "alicia@acme.test",
  parent_id: "company-7",
  linked_customer_id: 7,
  innovations_parent_customer_id: 7007,
  is_company: false,
  is_archived: false,
  ...overrides,
});

describe("ERP portal rollout command", () => {
  it("recognizes the V1 success command and close plain-English variants", () => {
    expect(isErpPortalRolloutCommand("Roll out portal access to all ERP customers")).toBe(true);
    expect(isErpPortalRolloutCommand("Prepare ERP customer portal invitations")).toBe(true);
    expect(isErpPortalRolloutCommand("Show monthly sales trends")).toBe(false);
  });
});

describe("buildErpPortalRolloutPlan", () => {
  it("prepares one Level 4 invite for an unlinked ERP customer with one safe person", () => {
    const plan = buildErpPortalRolloutPlan([customer()], [person()], [], {
      templateKey: "builtin:erp-portal-access-v1",
      templateName: "ERP Portal Access v1",
      subjectPattern: "Your Classic Visions portal access — {{customer_name}}",
    });

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      actionType: "send_portal_invite",
      riskLevel: 4,
      customerId: 7,
      contactId: "person-7",
      recipientEmail: "alicia@acme.test",
      subject: "Your Classic Visions portal access — Acme Optical",
    });
    expect(plan.counts).toEqual({ erpCustomers: 1, alreadyActive: 0, invitationsReady: 1, followUpsNeeded: 0 });
  });

  it("excludes customers that already have an active portal membership", () => {
    const plan = buildErpPortalRolloutPlan([customer()], [person()], [{ customer_id: 7, status: "active" }]);
    expect(plan.actions).toEqual([]);
    expect(plan.counts.alreadyActive).toBe(1);
  });

  it("prepares a follow-up instead of guessing when several people have email", () => {
    const plan = buildErpPortalRolloutPlan(
      [customer()],
      [person(), person({ id: "person-8", name: "David Clarke", email: "david@acme.test" })],
      [],
    );
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({ actionType: "create_followup_task", riskLevel: 2, status: "pending_approval" });
    expect(plan.actions[0].summary).toContain("multiple possible recipients");
  });

  it("prepares a follow-up when the person has no usable email", () => {
    const plan = buildErpPortalRolloutPlan([customer()], [person({ email: null })], []);
    expect(plan.actions[0]).toMatchObject({ actionType: "create_followup_task", contactId: "person-7" });
    expect(plan.actions[0].summary).toContain("email");
  });

  it("never treats a company contact as the portal login identity", () => {
    const plan = buildErpPortalRolloutPlan([customer()], [person({ is_company: true })], []);
    expect(plan.actions[0]).toMatchObject({ actionType: "create_followup_task", contactId: "company-7" });
  });
});
