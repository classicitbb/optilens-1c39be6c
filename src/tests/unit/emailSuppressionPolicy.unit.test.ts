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

  it("keeps the hard-reason set aligned with what the events receiver writes", () => {
    const receiver = read("supabase/functions/handle-email-events/index.ts");
    expect(receiver).toContain("'bounce' | 'complaint' | 'unsubscribe'");
    expect(receiver).toContain("reason: 'unsubscribe'");

    expect([...HARD_SUPPRESSION_REASONS].sort()).toEqual(["bounce", "complaint"]);
  });
});
