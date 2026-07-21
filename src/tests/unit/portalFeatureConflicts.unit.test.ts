import { describe, expect, it } from "vitest";
import { detectFeatureOverrideConflicts, tagsGrantFeatureAccess } from "@/lib/portalFeatureConflicts";

describe("tagsGrantFeatureAccess", () => {
  it("grants statements access for a CEO tag", () => {
    expect(tagsGrantFeatureAccess(["CEO"], "statements")).toBe(true);
  });

  it("grants pricelists access for 'Approved Access to Pricing' case-insensitively", () => {
    expect(tagsGrantFeatureAccess(["  Approved Access To Pricing  "], "pricelists")).toBe(true);
  });

  it("does not grant access without a qualifying tag", () => {
    expect(tagsGrantFeatureAccess(["Referral"], "statements")).toBe(false);
    expect(tagsGrantFeatureAccess([], "pricelists")).toBe(false);
  });
});

describe("detectFeatureOverrideConflicts", () => {
  it("flags a disabled override that contradicts a granting tag", () => {
    const conflicts = detectFeatureOverrideConflicts(
      { statements: false },
      { statements: true, pricelists: false },
    );
    expect(conflicts).toEqual([
      { featureKey: "statements", label: "Statements", requiredTagLabel: "Approved Access to Statement (or CEO)" },
    ]);
  });

  it("does not flag a disabled override when no tag would grant access", () => {
    const conflicts = detectFeatureOverrideConflicts({ statements: false }, { statements: false });
    expect(conflicts).toEqual([]);
  });

  it("does not flag an enabled or unset override even if a tag grants access", () => {
    expect(detectFeatureOverrideConflicts({ statements: true }, { statements: true })).toEqual([]);
    expect(detectFeatureOverrideConflicts({}, { statements: true })).toEqual([]);
  });

  it("can flag both pricelists and statements at once", () => {
    const conflicts = detectFeatureOverrideConflicts(
      { pricelists: false, statements: false },
      { pricelists: true, statements: true },
    );
    expect(conflicts.map((c) => c.featureKey).sort()).toEqual(["pricelists", "statements"]);
  });
});
