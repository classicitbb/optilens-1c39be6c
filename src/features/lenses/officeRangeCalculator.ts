// ─────────────────────────────────────────────────────────────────────────────
// Office / occupational (degressive) lens calculator.
//
// Optical basis (verifiable):
//   • Dioptric vergence of a viewing distance D (metres) = 1 / D.
//       2 m → 0.50 D, 4 m → 0.25 D, 6 m → 0.17 D.
//   • An occupational lens has a NEAR zone carrying the full reading ADD and a
//     TOP (intermediate / "room") zone whose extra plus over the distance Rx is
//     just enough to focus at the chosen maximum working distance.
//       intermediate power (top boost over distance) = 1 / range
//   • Degression = the plus power removed from the near zone up to the top zone.
//     Manufacturers order these lenses as "near power + degression", where the
//     degression equals the near ADD minus the intermediate power:
//       degression = ADD − (1 / range)
//
// Sources:
//   • IOT — "Digressive Lenses for the Way We Live Today"
//   • Optician Online — Occupational lenses roundup / CPD archive
//   • The International Opticians' Association — "Workstation Lenses"
// ─────────────────────────────────────────────────────────────────────────────

import { formatSignedPower, roundToQuarter } from "@/features/lenses/rxFormat";

export type OfficeRangeId = "2m" | "4m" | "6m";

export type OfficeRangeOption = {
  id: OfficeRangeId;
  label: string;
  /** Maximum (far) working distance in metres. */
  maxDistanceMeters: number;
  /** Extra plus over the distance Rx at the top of the lens = 1 / distance. */
  intermediatePower: number;
};

export type OfficeLensCalculationInput = {
  distanceSphRight: number;
  distanceSphLeft: number;
  addPower: number;
  rangeId: OfficeRangeId;
};

export type OfficeLensCalculationResult = {
  selectedRange: OfficeRangeOption;
  /** Vergence at the chosen far distance = 1 / range (exact reciprocal). */
  intermediatePower: number;
  /** ADD − intermediate power; the degression typically ordered with the lens. */
  degression: number;
  /** Distance Rx + ADD — power at the near reference point. */
  nearZoneRight: number;
  nearZoneLeft: number;
  /** Distance Rx + intermediate power — power at the top / room reference point. */
  roomZoneRight: number;
  roomZoneLeft: number;
  /** True when ADD is smaller than the intermediate power the range requires. */
  insufficientAdd: boolean;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

// 1 / distance, kept to 2 decimals (true optical vergence at the far point).
const intermediatePowerForDistance = (meters: number): number => round2(1 / meters);

export const OFFICE_RANGE_OPTIONS: OfficeRangeOption[] = [
  { id: "2m", label: "2 m", maxDistanceMeters: 2, intermediatePower: intermediatePowerForDistance(2) },
  { id: "4m", label: "4 m", maxDistanceMeters: 4, intermediatePower: intermediatePowerForDistance(4) },
  { id: "6m", label: "6 m", maxDistanceMeters: 6, intermediatePower: intermediatePowerForDistance(6) },
];

export const formatSignedDiopters = (value: number): string => formatSignedPower(value);

export const formatMeters = (value: number): string => `${value.toFixed(2)} m`;

export const calculateOfficeLensValues = (
  input: OfficeLensCalculationInput,
): OfficeLensCalculationResult => {
  const selectedRange =
    OFFICE_RANGE_OPTIONS.find((option) => option.id === input.rangeId) ?? OFFICE_RANGE_OPTIONS[0];

  const intermediatePower = selectedRange.intermediatePower;
  const insufficientAdd = input.addPower < intermediatePower;
  const degression = round2(Math.max(input.addPower - intermediatePower, 0));

  return {
    selectedRange,
    intermediatePower,
    degression,
    // Near zone is a real surfaced Rx → snap to the 0.25 D grid.
    nearZoneRight: roundToQuarter(input.distanceSphRight + input.addPower),
    nearZoneLeft: roundToQuarter(input.distanceSphLeft + input.addPower),
    // Top/room reference carries the exact intermediate vergence over distance.
    roomZoneRight: round2(input.distanceSphRight + intermediatePower),
    roomZoneLeft: round2(input.distanceSphLeft + intermediatePower),
    insufficientAdd,
  };
};
