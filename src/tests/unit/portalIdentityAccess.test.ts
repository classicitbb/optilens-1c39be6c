import { describe, expect, it } from "vitest";
import { canAccessPortalFeature, type PortalIdentity } from "@/hooks/usePortalIdentity";

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
  canAccessStatements: false,
  featureOverrides: {},
  ...overrides,
});

describe("canAccessPortalFeature", () => {
  it("lets approved incomplete profiles use shared portal workflows", () => {
    const approved = identity({ profileCompleted: false });

    expect(canAccessPortalFeature(approved, "private-orders")).toBe(true);
    expect(canAccessPortalFeature(approved, "pricelists")).toBe(true);
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
