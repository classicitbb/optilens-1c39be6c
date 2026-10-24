// Helpdesk ticket creation for the Portal Copilot.
//
// Iris could already write helpdesk_tickets through admin_create_record, but a
// raw table insert skips the ticket_created event the helpdesk timeline reads
// from, and leaves no copilot_action the chat can link back to. This tool owns
// the whole opening sequence instead: ticket, timeline event, and a completed
// action card carrying the ticket id so the conversation can deep link to it.
//
// It deliberately sends no customer acknowledgement — admin-initiated helpdesk
// work stays internal unless an admin explicitly emails the customer.

import { normalizeHelpdeskPriority } from "./adminResources.ts";

export const HELPDESK_TOOLS = [
  {
    name: "create_support_ticket",
    description:
      "Open a Classic Visions helpdesk ticket. Use this whenever the admin asks you to raise, log, open or file a ticket — for a customer issue, an internal follow-up that belongs in the helpdesk queue, or something you found while looking at a record. The ticket is created immediately and appears in the helpdesk queue with a link in this conversation; no email is sent to anyone. Prefer this over admin_create_record for helpdesk_tickets.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short subject line, what the ticket is about." },
        description: { type: "string", description: "Full description: the issue, what you already know, and what needs doing." },
        priority: { type: "string", description: "Low, Normal, Medium, High, Urgent or Critical. Defaults to Normal." },
        contactId: { type: "string", description: "Optional CRM contact id (uuid) the ticket belongs to. Use search_contacts if you only have a name." },
        customerEmail: { type: "string", description: "Optional customer email to record on the ticket. Recording it does not email them." },
      },
      required: ["title", "description"],
      additionalProperties: false,
    },
  },
] as const;

export const HELPDESK_TOOL_NAMES = new Set(HELPDESK_TOOLS.map((tool) => tool.name));

const trimmed = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export const dispatchHelpdeskTool = async (
  db: any,
  name: string,
  input: Record<string, unknown>,
  actorUserId: string,
) => {
  if (name !== "create_support_ticket") throw new Error(`Unsupported helpdesk tool: ${name}`);

  const title = trimmed(input.title, 200);
  const description = trimmed(input.description, 10000);
  if (!title) throw new Error("A title is required to open a helpdesk ticket.");
  if (!description) throw new Error("A description is required to open a helpdesk ticket.");
  const priority = input.priority === undefined || input.priority === null || input.priority === ""
    ? 1
    : normalizeHelpdeskPriority(input.priority);
  const contactId = trimmed(input.contactId, 80) || null;
  const customerEmail = trimmed(input.customerEmail, 200) || null;

  const ticketId = crypto.randomUUID();
  const ticketNumber = `TCK-${ticketId.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const now = new Date().toISOString();

  const { data: ticket, error: ticketError } = await db.from("helpdesk_tickets").insert({
    id: ticketId,
    ticket_number: ticketNumber,
    title,
    description,
    priority,
    source_channel: "ai_assistant",
    partner_contact_id: contactId,
    customer_email: customerEmail,
    opened_at: now,
  }).select("id,ticket_number,title,priority,created_at").single();
  if (ticketError) throw new Error(ticketError.message);

  // The helpdesk timeline is event-sourced; a ticket with no opening event
  // reads as if it appeared from nowhere.
  const { error: eventError } = await db.from("helpdesk_ticket_events").insert({
    ticket_id: ticketId,
    event_type: "ticket_created",
    payload: { source_channel: "ai_assistant", opened_by_copilot: true, actor_user_id: actorUserId },
  });
  if (eventError) throw new Error(eventError.message);

  // Recorded as an already-executed action so the ticket shows up in the
  // approvals/audit trail and the chat can offer a link straight to it.
  const { data: run, error: runError } = await db.from("copilot_runs").insert({
    workflow: "helpdesk_ticket",
    command_text: `Open helpdesk ticket: ${title}`,
    input_mode: "text",
    autonomy_level: 4,
    status: "completed",
    source_system: "helpdesk",
    source_snapshot_at: now,
    requested_by: actorUserId,
    summary: { ticketNumber },
  }).select("id").single();
  if (runError) throw new Error(runError.message);

  const { error: actionError } = await db.from("copilot_actions").insert({
    run_id: run.id,
    contact_id: contactId,
    action_type: "create_support_ticket",
    risk_level: 2,
    status: "completed",
    title: `Ticket ${ticketNumber} — ${title}`,
    summary: description.slice(0, 300),
    payload: { subject: title, body: description, priority, contactId, customerEmail },
    result: { ticketId, ticketNumber },
    idempotency_key: `helpdesk_ticket:${ticketId}`,
    approved_by: actorUserId,
    approved_at: now,
    executed_at: now,
  });
  if (actionError) throw new Error(actionError.message);

  return {
    ok: true,
    runId: run.id,
    ticketId,
    ticketNumber: ticket.ticket_number,
    priority,
    url: `/admin/helpdesk/tickets/${ticketId}`,
    note: "The ticket is open in the helpdesk queue and linked in this conversation. No email was sent.",
  };
};
