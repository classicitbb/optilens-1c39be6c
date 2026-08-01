import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AUTH_QUEUE,
  HARD_SUPPRESSION_REASONS,
  isSuppressionBlocking,
} from "../../../supabase/functions/_shared/email/suppression.ts";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const TRANSACTIONAL_QUEUE = "transactional_emails";

describe("email suppression policy", () => {
  it("never blocks an address that is not suppressed", () => {
    expect(isSuppressionBlocking(null, TRANSACTIONAL_QUEUE)).toBe(false);
    expect(isSuppressionBlocking(null, AUTH_QUEUE)).toBe(false);
    expect(isSuppressionBlocking(undefined, TRANSACTIONAL_QUEUE)).toBe(false);
    expect(isSuppressionBlocking("", TRANSACTIONAL_QUEUE)).toBe(false);
  });

  it("blocks every suppression reason on non-auth queues", () => {
    for (const reason of ["bounce", "complaint", "unsubscribe"]) {
      expect(isSuppressionBlocking(reason, TRANSACTIONAL_QUEUE)).toBe(true);
    }
  });

  // The account-lockout guard: someone who opted out of announcements must
  // still be able to reset their password.
  it("lets an unsubscribed recipient still receive auth email", () => {
    expect(isSuppressionBlocking("unsubscribe", AUTH_QUEUE)).toBe(false);
  });

  it("blocks auth email to bounced or complaining addresses", () => {
    expect(isSuppressionBlocking("bounce", AUTH_QUEUE)).toBe(true);
    expect(isSuppressionBlocking("complaint", AUTH_QUEUE)).toBe(true);
  });

  // A reason the webhooks don't currently emit should not silently start
  // delivering marketing, but must not lock anyone out of their account.
  it("treats an unrecognised reason as consent-flavoured", () => {
    expect(isSuppressionBlocking("some_future_reason", TRANSACTIONAL_QUEUE)).toBe(true);
    expect(isSuppressionBlocking("some_future_reason", AUTH_QUEUE)).toBe(false);
  });

  it("keeps the hard-reason set aligned with what the webhooks write", () => {
    const suppressionHook = read("supabase/functions/handle-email-suppression/index.ts");
    // The hook's union type is the source of truth for valid reasons.
    expect(suppressionHook).toContain("'bounce' | 'complaint' | 'unsubscribe'");

    const unsubscribeHook = read("supabase/functions/handle-email-unsubscribe/index.ts");
    expect(unsubscribeHook).toContain("reason: 'unsubscribe'");

    expect([...HARD_SUPPRESSION_REASONS].sort()).toEqual(["bounce", "complaint"]);
  });
});

describe("process-email-queue suppression enforcement", () => {
  const source = () => read("supabase/functions/process-email-queue/index.ts");

  it("checks suppression before handing the message to the send API", () => {
    const src = source();
    const checkAt = src.indexOf("await checkSuppression(");
    const sendAt = src.indexOf("await sendLovableEmail(");

    expect(checkAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(-1);
    expect(checkAt).toBeLessThan(sendAt);
  });

  it("fails closed by leaving the message queued when the lookup errors", () => {
    const src = source();
    expect(src).toContain("runErrors.push({ queue, stage: 'suppression_check'");
    // A lookup failure must not fall through to the send path.
    expect(src).toMatch(/if \(suppression\.lookupError\)[\s\S]*?\bcontinue\b/);
  });

  it("logs a suppressed row and drains the message instead of retrying it", () => {
    const src = source();
    expect(src).toMatch(/status: 'suppressed'/);
    expect(src).toMatch(/if \(suppression\.blocked\)[\s\S]*?delete_email/);
  });

  it("delegates the auth-queue exemption to the shared policy", () => {
    const src = source();
    expect(src).toContain("isSuppressionBlocking(reason, queue)");
    expect(src).toContain("_shared/email/suppression.ts");
  });
});
