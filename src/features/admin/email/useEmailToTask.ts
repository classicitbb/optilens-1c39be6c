import { useAuth } from "@/contexts/AuthContext";
import { useCreateActivity, type ActivityMutationInput } from "@/features/admin/crm/hooks/useActivities";
import type { EmailMessage } from "@/lib/emailBridge";
import { formatFullDate } from "./format";

const EXCERPT_CHARS = 500;

export function tomorrowAtNine(now = new Date()): Date {
  const due = new Date(now);
  due.setDate(due.getDate() + 1);
  due.setHours(9, 0, 0, 0);
  return due;
}

export function emailTaskLink(origin: string, message: Pick<EmailMessage, "account_code" | "folder_id" | "message_id">): string {
  const params = new URLSearchParams({ account: message.account_code, folder: String(message.folder_id), message: String(message.message_id) });
  return `${origin}/admin/email?${params}`;
}

type TaskSource = Pick<EmailMessage, "subject" | "from_name" | "from_address" | "sent_at" | "body_text" | "snippet">;

// A follow-up task for the signed-in user, due tomorrow 09:00, linked to the
// matched CRM contact, with an excerpt and a link back to the email.
export function emailTaskInput(
  message: TaskSource,
  { contactId, userId, link, now = new Date() }: { contactId?: string; userId?: string; link: string; now?: Date },
): ActivityMutationInput {
  const sender = message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address || "unknown sender";
  const body = (message.body_text || message.snippet || "")
    // Only the new message, not the quoted thread below it.
    .split(/^(?:From: |-{2,} ?Original Message|On .+ wrote:)/m)[0]
    .replace(/[^\S\n]+$/gm, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const excerpt = body.length > EXCERPT_CHARS ? `${body.slice(0, EXCERPT_CHARS).trimEnd()}…` : body;
  return {
    activityType: `Follow up: ${message.subject?.trim() || "(no subject)"}`,
    type: "email",
    taskChannel: "todo",
    priority: "normal",
    dueAt: tomorrowAtNine(now).toISOString(),
    contactId,
    ownerId: userId,
    createdBy: userId,
    content: [`From: ${sender}`, `Sent: ${formatFullDate(message.sent_at)}`, excerpt ? `\n${excerpt}` : "", `\nOpen the email: ${link}`]
      .filter(Boolean)
      .join("\n"),
  };
}

export function useEmailToTask() {
  const { user } = useAuth();
  const create = useCreateActivity();
  return {
    isPending: create.isPending,
    createTask: (message: EmailMessage, contactId?: string) =>
      create.mutateAsync(emailTaskInput(message, { contactId, userId: user?.id, link: emailTaskLink(window.location.origin, message) })),
  };
}
