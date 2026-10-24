export type ChildAdjustment = { markup: number; discount: number };

export const materializedPrice = (
  baselineBbd: number,
  master: ChildAdjustment,
  child: ChildAdjustment,
): number => {
  const adjusted = baselineBbd
    * (1 + master.markup / 100)
    * (1 - master.discount / 100)
    * (1 + child.markup / 100)
    * (1 - child.discount / 100);
  return Math.round((adjusted + Number.EPSILON) * 100) / 100;
};

export const needsMaterializedOverride = (baselineBbd: number, adjustedBbd: number): boolean => adjustedBbd !== baselineBbd;
