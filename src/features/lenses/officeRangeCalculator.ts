export type OfficeRangeOption = {
  id: "6m_plus" | "4m" | "2m" | "1_35m" | "1m" | "0_8m";
  label: string;
  maxDistanceMeters: number | null;
  shift: number | null;
};

export type OfficeLensCalculationInput = {
  distanceSphRight: number;
  distanceSphLeft: number;
  addPower: number;
  rangeId: OfficeRangeOption["id"];
};

export type OfficeLensCalculationResult = {
  selectedRange: OfficeRangeOption;
  shift: number | null;
  shiftAtPupilCenter: number | null;
  rangeAtPupilCenterMeters: number | null;
  rxAtPupilCenterRight: number | null;
  rxAtPupilCenterLeft: number | null;
  nearReferenceRight: number;
  nearReferenceLeft: number;
};

export const OFFICE_RANGE_OPTIONS: OfficeRangeOption[] = [
  { id: "6m_plus", label: "6m+", maxDistanceMeters: null, shift: null },
  { id: "4m", label: "4 m", maxDistanceMeters: 4, shift: 0.25 },
  { id: "2m", label: "2 m", maxDistanceMeters: 2, shift: 0.5 },
  { id: "1_35m", label: "1.35 m", maxDistanceMeters: 1.35, shift: 0.75 },
  { id: "1m", label: "1 m", maxDistanceMeters: 1, shift: 1 },
  { id: "0_8m", label: "0.8 m", maxDistanceMeters: 0.8, shift: 1.25 },
];

const SHIFT_PUPIL_CENTER_DELTA = 0.25;

const toRoundedQuarter = (value: number) => Math.round(value * 4) / 4;

export const formatSignedDiopters = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;

export const formatMeters = (value: number) => `${value.toFixed(2)} m`;

export const buildSphOptions = (): number[] => {
  const options: number[] = [];
  for (let value = 10; value >= -10; value -= 0.25) {
    options.push(toRoundedQuarter(value));
  }
  return options;
};

export const buildAddOptions = (): number[] => {
  const options: number[] = [];
  for (let value = 0.5; value <= 2.5; value += 0.25) {
    options.push(toRoundedQuarter(value));
  }
  return options;
};

export const calculateOfficeLensValues = (
  input: OfficeLensCalculationInput,
): OfficeLensCalculationResult => {
  const selectedRange =
    OFFICE_RANGE_OPTIONS.find((option) => option.id === input.rangeId) ??
    OFFICE_RANGE_OPTIONS[0];

  const shift = selectedRange.shift;
  const shiftAtPupilCenter =
    shift === null
      ? null
      : toRoundedQuarter(Math.max(shift - SHIFT_PUPIL_CENTER_DELTA, 0));

  const rangeAtPupilCenterMeters =
    shiftAtPupilCenter && shiftAtPupilCenter > 0
      ? Number((1 / shiftAtPupilCenter).toFixed(2))
      : null;

  return {
    selectedRange,
    shift,
    shiftAtPupilCenter,
    rangeAtPupilCenterMeters,
    rxAtPupilCenterRight:
      shiftAtPupilCenter === null
        ? null
        : toRoundedQuarter(input.distanceSphRight + shiftAtPupilCenter),
    rxAtPupilCenterLeft:
      shiftAtPupilCenter === null
        ? null
        : toRoundedQuarter(input.distanceSphLeft + shiftAtPupilCenter),
    nearReferenceRight: toRoundedQuarter(input.distanceSphRight + input.addPower),
    nearReferenceLeft: toRoundedQuarter(input.distanceSphLeft + input.addPower),
  };
};
