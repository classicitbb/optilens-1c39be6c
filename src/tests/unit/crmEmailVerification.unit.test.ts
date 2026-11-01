import { describe, expect, it } from "vitest";
import { addressesNeedingCheck, isSendable, looksLikeEmail, mapVerifierStatus } from "../../../supabase/functions/_shared/crm/emailVerification";

describe("email verification helpers", () => {
  it("maps provider statuses and fails safe on anything new", () => {
    expect(mapVerifierStatus("safe")).toBe("verified");
    expect(mapVerifierStatus("catch_all")).toBe("catch_all");
    expect(mapVerifierStatus("disposable")).toBe("invalid");
    expect(mapVerifierStatus("something_new")).toBe("unknown");
    expect(mapVerifierStatus(undefined)).toBe("unknown");
  });

  it("allows catch-alls only when switched on", () => {
    expect(isSendable("verified", false)).toBe(true);
    expect(isSendable("catch_all", false)).toBe(false);
    expect(isSendable("catch_all", true)).toBe(true);
    expect(isSendable("invalid", true)).toBe(false);
    expect(isSendable(null, true)).toBe(false);
  });

  it("re-checks only unchecked or stale addresses", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    const checks = [
      { email: "a@x.test", checked_at: "2026-10-20T00:00:00Z" },
      { email: "b@x.test", checked_at: "2026-05-01T00:00:00Z" },
    ];
    expect(addressesNeedingCheck(["A@x.test", "b@x.test", "c@x.test"], checks, now)).toEqual(["b@x.test", "c@x.test"]);
  });

  it("rejects malformed addresses before they cost a credit", () => {
    expect(looksLikeEmail("a@x.test")).toBe(true);
    expect(looksLikeEmail("not an email")).toBe(false);
  });
});
