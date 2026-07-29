import { describe, expect, it } from "vitest";
import { getOperatorAttentionItems, isTaskAttentionRequired, isTicketAttentionRequired } from "@/features/admin/notifications/operatorAttention";

const NOW = Date.parse("2026-07-29T16:00:00.000Z");

describe("operator attention state", () => {
  it("alerts unstaged tickets until a closed stage or closed_at is present", () => {
    const ticket = { id: "t1", ticket_number: "TCK-1", title: "Unstaged", stage_id: null, deadline: null, closed_at: null };
    expect(isTicketAttentionRequired(ticket, NOW)).toBe(true);
    expect(isTicketAttentionRequired({ ...ticket, stage_id: "active", stage: { name: "Resolved", is_closed: true } }, NOW)).toBe(false);
    expect(isTicketAttentionRequired({ ...ticket, closed_at: "2026-07-29T15:00:00.000Z" }, NOW)).toBe(false);
  });

  it("alerts a ticket after its deadline until it is closed", () => {
    const ticket = { id: "t1", ticket_number: "TCK-1", title: "Late", stage_id: "active", deadline: "2026-07-29T15:00:00.000Z", closed_at: null };
    expect(isTicketAttentionRequired(ticket, NOW)).toBe(true);
    expect(isTicketAttentionRequired({ ...ticket, deadline: "2026-07-29T17:00:00.000Z" }, NOW)).toBe(false);
  });

  it("alerts due open tasks and clears completed tasks", () => {
    expect(isTaskAttentionRequired({ id: "a1", activity_type: "Follow up", due_at: "2026-07-29T15:00:00.000Z", status: "open" }, NOW)).toBe(true);
    expect(isTaskAttentionRequired({ id: "a1", activity_type: "Follow up", due_at: "2026-07-29T15:00:00.000Z", status: "completed" }, NOW)).toBe(false);
  });

  it("builds operator links for both helpdesk and CRM items", () => {
    const items = getOperatorAttentionItems({
      now: NOW,
      tickets: [{ id: "t1", ticket_number: "TCK-1", title: "Ticket", stage_id: null, deadline: null, closed_at: null }],
      tasks: [{ id: "a1", activity_type: "Task", due_at: "2026-07-29T15:00:00.000Z", status: "open" }],
    });
    expect(items.map((item) => item.href)).toEqual(["/admin/helpdesk/tickets/t1", "/admin/crm/activities?urgency=overdue"]);
  });
});
