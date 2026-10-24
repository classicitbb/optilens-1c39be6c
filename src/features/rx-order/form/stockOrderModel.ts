import type { StageOrderItem, StockCatalogItem, StockVariant } from '@/hooks/useStockOrderBuilder';
import { variantIsChiral, variantSkuFor } from '@/hooks/useStockOrderBuilder';

export type StockSide = 'pair' | 'right' | 'left' | 'either';
export interface StockLine {
  key: string; product: StockCatalogItem; variant: StockVariant | null;
  side: StockSide; quantity: number; customerRef: string;
}
export const stockLineKey = (p: StockCatalogItem, v: StockVariant | null, side: StockSide) => `${p.product_type}:${p.product_id}:${v?.id ?? 'base'}:${side}`;
export const stockLinePrice = (line: StockLine) => line.product.unit_price * (line.product.product_type === 'lens' && line.side === 'pair' ? 2 : 1);
export const stockLineSku = (line: StockLine) => line.variant
  ? variantSkuFor(line.variant, line.side === 'pair' ? 'either' : line.side)
  : line.product.sku;
export const stockLineLimit = (line: Pick<StockLine, 'product' | 'side'>) => line.product.product_type === 'lens' && line.side === 'pair' ? 49 : 99;

/** The stock RPC accepts individual lenses, including explicit per-eye OPCs. */
export function stageStockLines(lines: StockLine[]): StageOrderItem[] {
  return lines.flatMap(line => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > stockLineLimit(line)) throw new Error(`Quantity must be between 1 and ${stockLineLimit(line)}.`);
    const base = { product_type: line.product.product_type, product_id: line.product.product_id, variant_id: line.variant?.id ?? null, quantity: line.quantity, customer_ref: line.customerRef };
    if (line.product.product_type !== 'lens' || line.side !== 'pair') return [{ ...base, side: line.side === 'pair' ? 'either' : line.side }];
    if (line.variant && variantIsChiral(line.variant)) {
      const codes = line.variant.metadata.opc_by_eye as Record<string, unknown> | undefined;
      if (!codes?.left || !codes?.right) throw new Error('This pair is missing a left or right OPC. Choose a single eye or repair the variant.');
      return [{ ...base, side: 'right' as const }, { ...base, side: 'left' as const }];
    }
    return [{ ...base, side: 'either' as const, quantity: line.quantity * 2 }];
  });
}

export interface StockLensIdentity {
  productId: string; material: string; design: string; option: string;
  vision: 'sv' | 'mf' | 'other'; finish: string;
}

export function stockVision(name: string): StockLensIdentity['vision'] {
  if (/single|^sv$/i.test(name)) return 'sv';
  if (/multi|progressive|bifocal|trifocal|^mf$/i.test(name)) return 'mf';
  return 'other';
}
