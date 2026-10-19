import { useState } from 'react';
import { useStockProductVariants, variantIsChiral, type StockCatalogItem, type StockVariant } from '@/hooks/useStockOrderBuilder';
import { useProductVariantSettings, type ProductVariant } from '@/hooks/useProductVariants';
import { LensVariantGrid } from '@/components/lenses/LensVariantGrid';
import { Button } from '@/components/ui/button';
import { ComboBox } from './cards/ComboBox';
import { Seg } from './ui';
import { comboOptions, repairTriple, type Triple } from '../domain/catalog';
import { useStockLensIdentities } from './useStockLensIdentities';
import type { StockLensIdentity, StockSide } from './stockOrderModel';

interface Props {
  accountId: number; products: StockCatalogItem[]; money: (price: number) => string;
  onAdd: (product: StockCatalogItem, variant: StockVariant | null, quantity: number, side: StockSide) => void;
  onDone: () => void;
}
const blank = (): Triple => ({ m: '', d: '', c: '' });

function ProductPowers({ product, identity, side, money, onAdd, onDone }: Pick<Props, 'money' | 'onAdd' | 'onDone'> & { product: StockCatalogItem; identity: StockLensIdentity; side: StockSide }) {
  const { data: variants = [], isLoading, error } = useStockProductVariants('lens', product.product_id);
  const { data: settings } = useProductVariantSettings('lens', product.product_id);
  const [diameter, setDiameter] = useState('');
  const [validation, setValidation] = useState('');
  const diameters = [...new Set(variants.map(v => String(v.attributes.diameter ?? 'Not specified')))];
  const selectedDiameter = diameters.length === 1 ? diameters[0] : diameter;
  const shown = variants.filter(v => !diameters.length || String(v.attributes.diameter ?? 'Not specified') === selectedDiameter);
  const numeric = (value: unknown) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const hasAxes = shown.length > 0 && shown.every(v => numeric(v.attributes.sphere) && numeric(v.attributes.cylinder));
  const keys = shown.map(v => `${Number(v.attributes.sphere)}:${Number(v.attributes.cylinder)}`);
  const uniqueCells = new Set(keys).size === shown.length;
  const config = settings?.config as { row_label?: string; column_label?: string } | undefined;
  const gridVariants: ProductVariant[] = shown.map(v => ({
    id: v.id, product_type: 'lens', product_id: product.product_id, title: v.title, variant_key: v.id, sku: v.sku, opc_code: v.opc_code,
    attributes: v.attributes as ProductVariant['attributes'], metadata: v.metadata, price: product.unit_price,
    stock_qty: v.stock_qty, reserved_qty: v.reserved_qty ?? 0, low_stock_threshold: 0, allow_backorder: v.allow_backorder ?? false, is_active: true, sort_order: 0,
  }));
  const addSelected = async (entries: { variantId: string; quantity: number }[]) => {
    const limit = side === 'pair' ? 49 : 99;
    if (entries.some(e => !Number.isInteger(e.quantity) || e.quantity < 1 || e.quantity > limit)) { setValidation(`Enter whole quantities from 1 to ${limit}.`); return; }
    if (side === 'pair' && entries.some(e => {
      const v = shown.find(v => v.id === e.variantId)!;
      const codes = v.metadata.opc_by_eye as Record<string, unknown> | undefined;
      return variantIsChiral(v) && (!codes?.right || !codes?.left);
    })) { setValidation('A selected pair is missing a left or right OPC. Select one eye or repair the variant.'); return; }
    entries.forEach(e => onAdd(product, shown.find(v => v.id === e.variantId)!, e.quantity, side));
    onDone();
  };
  return <div className="mt-5 space-y-3 rounded-lg border p-3">
    <div className="flex justify-between gap-4 text-xs"><div><b>{product.name}</b><p className="mt-1 text-muted-foreground">{identity.finish}</p></div><b className="whitespace-nowrap">{money(product.unit_price * (side === 'pair' ? 2 : 1))} / {side === 'pair' ? 'pair' : 'lens'}</b></div>
    {isLoading && <p className="text-xs">Loading available powers…</p>}{error && <p role="alert" className="text-xs text-destructive">Could not load variants. Close and retry.</p>}
    {diameters.length > 1 && <ComboBox label="Diameter" value={diameter} items={diameters.map(id => ({ id, n: id === 'Not specified' ? id : `${id} mm` }))} onPick={setDiameter} />}
    {validation && <p role="alert" className="text-xs text-destructive">{validation}</p>}
    {hasAxes && uniqueCells ? <LensVariantGrid key={`${product.product_id}:${side}:${selectedDiameter}`} variants={gridVariants} rowLabel={config?.row_label || (/semi/i.test(identity.finish) ? 'Base curve' : 'Sphere')} columnLabel={config?.column_label || (identity.vision === 'mf' ? 'ADD' : 'Cylinder')} addButtonLabel="Add selected powers" onAddSelected={addSelected} />
      : !isLoading && !error && (!diameters.length || selectedDiameter) && <div className="max-h-64 space-y-2 overflow-auto">{shown.map(v => <div key={v.id} className="flex items-center justify-between gap-3 text-xs"><span>{v.title}</span><Button size="sm" variant="outline" onClick={() => void addSelected([{ variantId: v.id, quantity: 1 }])}>Add {side === 'pair' ? 'pair' : 'lens'}</Button></div>)}{!shown.length && <p>No active variants are offered.</p>}{hasAxes && !uniqueCells && <p className="text-muted-foreground">Choose the exact variant above; multiple variants share these powers.</p>}</div>}
    <p className="text-[11px] text-muted-foreground">Quantities are {side === 'pair' ? 'pairs (two lenses per pair)' : 'individual lenses'}. Prices are rechecked by the server when saved and submitted.</p>
  </div>;
}

export function StockLensBrowser({ accountId, products, money, onAdd, onDone }: Props) {
  const { data: identities = [], isLoading, error } = useStockLensIdentities(accountId, products.map(p => p.product_id));
  const [vision, setVision] = useState<StockLensIdentity['vision']>('sv');
  const [side, setSide] = useState<StockSide>('pair');
  const [triple, setTriple] = useState<Triple>(blank);
  const [productId, setProductId] = useState('');
  const pool = identities.filter(i => i.vision === vision);
  const graph = { combos: pool.map(i => ({ m: i.material, d: i.design, c: i.option })), designs: pool.map(i => ({ id: i.design, v: 'sv' as const })) };
  const options = comboOptions(graph, 'sv', triple);
  const matches = pool.filter(i => i.material === triple.m && i.design === triple.d && i.option === triple.c);
  const selected = matches.length === 1 ? matches[0] : matches.find(i => i.productId === productId);
  const product = selected && products.find(p => p.product_id === selected.productId);
  const items = (ids: string[]) => ids.map(id => ({ id, n: id }));
  const pick = (key: keyof Triple) => (id: string) => { setTriple(repairTriple(graph, 'sv', { ...triple, [key]: id }).triple); setProductId(''); };
  return <div className="space-y-4" data-rx-form>
    <div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-1.5 text-xs font-semibold">Vision type</p><Seg<StockLensIdentity['vision']> label="Vision type" value={vision} onChange={v => { setVision(v); setTriple(blank()); setProductId(''); }} options={[{ value: 'sv', label: 'Single vision' }, { value: 'mf', label: 'Multifocal / Progressive' }, ...(identities.some(i => i.vision === 'other') ? [{ value: 'other' as const, label: 'Other stock lenses' }] : [])]} /></div><div><p className="mb-1.5 text-xs font-semibold">Eyes to supply</p><Seg<StockSide> label="Eyes to supply" value={side} onChange={setSide} options={[{ value: 'pair', label: 'Pair' }, { value: 'right', label: 'Right only' }, { value: 'left', label: 'Left only' }]} /></div></div>
    {isLoading ? <p className="text-xs">Loading lens choices…</p> : error ? <p role="alert" className="text-xs text-destructive">Lens choices could not be loaded. Close and retry.</p> : <>
      <p className="text-xs font-semibold">Choose in any order — each list narrows the others · type to search</p>
      <div className="grid gap-3 sm:grid-cols-3"><ComboBox num={1} label="Material / index" value={triple.m} items={items(options.mats)} onPick={pick('m')} /><ComboBox num={2} label="Lens design / type" value={triple.d} items={items(options.designs)} onPick={pick('d')} /><ComboBox num={3} label="Lens colour option" value={triple.c} items={items(options.cols)} onPick={pick('c')} /></div>
      {matches.length > 1 && <ComboBox label="Stock lens product" value={productId} items={matches.map(i => ({ id: i.productId, n: products.find(p => p.product_id === i.productId)!.name }))} onPick={setProductId} />}
      {selected && product ? <ProductPowers key={product.product_id} product={product} identity={selected} side={side} money={money} onAdd={onAdd} onDone={onDone} /> : <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-8 text-center text-xs text-muted-foreground">Select material, lens design and option to see available powers.{!pool.length && <p className="mt-2">No priced lenses in this vision category.</p>}</div>}
    </>}
  </div>;
}
