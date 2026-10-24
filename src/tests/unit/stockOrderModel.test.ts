import { describe, expect, it } from 'vitest';
import { stageStockLines, stockLinePrice, stockVision, type StockLine } from '@/features/rx-order/form/stockOrderModel';

const line = (patch: Partial<StockLine> = {}): StockLine => ({ key: 'a', product: { product_id: 'p', product_type: 'lens', name: 'Stock lens', category: 'Lens', sku: null, has_variants: true, unit_price: 25 }, variant: { id: 'v', title: 'Power', sku: 'SKU', opc_code: '0123', metadata: {}, attributes: {}, stock_qty: 8 }, side: 'pair', quantity: 3, customerRef: 'Note', ...patch });
describe('stock UI quantities to server lens units', () => {
  it('converts symmetric pairs to individual lens counts, matching the displayed estimate', () => {
    const l = line();
    expect(stockLinePrice(l)).toBe(50);
    expect(stageStockLines([l])).toEqual([{ product_type: 'lens', product_id: 'p', variant_id: 'v', side: 'either', quantity: 6, customer_ref: 'Note' }]);
    expect(stageStockLines([l])[0].quantity * l.product.unit_price).toBe(stockLinePrice(l) * l.quantity);
  });
  it('splits chiral pairs into explicit eyes so both OPCs resolve on the server', () => {
    const l = line(); l.variant!.metadata = { is_chiral: true, opc_by_eye: { left: 'L', right: 'R' } };
    expect(stageStockLines([l]).map(i => [i.side, i.quantity])).toEqual([['right', 3], ['left', 3]]);
  });
  it('rejects missing eye codes and quantities above the server per-line bound', () => {
    const l = line(); l.variant!.metadata = { is_chiral: true, opc_by_eye: { right: 'R' } };
    expect(() => stageStockLines([l])).toThrow(/left or right OPC/);
    expect(() => stageStockLines([line({ quantity: 50 })])).toThrow(/49/);
    expect(() => stageStockLines([line({ side: 'right', quantity: 1.5 })])).toThrow(/whole|between/);
  });
  it('keeps single-eye and mixed service items independent, without marking all lines as collection requests', () => {
    const service = line({ product: { product_id: 'service', product_type: 'addon', name: 'Repair', category: 'Services', sku: 'REP', has_variants: false, unit_price: 8 }, variant: null, side: 'either', quantity: 1, customerRef: 'Please repair' });
    expect(stageStockLines([line({ side: 'left', quantity: 2 }), service])).toEqual([
      { product_type: 'lens', product_id: 'p', variant_id: 'v', side: 'left', quantity: 2, customer_ref: 'Note' },
      { product_type: 'addon', product_id: 'service', variant_id: null, side: 'either', quantity: 1, customer_ref: 'Please repair' },
    ]);
  });
  it('does not classify missing vision metadata as single vision', () => {
    expect(stockVision('')).toBe('other'); expect(stockVision('Single Vision')).toBe('sv'); expect(stockVision('Progressive')).toBe('mf');
  });
});
