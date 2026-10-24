import { describe, expect, it } from "vitest";
import { suggestFollowUps } from "@/features/admin/copilot/followUpSuggestions";
import type { CopilotAction, CopilotRun, CopilotState } from "@/features/admin/copilot/api";

const action = (overrides: Partial<CopilotAction>): CopilotAction => ({
  id: "action-1",
  run_id: "run-1",
  customer_id: null,
  contact_id: null,
  action_type: "create_followup_task",
  risk_level: 1,
  status: "pending_approval",
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

const run = (overrides: Partial<CopilotRun>): CopilotRun => ({
  id: "run-1",
  conversation_id: "conv-1",
  workflow: "crm_opportunity_scan",
  command_text: "",
  input_mode: "text",
  transcript: null,
  transcript_confirmed: false,
  autonomy_level: 1,
  status: "prepared",
  source_system: "",
  source_snapshot_at: "",
  summary: {},
  requested_by: "",
  created_at: "",
  updated_at: "",
  ...overrides,
}) as CopilotRun;

const state = (overrides: Partial<CopilotState>): CopilotState => ({
  conversations: [],
  selectedConversationId: "conv-1",
  messages: [{ id: "m1", conversation_id: "conv-1", role: "assistant", content: "done", attachments: [], created_at: "" }],
  runs: [],
  selectedRunId: null,
  actions: [],
  auditEvents: [],
  settings: null,
  ...overrides,
}) as CopilotState;

describe("suggestFollowUps", () => {
  it("offers nothing before Iris has said anything", () => {
    expect(suggestFollowUps(null)).toEqual([]);
    expect(suggestFollowUps(state({ messages: [] }))).toEqual([]);
  });

  it("offers to explain the evidence behind a pending action, never to approve it", () => {
    const suggestions = suggestFollowUps(state({ actions: [action({})] }));
    expect(suggestions[0].id).toBe("explain-pending");
    expect(suggestions[0].prompt).toContain("Follow up with Acme");
    expect(suggestions.some((item) => /approve/i.test(item.prompt))).toBe(false);
  });

  it("surfaces run signals such as lapsed buyers", () => {
    const suggestions = suggestFollowUps(state({
      selectedRunId: "run-1",
      runs: [run({ summary: { lapsedBuyers: 4, followUpsNeeded: 2 } })],
    }));
    expect(suggestions.map((item) => item.id)).toEqual(["draft-followups", "lapsed-buyers"]);
    expect(suggestions[1].label).toContain("4");
  });

  it("asks what failed when a run only partly completed", () => {
    const suggestions = suggestFollowUps(state({ selectedRunId: "run-1", runs: [run({ status: "partial" })] }));
    expect(suggestions[0].id).toBe("explain-failure");
  });

  it("caps the row at three chips", () => {
    const suggestions = suggestFollowUps(state({
      actions: [action({}), action({ id: "a2", status: "failed" })],
      selectedRunId: "run-1",
      runs: [run({ status: "partial", summary: { lapsedBuyers: 4, followUpsNeeded: 2, missingContactDetails: 1 } })],
    }));
    expect(suggestions).toHaveLength(3);
  });

  it("asks for the next step once work has completed and nothing is pending", () => {
    const suggestions = suggestFollowUps(state({ actions: [action({ status: "completed" })] }));
    expect(suggestions.map((item) => item.id)).toEqual(["what-next"]);
  });
});
