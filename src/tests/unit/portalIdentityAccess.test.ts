import { describe, expect, it } from "vitest";
import { canAccessPortalFeature, resolvePortalFeatureOverrides, type PortalIdentity } from "@/hooks/usePortalIdentity";

const identity = (overrides: Partial<PortalIdentity> = {}): PortalIdentity => ({
  profileId: "profile-1",
  portalAccessStatus: "approved_customer",
  portalAccessNote: "",
  emailVerified: true,
  profileCompleted: false,
  crmContactId: "contact-1",
  crmCustomerId: 100,
  accountNumber: "ZEN",
  assignedPricelistId: null,
  organizationName: "Zenix Optical",
  customerName: "Zenix Optical",
  paymentTerms: "standard",
  canAccessPricing: false,
  canAccessStatements: false,
  ordersUseBillToAccount: false,
  featureOverrides: {},
  ...overrides,
});

describe("canAccessPortalFeature", () => {
  it("lets approved incomplete profiles use shared portal workflows", () => {
    const approved = identity({ profileCompleted: false });

    expect(canAccessPortalFeature(approved, "private-orders")).toBe(true);
    expect(canAccessPortalFeature(approved, "pricelists")).toBe(false);
  });

  it("allows assigned pricelists only for approved contacts with pricing access", () => {
    expect(canAccessPortalFeature(identity({ canAccessPricing: false }), "pricelists")).toBe(false);
    expect(canAccessPortalFeature(identity({ canAccessPricing: true }), "pricelists")).toBe(true);
  });

  it("allows live order status for any approved customer, like private orders", () => {
    expect(canAccessPortalFeature(identity(), "live-order-status")).toBe(true);
    expect(canAccessPortalFeature(identity({ portalAccessStatus: "pending_approval" }), "live-order-status")).toBe(false);
    expect(canAccessPortalFeature(identity({ featureOverrides: { "live-order-status": false } }), "live-order-status")).toBe(false);
  });

  it("allows Lens Assistant for approved customers unless the profile override disables it", () => {
    expect(canAccessPortalFeature(identity(), "rx-order")).toBe(true);
    expect(canAccessPortalFeature(identity({ portalAccessStatus: "pending_approval" }), "rx-order")).toBe(false);
    expect(canAccessPortalFeature(identity({ featureOverrides: { "rx-order": false } }), "rx-order")).toBe(false);
    expect(canAccessPortalFeature(identity({ portalAccessStatus: "pending_approval", featureOverrides: { "rx-order": true } }), "rx-order")).toBe(true);
  });

  it("keeps statements locked for approved contacts without billing tags", () => {
    expect(canAccessPortalFeature(identity({ canAccessStatements: false }), "statements")).toBe(false);
  });

  it("allows statements for approved contacts with billing tags", () => {
    expect(canAccessPortalFeature(identity({ canAccessStatements: true }), "statements")).toBe(true);
  });

  it("lets disabled overrides block access", () => {
    expect(canAccessPortalFeature(identity({ canAccessStatements: true, featureOverrides: { statements: false } }), "statements")).toBe(false);
    expect(canAccessPortalFeature(identity({ featureOverrides: { "private-orders": false } }), "private-orders")).toBe(false);
  });
});

describe("resolvePortalFeatureOverrides", () => {
  it("keeps per-user overrides that the active membership does not set", () => {
    const merged = resolvePortalFeatureOverrides(
      { "order-prices": true, pricelists: true },
      { pricelists: false },
    );

    expect(merged).toEqual({ "order-prices": true, pricelists: false });
    expect(canAccessPortalFeature(identity({ featureOverrides: merged }), "order-prices")).toBe(true);
  });

  it("returns per-user overrides unchanged when the membership has none", () => {
    expect(resolvePortalFeatureOverrides({ "order-prices": true }, {})).toEqual({ "order-prices": true });
  });
});
