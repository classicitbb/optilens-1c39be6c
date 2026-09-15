export type ChargeField = "type" | "amount" | "vat" | "duty" | "reclaimable" | "notes";

export type ChargeAdvance =
  | { kind: "focus"; chargeId: string; field: ChargeField }
  | { kind: "create" };

const fieldOrder: ChargeField[] = ["type", "amount", "vat", "duty", "reclaimable", "notes"];

/** Returns the exact target for an Enter keypress in the landed-charge grid. */
export const getChargeAdvance = (chargeIds: string[], chargeId: string, field: ChargeField): ChargeAdvance => {
  const fieldIndex = fieldOrder.indexOf(field);
  if (fieldIndex < fieldOrder.length - 1) return { kind: "focus", chargeId, field: fieldOrder[fieldIndex + 1] };
  const nextChargeId = chargeIds[chargeIds.indexOf(chargeId) + 1];
  return nextChargeId ? { kind: "focus", chargeId: nextChargeId, field: "type" } : { kind: "create" };
};
