import type { ProductVariant } from "@/hooks/useProductVariants";

export type InnovationsPowerRow = {
  id: string;
  innovations_lens_id: string;
  diameter: number | null;
  sphere: number | null;
  base: number | null;
  cylinder: number | null;
  add: number | null;
  stock_on_hand: number | null;
  right_opc: string | null;
  left_opc: string | null;
};

const numeric = (value: number | null) => Number(value ?? 0);

/** Converts the Lens Local rows into reviewable (but not yet persisted) grid rows. */
export const buildImportedLensVariants = (
  rows: InnovationsPowerRow[],
  options: { isChiral: boolean; rowLabel: string; columnLabel: string; price: number },
): Partial<ProductVariant>[] => {
  const variants = new Map<string, Partial<ProductVariant>>();
  for (const row of rows) {
    const sphere = numeric(row.sphere ?? row.base);
    const cylinder = numeric(row.cylinder ?? row.add);
    const diameter = numeric(row.diameter);
    const variantKey = `sphere:${sphere}|cylinder:${cylinder}|diameter:${diameter}`;
    const current = variants.get(variantKey) ?? {
      title: `${options.rowLabel.toUpperCase()} ${sphere.toFixed(2)} / ${options.columnLabel.toUpperCase()} ${cylinder.toFixed(2)}`,
      variant_key: variantKey,
      sku: `LENS-${sphere.toFixed(2)}-${cylinder.toFixed(2)}-${diameter.toFixed(2)}`,
      opc_code: options.isChiral ? null : row.right_opc ?? row.left_opc ?? null,
      attributes: { sphere, cylinder, diameter },
      metadata: { is_chiral: options.isChiral, opc_by_eye: {}, innovations_power_row_ids: [] },
      price: options.price,
      stock_qty: 0,
      is_active: true,
      sort_order: variants.size,
    };
    const metadata = current.metadata as any;
    metadata.innovations_power_row_ids.push(row.id);
    if (row.left_opc) metadata.opc_by_eye.left = row.left_opc;
    if (row.right_opc) metadata.opc_by_eye.right = row.right_opc;
    current.stock_qty = Number(current.stock_qty ?? 0) + numeric(row.stock_on_hand);
    variants.set(variantKey, current);
  }
  return [...variants.values()];
};
