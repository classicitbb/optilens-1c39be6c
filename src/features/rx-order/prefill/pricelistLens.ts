import { defaultValues, type RxCatalog, type RxFormValues } from "../form/types";

/** Selection only: patient, prescription and all other order data start blank.
 * Prices are deliberately absent: the form uses the current account's lookup.
 */
export function valuesForPricelistLens(alias: string, catalog: RxCatalog, accountId: number | null): RxFormValues | null {
  const triple = catalog.tripleForAlias?.(alias);
  if (!triple || !catalog.combos.some((c) => c.m === triple.m && c.d === triple.d && c.c === triple.c)) return null;
  const design = catalog.designs.find((d) => d.id === triple.d);
  if (!design || !catalog.materials.some((m) => m.id === triple.m) || !catalog.colours.some((c) => c.id === triple.c)) return null;
  const values = defaultValues(accountId);
  values.job.vision = design.v;
  values.lens.od = { ...triple };
  return values;
}
