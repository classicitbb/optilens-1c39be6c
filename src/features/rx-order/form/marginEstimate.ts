/** An estimate only; never used to price or persist an order. Amounts are BBD. */
export function sellingMargin(costBBD: number, sellingPrice: string) {
  if (!/^\d+(?:\.\d{0,2})?$/.test(sellingPrice.trim())) return null;
  const saleCents = Math.round(Number(sellingPrice) * 100);
  const costCents = Math.round(costBBD * 100);
  if (!Number.isSafeInteger(saleCents) || !Number.isSafeInteger(costCents) || costCents < 0) return null;
  const profitCents = saleCents - costCents;
  return {
    profitBBD: profitCents / 100,
    marginPercent: saleCents === 0 ? null : (profitCents / saleCents) * 100,
  };
}
