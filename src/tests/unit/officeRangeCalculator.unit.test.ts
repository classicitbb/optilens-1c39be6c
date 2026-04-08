import { describe, expect, it } from "vitest";
import {
  buildAddOptions,
  buildSphOptions,
  calculateOfficeLensValues,
  OFFICE_RANGE_OPTIONS,
} from "@/features/lenses/officeRangeCalculator";

describe("officeRangeCalculator", () => {
  it("builds expected sphere and add options", () => {
    const sphOptions = buildSphOptions();
    const addOptions = buildAddOptions();

    expect(sphOptions[0]).toBe(10);
    expect(sphOptions[sphOptions.length - 1]).toBe(-10);
    expect(addOptions).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5]);
  });

  it("returns blank shift values for 6m+ range", () => {
    const result = calculateOfficeLensValues({
      distanceSphRight: -1,
      distanceSphLeft: -1.25,
      addPower: 1.5,
      rangeId: "6m_plus",
    });

    expect(result.selectedRange).toEqual(OFFICE_RANGE_OPTIONS[0]);
    expect(result.shift).toBeNull();
    expect(result.shiftAtPupilCenter).toBeNull();
    expect(result.rxAtPupilCenterRight).toBeNull();
    expect(result.nearReferenceLeft).toBe(0.25);
  });

  it("calculates shift and pupil-centre values for finite range", () => {
    const result = calculateOfficeLensValues({
      distanceSphRight: -2,
      distanceSphLeft: -1.75,
      addPower: 2,
      rangeId: "1m",
    });

    expect(result.shift).toBe(1);
    expect(result.shiftAtPupilCenter).toBe(0.75);
    expect(result.rangeAtPupilCenterMeters).toBe(1.33);
    expect(result.rxAtPupilCenterRight).toBe(-1.25);
    expect(result.rxAtPupilCenterLeft).toBe(-1);
    expect(result.nearReferenceRight).toBe(0);
    expect(result.nearReferenceLeft).toBe(0.25);
  });
});
