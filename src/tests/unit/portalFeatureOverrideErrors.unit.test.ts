import { describe, expect, it } from "vitest";
import { describePortalFeatureOverrideError } from "@/lib/portalFeatureOverrideErrors";

describe("describePortalFeatureOverrideError", () => {
  it("explains live order status check-constraint failures with the resolving migration", () => {
    const description = describePortalFeatureOverrideError(
      {
        code: "23514",
        message:
          'new row for relation "customer_portal_feature_overrides" violates check constraint "customer_portal_feature_overrides_feature_key_check"',
      },
      "live-order-status",
    );

    expect(description).toContain("Cannot update Live order status (live-order-status).");
    expect(description).toContain("20260717090000_live_order_status_feature_gate.sql");
  });

  it("keeps non-constraint failures unchanged", () => {
    expect(describePortalFeatureOverrideError(new Error("Network unavailable"), "live-order-status")).toBe(
      "Network unavailable",
    );
  });
});
