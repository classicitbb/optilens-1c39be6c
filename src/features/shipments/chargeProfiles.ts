export type HistoricChargeRow = {
  shipment_id: string;
  charge_type: string;
  amount_bbd: number | null;
  vat_bbd: number | null;
  duty_bbd: number | null;
  vat_reclaimable: boolean | null;
  notes: string | null;
};

export type ChargeProfile = {
  amount_bbd: number;
  vat_bbd: number;
  duty_bbd: number;
  vat_reclaimable: boolean;
  notes: string;
  count: number;
};

type ProfileCandidate = ChargeProfile & { recency: number };

const normaliseNumber = (value: number | null) => Number(value ?? 0);
const normaliseNotes = (value: string | null) => value ?? "";

const profileKey = (charge: HistoricChargeRow) => JSON.stringify([
  normaliseNumber(charge.amount_bbd),
  normaliseNumber(charge.vat_bbd),
  normaliseNumber(charge.duty_bbd),
  Boolean(charge.vat_reclaimable),
  normaliseNotes(charge.notes),
]);

/**
 * Selects the most-used complete row profile for each charge type. Shipment ids
 * must be supplied in newest-first order; the first matching profile wins ties.
 */
export const deriveChargeProfiles = (
  charges: HistoricChargeRow[],
  newestShipmentIds: string[],
  minimumUses = 2,
): Record<string, ChargeProfile> => {
  const recencyByShipment = new Map(newestShipmentIds.map((id, index) => [id, index]));
  const candidates = new Map<string, ProfileCandidate>();

  for (const charge of charges) {
    const recency = recencyByShipment.get(charge.shipment_id);
    if (recency == null) continue;
    const key = `${charge.charge_type}\u0000${profileKey(charge)}`;
    const existing = candidates.get(key);
    if (existing) {
      existing.count += 1;
      existing.recency = Math.min(existing.recency, recency);
      continue;
    }
    candidates.set(key, {
      amount_bbd: normaliseNumber(charge.amount_bbd),
      vat_bbd: normaliseNumber(charge.vat_bbd),
      duty_bbd: normaliseNumber(charge.duty_bbd),
      vat_reclaimable: Boolean(charge.vat_reclaimable),
      notes: normaliseNotes(charge.notes),
      count: 1,
      recency,
    });
  }

  const best = new Map<string, ProfileCandidate>();
  for (const [key, candidate] of candidates) {
    if (candidate.count < minimumUses) continue;
    const chargeType = key.split("\u0000", 1)[0];
    const current = best.get(chargeType);
    if (!current || candidate.count > current.count || (candidate.count === current.count && candidate.recency < current.recency)) {
      best.set(chargeType, candidate);
    }
  }

  return Object.fromEntries(Array.from(best, ([chargeType, profile]) => {
    const { recency: _, ...result } = profile;
    return [chargeType, result];
  }));
};
