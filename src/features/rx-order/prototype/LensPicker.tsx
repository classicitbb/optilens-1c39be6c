import { useState } from 'react';
import { ComboBox } from '../form/cards/ComboBox';
import { Seg } from '../form/ui';
import { comboOptions, repairTriple, type LensCatalog, type Triple, type Vision } from '../domain/catalog';
import { LensVariantGrid } from '@/components/lenses/LensVariantGrid';
import type { ProductVariant } from '@/hooks/useProductVariants';

interface SeedLens {
  id: string; vision: string; material: string; design: string; option: string;
  price: number; finish: string; rows: number[]; cols: number[]; rowLabel: string; colLabel: string;
}
interface Props {
  lenses: SeedLens[];
  priceFor: (price: number) => number;
  money: (price: number) => string;
  onAdd: (lens: SeedLens, row: number, col: number, quantity: number, side: string) => void;
  onDone: () => void;
  onClose: () => void;
}
const blank = (): Triple => ({ m: '', d: '', c: '' });
const visionFor = (lens: SeedLens): Vision => lens.vision === 'Single vision' ? 'sv' : 'mf';

export function LensPicker({ lenses, priceFor, money, onAdd, onDone, onClose }: Props) {
  const [vision, setVision] = useState<Vision>('sv');
  const [side, setSide] = useState('Pair');
  const [triple, setTriple] = useState<Triple>(blank);
  const graph: LensCatalog = {
    combos: lenses.map(l => ({ m: l.material, d: l.design, c: l.option })),
    designs: lenses.map(l => ({ id: l.design, v: visionFor(l) })),
  };
  const options = comboOptions(graph, vision, triple);
  const lens = triple.m && triple.d && triple.c
    ? lenses.find(l => visionFor(l) === vision && l.material === triple.m && l.design === triple.d && l.option === triple.c)
    : undefined;
  const pick = (axis: keyof Triple) => (id: string) => {
    // Exactly the repair operation used by useRxOrderForm.pickLens.
    setTriple(repairTriple(graph, vision, { ...triple, [axis]: id }).triple);
  };
  const items = (ids: string[]) => ids.map(id => ({ id, n: id }));
  const variants: ProductVariant[] = lens ? lens.rows.flatMap((row, r) => lens.cols.flatMap((col, c) => {
    if ((r === 0 || r === lens.rows.length - 1) && c === 0) return [];
    return [{
      id: `${r}:${c}`, product_type: 'lens' as const, product_id: lens.id,
      title: `${row.toFixed(2)} / ${col.toFixed(2)}`, variant_key: `${r}:${c}`, sku: null, opc_code: null,
      attributes: { sphere: row, cylinder: col }, metadata: {}, price: priceFor(lens.price),
      stock_qty: 20, reserved_qty: 0, low_stock_threshold: 0, allow_backorder: false, is_active: true, sort_order: r * lens.cols.length + c,
    }];
  })) : [];
  return <>
    <div className="dialog-head"><div><div className="eyebrow">Account-priced stock lenses</div><h2 id="picker-title">Choose lenses &amp; powers</h2><p>Choose the lens, then enter quantities in its available variants.</p></div><button className="ghost" onClick={onClose} aria-label="Close lens browser">×</button></div>
    <div className="dialog-body shared-ui" data-rx-form>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs font-semibold mb-1.5">Vision type <span className="required">*</span></p><Seg label="Vision type" value={vision} onChange={v => { setVision(v); setTriple(blank()); }} options={[{ value: 'sv', label: 'Single vision' }, { value: 'mf', label: 'Multifocal / Progressive' }]} /></div>
        <div><p className="text-xs font-semibold mb-1.5">Eyes to supply <span className="required">*</span></p><Seg label="Eyes to supply" value={side} onChange={setSide} options={['Pair', 'Right only', 'Left only'].map(value => ({ value, label: value }))} /></div>
      </div>
      <p className="selector-help">Choose in any order — each list narrows the others · type to search</p>
      <div className="grid gap-3 sm:grid-cols-3 lens-selectors">
        <ComboBox num={1} label="Material / index" value={triple.m} items={items(options.mats)} onPick={pick('m')} />
        <ComboBox num={2} label="Lens design / type" value={triple.d} items={items(options.designs)} onPick={pick('d')} />
        <ComboBox num={3} label="Lens colour option" value={triple.c} items={items(options.cols)} onPick={pick('c')} />
      </div>
      {lens ? <div className="store-grid">
        <div className="matrix-info"><span><b>{lens.material} · {lens.design} · {lens.option}</b><br /><small>{lens.finish} · diameter 65 mm</small></span><span>{money(priceFor(lens.price) * (side === 'Pair' ? 2 : 1))} / {side === 'Pair' ? 'pair' : 'lens'}</span></div>
        <h3 className="grid-heading">▱ &nbsp; Select lens powers</h3>
        <LensVariantGrid key={`${lens.id}:${side}`} variants={variants} rowLabel={lens.rowLabel} columnLabel={lens.colLabel} addButtonLabel="Add selected powers" onAddSelected={async entries => {
          for (const entry of entries) { const [r, c] = entry.variantId.split(':').map(Number); onAdd(lens, r, c, entry.quantity, side); }
          onDone();
        }} />
        <small>Quantities are {side === 'Pair' ? 'pairs (two lenses per pair)' : 'individual lenses'}. Dashes indicate variants not offered in this seeded catalog.</small>
      </div> : <div className="pending"><h2>Your lens variants will appear here</h2><p>Select material, lens type and option to see available powers.</p><small>Only combinations offered on this account’s pricelist appear.</small></div>}
    </div>
    <div className="dialog-foot"><small>Seeded pricelist · BBD · no live cart connection</small><button onClick={onClose}>Done</button></div>
  </>;
}

