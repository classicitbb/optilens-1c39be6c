// Suppression policy for queued email.
//
// Kept as a pure module with no Deno or npm dependencies so the decision can be
// unit-tested directly. The I/O that feeds it lives in process-email-queue.

/** Reasons written to `suppressed_emails.reason` by the suppression webhooks. */
export type SuppressionReason = "bounce" | "complaint" | "unsubscribe";

/**
 * Reasons that block delivery even for auth email. A bounced address is
 * undeliverable and a complaint means the recipient reported us — continuing to
 * send to either damages sender reputation regardless of how important the mail
 * is to us.
 */
export const HARD_SUPPRESSION_REASONS: ReadonlySet<string> = new Set([
  "bounce",
  "complaint",
]);

/** Queue carrying password resets, magic links and email confirmations. */
export const AUTH_QUEUE = "auth_emails";

/**
 * Decide whether a suppressed recipient still blocks this particular message.
 *
 * Auth email is deliberately treated differently from everything else: an
 * unsubscribe withdraws consent for announcements, not for password resets.
 * Blocking auth mail on an unsubscribe would lock the recipient out of their own
 * account, so only the hard reasons above apply to the auth queue.
 *
 * @param reason `suppressed_emails.reason` for the recipient, or null if the
 *   address is not suppressed at all.
 * @param queue The queue the message was read from.
 */
export function isSuppressionBlocking(
  reason: string | null | undefined,
  queue: string,
): boolean {
  if (!reason) return false;
  if (queue === AUTH_QUEUE) return HARD_SUPPRESSION_REASONS.has(reason);
  return true;
}
