import { describe, expect, it } from "vitest";
import {
  calculateOfficeLensValues,
  formatMeters,
  formatSignedDiopters,
  OFFICE_RANGE_OPTIONS,
} from "@/features/lenses/officeRangeCalculator";

describe("officeRangeCalculator", () => {
  it("exposes only the 2 m, 4 m and 6 m ranges with reciprocal intermediate power", () => {
    expect(OFFICE_RANGE_OPTIONS.map((o) => o.id)).toEqual(["2m", "4m", "6m"]);
    expect(OFFICE_RANGE_OPTIONS.map((o) => o.intermediatePower)).toEqual([0.5, 0.25, 0.17]);
    expect(OFFICE_RANGE_OPTIONS.map((o) => o.maxDistanceMeters)).toEqual([2, 4, 6]);
  });

  it("formats signed diopters and metres", () => {
    expect(formatSignedDiopters(0)).toBe("+0.00");
    expect(formatSignedDiopters(-0.75)).toBe("-0.75");
    expect(formatSignedDiopters(2.5)).toBe("+2.50");
    expect(formatMeters(2)).toBe("2.00 m");
  });

  it("derives degression, near and room references for a 2 m office lens", () => {
    const result = calculateOfficeLensValues({
      distanceSphRight: -2,
      distanceSphLeft: -1.75,
      addPower: 1.5,
      rangeId: "2m",
    });

    expect(result.intermediatePower).toBe(0.5); // 1 / 2 m
    expect(result.degression).toBe(1); // 1.50 ADD − 0.50 intermediate
    expect(result.nearZoneRight).toBe(-0.5); // -2.00 + 1.50
    expect(result.nearZoneLeft).toBe(-0.25); // -1.75 + 1.50
    expect(result.roomZoneRight).toBe(-1.5); // -2.00 + 0.50
    expect(result.roomZoneLeft).toBe(-1.25); // -1.75 + 0.50
    expect(result.insufficientAdd).toBe(false);
  });

  it("uses the exact reciprocal for the 6 m range", () => {
    const result = calculateOfficeLensValues({
      distanceSphRight: 0,
      distanceSphLeft: 0,
      addPower: 1.5,
      rangeId: "6m",
    });

    expect(result.intermediatePower).toBe(0.17); // 1 / 6 m ≈ 0.17 D
    expect(result.degression).toBe(1.33); // 1.50 − 0.17
    expect(result.roomZoneRight).toBe(0.17);
  });

  it("flags an ADD that is too low for the chosen range", () => {
    const result = calculateOfficeLensValues({
      distanceSphRight: 0,
      distanceSphLeft: 0,
      addPower: 0.25,
      rangeId: "2m",
    });

    expect(result.insufficientAdd).toBe(true); // 0.25 ADD < 0.50 intermediate
    expect(result.degression).toBe(0); // clamped, never negative
  });
});
