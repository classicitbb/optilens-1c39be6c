import { describe, expect, it } from "vitest";
import { capitalizeDisplayName } from "@/lib/profileData";

describe("capitalizeDisplayName", () => {
  it("capitalizes the first displayed character without changing the rest of the name", () => {
    expect(capitalizeDisplayName("nadia")).toBe("Nadia");
    expect(capitalizeDisplayName("nadia Reifer")).toBe("Nadia Reifer");
  });

  it("uses a capitalized fallback when the source is blank", () => {
    expect(capitalizeDisplayName(" ", "account")).toBe("Account");
  });
});
