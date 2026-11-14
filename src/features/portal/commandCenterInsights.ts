import type { CommandCenterDraft, CommandCenterOrder, CommandCenterTicket } from "./customerCommandCenter";

export const ACTIVE_ORDER_STATUSES = new Set(["draft", "pending", "pending_payment", "confirmed", "processing", "shipped"]);

/** Website order lifecycle as the customer sees it. Statuses outside it (cancelled, delivered…) have no stage. */
export const ORDER_STAGES = ["Placed", "Confirmed", "In production", "Shipped"] as const;

const STAGE_BY_STATUS: Record<string, number> = {
  draft: 0,
  pending: 0,
  pending_payment: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
};

export const orderStageIndex = (status: string): number => STAGE_BY_STATUS[status] ?? -1;

export const greetingForHour = (hour: number): string => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

export interface NextAction {
  id: string;
  label: string;
  detail: string;
  to: string;
  tone: "warn" | "info";
}

interface NextActionInput {
  accessApproved: boolean;
  orders: CommandCenterOrder[];
  liveOrderCount: number;
  openTicketCount: number;
  draftCount: number;
  balance: number;
  canViewStatements: boolean;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Prioritised list of things the customer can act on, most urgent first. Built only from account data. */
export const buildNextActions = (input: NextActionInput): NextAction[] => {
  const actions: NextAction[] = [];
  if (!input.accessApproved) {
    actions.push({ id: "access", label: "Complete account setup", detail: "Finish your profile so approval can continue.", to: "/profile/account", tone: "warn" });
  }
  const awaitingPayment = input.orders.filter((order) => order.status === "pending_payment").length;
  if (awaitingPayment) {
    actions.push({ id: "payment", label: `${plural(awaitingPayment, "order")} awaiting payment`, detail: "Open your orders to review and pay.", to: "/profile/orders", tone: "warn" });
  }
  if (input.canViewStatements && input.balance > 0) {
    actions.push({ id: "balance", label: "Account balance due", detail: `BBD $${input.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on your latest account data.`, to: "/profile/statements", tone: "warn" });
  }
  if (input.openTicketCount) {
    actions.push({ id: "tickets", label: `${plural(input.openTicketCount, "open support request")}`, detail: "Check for replies from the team.", to: "/profile/helpdesk", tone: "info" });
  }
  if (input.draftCount) {
    actions.push({ id: "drafts", label: `${plural(input.draftCount, "saved draft")}`, detail: "Pick up where you left off.", to: "/profile/drafts", tone: "info" });
  }
  const inProgress = input.orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status) && order.status !== "pending_payment").length + input.liveOrderCount;
  if (inProgress) {
    actions.push({ id: "orders", label: `${plural(inProgress, "order")} in progress`, detail: "Track status on your orders page.", to: "/profile/orders", tone: "info" });
  }
  return actions;
};

export interface ActivityItem {
  id: string;
  kind: "order" | "draft" | "ticket";
  title: string;
  detail: string;
  at: string;
  to: string;
}

const humanStatus = (status: string) => status.replace(/_/g, " ");

/** One newest-first feed across website orders, saved drafts and support requests. */
export const buildActivity = (
  source: { orders: CommandCenterOrder[]; drafts: CommandCenterDraft[]; tickets: CommandCenterTicket[] },
  limit = 6,
): ActivityItem[] => {
  const items: ActivityItem[] = [
    ...source.orders.map((order): ActivityItem => ({
      id: `order-${order.id}`,
      kind: "order",
      title: `Website order #${order.id.slice(0, 8).toUpperCase()}`,
      detail: humanStatus(order.status),
      at: order.updatedAt || order.createdAt,
      to: "/profile/orders",
    })),
    ...source.drafts.map((draft): ActivityItem => ({
      id: `draft-${draft.kind}-${draft.id}`,
      kind: "draft",
      title: draft.name,
      detail: draft.kind === "rx" ? "Rx draft · not submitted" : "Saved cart",
      at: draft.updatedAt,
      to: draft.kind === "rx" ? `/profile/rx-drafts/${draft.id}` : "/profile/drafts",
    })),
    ...source.tickets.map((ticket): ActivityItem => ({
      id: `ticket-${ticket.id}`,
      kind: "ticket",
      title: `${ticket.ticketNumber} · ${ticket.title}`,
      detail: ticket.closedAt ? "Support request closed" : "Support request open",
      at: ticket.closedAt || ticket.createdAt,
      to: `/profile/helpdesk/${ticket.id}`,
    })),
  ];
  return items
    .filter((item) => Number.isFinite(new Date(item.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
};
