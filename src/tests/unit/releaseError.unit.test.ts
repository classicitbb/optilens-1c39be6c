import { describe, expect, it } from "vitest";
import { isNotPricedError, releaseErrorMessage } from "@/features/rx-order/workspace/releaseError";

describe("releaseErrorMessage", () => {
  it("reads the message from a backend error object", () => {
    const err = { code: "P0001", details: null, hint: null, message: '"X" is not priced on this account\'s pricelist.' };
    expect(releaseErrorMessage(err)).toBe('"X" is not priced on this account\'s pricelist.');
    expect(isNotPricedError(releaseErrorMessage(err))).toBe(true);
  });
  it("returns undefined when there is nothing to show", () => {
    expect(releaseErrorMessage({})).toBeUndefined();
  });
});
