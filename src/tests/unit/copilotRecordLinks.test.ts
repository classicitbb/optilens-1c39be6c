import { describe, expect, it } from "vitest";
import { resolveActionRecordLink } from "@/features/admin/copilot/recordLinks";
import type { CopilotAction } from "@/features/admin/copilot/api";

const action = (overrides: Partial<CopilotAction>): CopilotAction => ({
  id: "action-1",
  run_id: "run-1",
  customer_id: null,
  contact_id: null,
  action_type: "create_followup_task",
  risk_level: 1,
  status: "completed",
  title: "Follow up with Acme",
  summary: "",
  payload: {},
  result: null,
  retry_count: 0,
  last_error: null,
  approved_by: null,
  approved_at: null,
  executed_at: null,
  created_at: "",
  updated_at: "",
  ...overrides,
}) as CopilotAction;

describe("resolveActionRecordLink", () => {
  it("deep links a created activity to the CRM focus desk", () => {
    expect(resolveActionRecordLink(action({ result: { activityId: "abc" } }))).toEqual({
      href: "/admin/crm/activities?task=abc",
      label: "Open the activity",
    });
  });

  it("deep links a created ticket to the helpdesk", () => {
    expect(resolveActionRecordLink(action({ result: { ticketId: "t-9" } }))?.href).toBe("/admin/helpdesk/tickets/t-9");
  });

  it("returns no link until the action has executed", () => {
    expect(resolveActionRecordLink(action({ status: "pending_approval", result: { activityId: "abc" } }))).toBeNull();
  });

  it("returns no link for actions that create no record", () => {
    expect(resolveActionRecordLink(action({ action_type: "send_docstudio_email", result: { emailQueued: true } }))).toBeNull();
  });
});
