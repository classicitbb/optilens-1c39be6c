import { describe, expect, it } from "vitest";
import { gatekeeperStatusToast } from "@/features/rx-order/gatekeeperOutcomes";
import { shouldFallbackGatekeeperRx } from "../../../supabase/functions/_shared/gatekeeperPolicy";

describe("Gatekeeper outage outcomes", () => {
  it("uses a non-destructive status message and retains the retry time", () => {
    const outcome = gatekeeperStatusToast({
      reason: "temporarily_unavailable",
      nextAttemptAt: "2026-09-11T21:00:00.000Z",
    });
    expect(outcome.title).toBe("Lab status service temporarily unavailable");
    expect(outcome.description).toContain("Existing statuses were retained");
  });

  it("falls back only for Rx failures before the Gatekeeper POST begins", () => {
    expect(shouldFallbackGatekeeperRx({ orderKind: "rx", postStarted: false, failureKind: "connectivity", fallbackEnabled: true })).toBe(true);
    expect(shouldFallbackGatekeeperRx({ orderKind: "rx", postStarted: true, failureKind: "connectivity", fallbackEnabled: true })).toBe(false);
    expect(shouldFallbackGatekeeperRx({ orderKind: "stock", postStarted: false, failureKind: "configuration", fallbackEnabled: true })).toBe(false);
  });
});
