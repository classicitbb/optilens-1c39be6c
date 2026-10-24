import { describe, expect, it } from "vitest";
import { dispatchHelpdeskTool, HELPDESK_TOOL_NAMES } from "../../../supabase/functions/_shared/copilot/helpdeskTools";

type Insert = { table: string; values: Record<string, unknown> };

const fakeDb = (inserts: Insert[]) => ({
  from(table: string) {
    return {
      insert(values: Record<string, unknown>) {
        inserts.push({ table, values });
        return {
          select: () => ({
            single: async () => ({
              data: table === "copilot_runs" ? { id: "run-1" } : { ...values, created_at: "2026-09-08T00:00:00Z" },
              error: null,
            }),
          }),
          then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }),
        };
      },
    };
  },
});

describe("copilot helpdesk ticket tool", () => {
  it("opens a ticket, its timeline event and a completed action carrying the ticket id", async () => {
    const inserts: Insert[] = [];
    const result = await dispatchHelpdeskTool(fakeDb(inserts), "create_support_ticket", {
      title: "Lens order arrived scratched",
      description: "Customer reports two scratched lenses on order 1042.",
      priority: "High",
    }, "admin-1");

    const ticket = inserts.find((row) => row.table === "helpdesk_tickets")!;
    expect(ticket.values).toMatchObject({ title: "Lens order arrived scratched", priority: 3, source_channel: "ai_assistant" });
    expect(String(ticket.values.ticket_number)).toMatch(/^TCK-[0-9A-F]{12}$/);

    expect(inserts.find((row) => row.table === "helpdesk_ticket_events")?.values).toMatchObject({ event_type: "ticket_created" });

    const action = inserts.find((row) => row.table === "copilot_actions")!;
    expect(action.values).toMatchObject({ action_type: "create_support_ticket", status: "completed", approved_by: "admin-1" });
    expect(action.values.result).toEqual({ ticketId: result.ticketId, ticketNumber: result.ticketNumber });
    expect(result.url).toBe(`/admin/helpdesk/tickets/${result.ticketId}`);
  });

  it("defaults to normal priority and sends no email", async () => {
    const inserts: Insert[] = [];
    const result = await dispatchHelpdeskTool(fakeDb(inserts), "create_support_ticket", {
      title: "Follow up on statement query",
      description: "Check the July statement balance.",
    }, "admin-1");

    expect(inserts.find((row) => row.table === "helpdesk_tickets")?.values).toMatchObject({ priority: 1 });
    expect(result.note).toContain("No email was sent");
  });

  it("refuses a ticket with no title or description", async () => {
    await expect(dispatchHelpdeskTool(fakeDb([]), "create_support_ticket", { title: "  ", description: "x" }, "admin-1"))
      .rejects.toThrow(/title is required/);
    await expect(dispatchHelpdeskTool(fakeDb([]), "create_support_ticket", { title: "Something", description: "" }, "admin-1"))
      .rejects.toThrow(/description is required/);
  });

  it("rejects an unrecognised priority rather than guessing", async () => {
    await expect(dispatchHelpdeskTool(fakeDb([]), "create_support_ticket", { title: "T", description: "D", priority: "extremely urgent" }, "admin-1"))
      .rejects.toThrow(/priority must be/i);
  });

  it("exposes the tool under its documented name", () => {
    expect(HELPDESK_TOOL_NAMES.has("create_support_ticket")).toBe(true);
  });
});
