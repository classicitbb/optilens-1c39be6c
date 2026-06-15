import { describe, expect, it } from "vitest";
import {
  formatPlain,
  formatSignedPower,
  isValidAdd,
  isValidAxis,
  isValidBinocularPd,
  isValidMonoPd,
  isValidSphCyl,
  parsePlainNumber,
  parseRxPower,
  roundToQuarter,
} from "@/features/lenses/rxFormat";

describe("rxFormat", () => {
  it("formats powers with an explicit sign and two decimals", () => {
    expect(formatSignedPower(2.5)).toBe("+2.50");
    expect(formatSignedPower(-0.75)).toBe("-0.75");
    expect(formatSignedPower(0)).toBe("+0.00");
    expect(formatSignedPower(-0)).toBe("+0.00");
  });

  it("formats plain numbers with fixed decimals", () => {
    expect(formatPlain(90, 0)).toBe("90");
    expect(formatPlain(31, 1)).toBe("31.0");
  });

  it("rounds to the nearest quarter dioptre", () => {
    expect(roundToQuarter(1.3)).toBe(1.25);
    expect(roundToQuarter(1.38)).toBe(1.5);
    expect(roundToQuarter(-2.1)).toBe(-2);
  });

  it("reads digit-only power entry as hundredths (implied two decimals)", () => {
    expect(parseRxPower("075", { min: -20, max: 20 })).toBe(0.75);
    expect(parseRxPower("275", { min: -20, max: 20 })).toBe(2.75);
    expect(parseRxPower("-225", { min: -20, max: 20 })).toBe(-2.25);
    expect(parseRxPower("200", { min: -20, max: 20 })).toBe(2);
    expect(parseRxPower("5000", { min: -20, max: 20 })).toBe(20);
  });

  it("parses typed-decimal powers literally and snaps to 0.25 steps", () => {
    expect(parseRxPower("+2.5", { min: -20, max: 20 })).toBe(2.5);
    expect(parseRxPower("-2.00", { min: -20, max: 20 })).toBe(-2);
    expect(parseRxPower("1.30", { min: -20, max: 20 })).toBe(1.25);
    expect(parseRxPower("", { min: -20, max: 20 })).toBeNull();
    expect(parseRxPower("-", { min: -20, max: 20 })).toBeNull();
    expect(parseRxPower("abc", { min: -20, max: 20 })).toBeNull();
  });

  it("folds typed negatives to plus for ADD (plus-only)", () => {
    expect(parseRxPower("-1.5", { min: 0, max: 4, allowNegative: false })).toBe(1.5);
    expect(parseRxPower("-150", { min: 0, max: 4, allowNegative: false })).toBe(1.5);
    expect(parseRxPower("2.75", { min: 0, max: 4, allowNegative: false })).toBe(2.75);
  });

  it("parses plain numbers as integers or stepped decimals", () => {
    expect(parsePlainNumber("90.4", { min: 0, max: 180, integer: true })).toBe(90);
    expect(parsePlainNumber("200", { min: 0, max: 180, integer: true })).toBe(180);
    expect(parsePlainNumber("31.3", { min: 20, max: 40, step: 0.5 })).toBe(31.5);
  });

  it("wraps the axis modulo 180 instead of clamping", () => {
    const opts = { min: 0, max: 180, integer: true, wrapModulo: 180 };
    expect(parsePlainNumber("90", opts)).toBe(90);
    expect(parsePlainNumber("180", opts)).toBe(180);
    expect(parsePlainNumber("190", opts)).toBe(10);
    expect(parsePlainNumber("200", opts)).toBe(20);
    expect(parsePlainNumber("360", opts)).toBe(180);
    expect(parsePlainNumber("365", opts)).toBe(5);
  });

  it("validates Rx ranges", () => {
    expect(isValidSphCyl(-2.25)).toBe(true);
    expect(isValidSphCyl(-2.1)).toBe(false);
    expect(isValidAdd(2.5)).toBe(true);
    expect(isValidAdd(-1)).toBe(false);
    expect(isValidAxis(180)).toBe(true);
    expect(isValidAxis(181)).toBe(false);
    expect(isValidAxis(90.5)).toBe(false);
    expect(isValidMonoPd(31)).toBe(true);
    expect(isValidMonoPd(45)).toBe(false);
    expect(isValidBinocularPd(62)).toBe(true);
    expect(isValidBinocularPd(30)).toBe(false);
  });
});
