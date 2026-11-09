import type { ActivityState } from "./hooks/useActivities";
import type { OutboxDraft } from "./hooks/useCadences";

export const OUTREACH_PLAN_TITLE = "Outreach plan";
export const OUTREACH_PRACTICE_TITLE = "Outreach practice";
export const JOURNEY_STEPS = ["Choose contact", "Plan outreach", "Review & send", "Wait & follow up", "Move forward"] as const;

export function practiceScenario(brief: string): string | null {
  return /^Practice scenario:\s*([^\r\n]+)$/im.exec(brief)?.[1]?.trim() || null;
}

// Human-readable activity content: colleagues can also edit the brief in Activities.
// The anchored footer associates one exact outbox message with this plan.
export function formatOutreachPlan(brief: string, draftId?: string | null, recipient?: string): string {
  return `${brief.trim()}${draftId ? `\n\nOutreach draft: ${draftId}${recipient ? `\nRecipient: ${recipient.replace(/[\r\n]/g, " ")}` : ""}` : ""}`;
}

export function readOutreachPlan(content: string | null): { brief: string; draftId: string | null; recipient?: string } {
  const value = content ?? "";
  const match = /\n\nOutreach draft: ([0-9a-f-]{36})(?:\nRecipient: ([^\r\n]+))?$/i.exec(value);
  return { brief: match ? value.slice(0, match.index) : value, draftId: match?.[1] ?? null, ...(match?.[2] ? { recipient: match[2] } : {}) };
}

export function nextJourneyStep(plan?: { status: ActivityState } | null, draft?: Pick<OutboxDraft, "status"> | null): number {
  if (!plan) return 1;
  if (plan.status === "completed" || plan.status === "cancelled" || plan.status === "in_progress") return 4;
  if (draft?.status === "sent") return 3;
  return 2;
}

export function outreachLink(contactId: string, practice = false): string {
  return `/admin/crm/dashboard?contact=${encodeURIComponent(contactId)}${practice ? "&practice=1" : ""}`;
}

export function outreachHandoff(name: string, brief: string, subject: string, body: string, link: string): string {
  return `Help me turn ${name} into a customer.\n\nBrief:\n${brief || "Help me clarify the business fit and a useful first ask."}\n\nCurrent email:\n${subject}\n\n${body}\n\nCRM workspace: ${link}\n\nSeparate known facts from assumptions. Suggest one specific next action and an editable email. Do not send anything, enrol this contact in a sequence, or change records without my explicit approval.`;
}
