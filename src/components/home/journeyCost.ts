export type CostInputs = [string, string, string, string, string];

/** Blank is unknown, never free. Inputs must already share a currency and basket. */
export function landedTotal(values: CostInputs): number | null {
  if (values.some((value) => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0)) return null;
  return Math.round(values.reduce((sum, value) => sum + Number(value), 0) * 100) / 100;
}

export function compareCosts(current: CostInputs, proposed: CostInputs) {
  const currentTotal = landedTotal(current);
  const proposedTotal = landedTotal(proposed);
  if (currentTotal === null || proposedTotal === null) return null;
  return { currentTotal, proposedTotal, difference: Math.round((currentTotal - proposedTotal) * 100) / 100 };
}
