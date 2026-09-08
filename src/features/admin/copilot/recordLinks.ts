import type { CopilotAction } from "./api";

export type CopilotRecordLink = { href: string; label: string };

const idOf = (result: Record<string, unknown> | null, key: string) => {
  const value = result?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

/**
 * Deep link to the record an executed Copilot action created, so Iris can hand
 * the admin a direct route to the ticket/activity instead of a description of it.
 */
export const resolveActionRecordLink = (action: CopilotAction): CopilotRecordLink | null => {
  if (action.status !== "completed") return null;
  const activityId = idOf(action.result, "activityId");
  if (activityId) return { href: `/admin/crm/activities?task=${activityId}`, label: "Open the activity" };
  const ticketId = idOf(action.result, "ticketId");
  if (ticketId) return { href: `/admin/helpdesk/tickets/${ticketId}`, label: "Open the ticket" };
  return null;
};
