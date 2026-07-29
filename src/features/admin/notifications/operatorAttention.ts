export interface AttentionTicket {
  id: string;
  ticket_number: string;
  title: string;
  stage_id: string | null;
  stage?: { name: string; is_closed: boolean } | null;
  deadline: string | null;
  closed_at: string | null;
}

export interface AttentionTask {
  id: string;
  activity_type: string;
  due_at: string | null;
  status: string | null;
}

export type OperatorAttentionItem =
  | { id: string; kind: "ticket"; title: string; detail: string; href: string }
  | { id: string; kind: "task"; title: string; detail: string; href: string };

export const isOperatorAttentionSnoozed = (snoozedUntil: number | null, now = Date.now()) =>
  snoozedUntil !== null && snoozedUntil > now;

export const isTicketAttentionRequired = (ticket: AttentionTicket, now = Date.now()) => {
  const isHandled = Boolean(ticket.closed_at || ticket.stage?.is_closed);
  if (isHandled) return false;

  const isUnstaged = ticket.stage_id === null;
  const isOverdue = Boolean(ticket.deadline && new Date(ticket.deadline).getTime() <= now);
  return isUnstaged || isOverdue;
};

export const isTaskAttentionRequired = (task: AttentionTask, now = Date.now()) => {
  if (!task.due_at || task.status === "completed") return false;
  return new Date(task.due_at).getTime() <= now;
};

export const getOperatorAttentionItems = ({
  tickets,
  tasks,
  now = Date.now(),
}: {
  tickets: AttentionTicket[];
  tasks: AttentionTask[];
  now?: number;
}): OperatorAttentionItem[] => [
  ...tickets.filter((ticket) => isTicketAttentionRequired(ticket, now)).map((ticket) => ({
    id: `ticket:${ticket.id}`,
    kind: "ticket" as const,
    title: ticket.title,
    detail: `Helpdesk ${ticket.ticket_number}`,
    href: `/admin/helpdesk/tickets/${ticket.id}`,
  })),
  ...tasks.filter((task) => isTaskAttentionRequired(task, now)).map((task) => ({
    id: `task:${task.id}`,
    kind: "task" as const,
    title: task.activity_type,
    detail: "CRM task due",
    href: "/admin/crm/activities?urgency=overdue",
  })),
];
