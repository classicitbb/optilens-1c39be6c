import { describe, expect, it } from "vitest";
import { getMissingProfileRequirements } from "@/features/portal/profileCompletion";

describe("getMissingProfileRequirements", () => {
  it("returns all required gaps for incomplete profile", () => {
    const missing = getMissingProfileRequirements({
      fullName: "",
      phone: "",
      organizationName: "",
      hasShippingAddress: false,
    });
    expect(missing.map((item) => item.key)).toEqual(["full_name", "phone", "organization_name", "shipping_address"]);
  });

  it("skips shipping requirement for approved customers", () => {
    const missing = getMissingProfileRequirements(
      {
        fullName: "Jane Smith",
        phone: "1234567",
        organizationName: "Classic Visions",
        hasShippingAddress: false,
      },
      { portalAccessStatus: "approved_customer" } as any,
    );
    expect(missing).toHaveLength(0);
  });
});
