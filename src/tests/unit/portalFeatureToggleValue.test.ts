import { describe, expect, it } from "vitest";
import { portalFeatureToggleValue } from "@/lib/portalFeatureToggleValue";
import { buildPricelistEditorPath } from "@/features/pricelists/routes";

const access = { approved: true, pricing: true, statements: true };
const features = ["quotes", "helpdesk", "pricelists", "private-orders", "live-order-status", "statements", "order-prices", "rx-order", "auto-notifications"];

describe("portal feature switches", () => {
  it("retains inherited access for existing accounts", () => {
    for (const key of ["quotes", "helpdesk", "private-orders", "live-order-status", "pricelists", "statements", "auto-notifications"]) {
      expect(portalFeatureToggleValue(key, {}, access)).toBe(true);
    }
    expect(portalFeatureToggleValue("rx-order", {}, access)).toBe(false);
    expect(portalFeatureToggleValue("order-prices", {}, access)).toBe(false);
  });
  it("shows all newly initialized settings off, even after approval and tagging", () => {
    const defaults = Object.fromEntries(features.map(key => [key, false]));
    for (const key of features) expect(portalFeatureToggleValue(key, defaults, access)).toBe(false);
  });
  it("keeps enabled and disabled overrides stable rather than cycling back to inherited", () => {
    for (const key of features) {
      expect(portalFeatureToggleValue(key, { [key]: false }, access)).toBe(false);
      expect(portalFeatureToggleValue(key, { [key]: true }, access)).toBe(true);
    }
  });
  it("does not infer pricing or statement permission without the existing access checks", () => {
    expect(portalFeatureToggleValue("pricelists", {}, { ...access, pricing: false })).toBe(false);
    expect(portalFeatureToggleValue("statements", {}, { ...access, approved: false })).toBe(false);
  });
  it("opens the chosen pricelist in its canonical editor", () => {
    expect(buildPricelistEditorPath(42, "rx")).toBe("/admin/pricing/pricelists/42/rx");
  });
});
