import { describe, expect, it } from "vitest";

import { getCurrentRelease } from "@/config/releaseManifest";

describe("release manifest", () => {
  it("loads and validates current release metadata", () => {
    const release = getCurrentRelease();

    expect(release.semanticVersion).toMatch(/^(\d+)\.(\d+)\.(\d+)/);
    expect(release.releaseSummary.length).toBeGreaterThan(0);
    expect(release.moduleImpact.length).toBeGreaterThan(0);
    expect(typeof release.hasBreakingChanges).toBe("boolean");
  });
});
