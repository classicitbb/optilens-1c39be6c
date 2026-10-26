import { describe, expect, it } from "vitest";
import { getSmartHomeActions, shouldRedirectAuthenticatedCustomer } from "@/features/home/smartHomeActions";

describe("smart homepage journeys", () => {
  it("gives professionals operational actions and patients educational actions", () => {
    const professional = getSmartHomeActions("professional");
    const patient = getSmartHomeActions("patient");

    expect(professional.map((action) => action.id)).toEqual(expect.arrayContaining(["new-rx", "status", "lens-price", "repeat", "technical-help", "account", "retailer"]));
    expect(patient.map((action) => action.id)).toEqual(expect.arrayContaining(["guidance", "compare", "screen-use", "sunlight", "learn", "ask", "retailer"]));
    expect(patient.some((action) => /price/i.test(action.title))).toBe(false);
  });

  it("redirects signed-in customers while preserving staff public preview", () => {
    expect(shouldRedirectAuthenticatedCustomer({ isSignedIn: true, isStaff: false, publicPreview: false })).toBe(true);
    expect(shouldRedirectAuthenticatedCustomer({ isSignedIn: true, isStaff: true, publicPreview: false })).toBe(false);
    expect(shouldRedirectAuthenticatedCustomer({ isSignedIn: true, isStaff: false, publicPreview: true })).toBe(false);
    expect(shouldRedirectAuthenticatedCustomer({ isSignedIn: false, isStaff: false, publicPreview: false })).toBe(false);
  });
});
