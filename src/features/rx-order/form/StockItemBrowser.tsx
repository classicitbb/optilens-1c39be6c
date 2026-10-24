import { useState } from 'react';
import { useStockProductVariants, type StockCatalogItem, type StockVariant } from '@/hooks/useStockOrderBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReferenceData } from '@/hooks/useReferenceData';

export interface StockItemBrowserProps {
  products: StockCatalogItem[];
  money: (price: number) => string;
  onAdd: (product: StockCatalogItem, variant: StockVariant | null) => void;
}
function SupplyVariants({ product, onAdd }: Pick<StockItemBrowserProps, 'onAdd'> & { product: StockCatalogItem }) {
  const { data = [], isLoading, error } = useStockProductVariants(product.product_type, product.product_id);
  return <div className="mt-3 space-y-2 rounded border p-3">
    {isLoading && <p className="text-xs text-muted-foreground">Loading variants…</p>}
    {error && <p role="alert" className="text-xs text-destructive">Variants could not be loaded. Close and retry.</p>}
    {!isLoading && !error && !data.length && <p className="text-xs">No active variants are available.</p>}
    {data.map(v => <div key={v.id} className="flex items-center gap-3 text-xs"><span className="min-w-0 flex-1">{v.title}<small className="block text-muted-foreground">{v.opc_code || v.sku}</small></span><Button size="sm" variant="outline" onClick={() => onAdd(product, v)}>Add variant</Button></div>)}
  </div>;
}

/** Shared category browser: supplies and published add-on/service items from the account catalog. */
export function StockItemBrowser({ products, money, onAdd }: StockItemBrowserProps) {
  const { data: categoryNames = [] } = useReferenceData('supply_categories');
  const [category, setCategory] = useState('All items');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const categoryOf = (p: StockCatalogItem) => {
    const named = categoryNames.find(c => c.id === p.category)?.name;
    const labels: Record<string, string> = { lab: 'Lab Supplies', optical: 'Optical Supplies', accessories: 'Eyewear Accessories', repairs: 'Frame Repairs' };
    return named || labels[p.category ?? ''] || (p.category && !/^[0-9a-f]{8}-/i.test(p.category) ? p.category : p.product_type === 'addon' ? 'Services' : 'Supplies');
  };
  const categories = ['All items', ...new Set(products.map(categoryOf))];
  const filtered = products.filter(p => (category === 'All items' || categoryOf(p) === category) && `${p.name} ${p.sku ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="stock-items-browser grid gap-5 sm:grid-cols-[175px_minmax(0,1fr)]">
    <nav aria-label="Item categories" className="flex gap-1 overflow-auto sm:flex-col">{categories.map(c => <Button key={c} size="sm" variant={category === c ? 'secondary' : 'outline'} className="shrink-0 justify-start text-xs" aria-pressed={category === c} onClick={() => { setCategory(c); setExpanded(null); }}>{c}</Button>)}</nav>
    <div className="min-w-0"><Input aria-label="Search supplies and services" placeholder="Search items by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="divide-y">{filtered.map(p => {
        const key = `${p.product_type}:${p.product_id}`;
        return <article key={key} className="py-4"><div className="flex items-center gap-4"><div className="min-w-0 flex-1"><small className="font-mono text-[10px] uppercase text-secondary">{categoryOf(p)}{p.product_type === 'addon' ? ' · Service' : ''}</small><h3 className="mt-1 text-sm font-semibold">{p.name}</h3><small className="text-muted-foreground">{p.sku || (p.has_variants ? 'Choose a variant for its SKU' : 'No SKU configured')}</small></div><div className="shrink-0 text-right"><p className="mb-2 text-sm font-semibold">{money(p.unit_price)}</p><Button size="sm" variant="outline" disabled={!p.has_variants && !p.sku} onClick={() => p.has_variants ? setExpanded(expanded === key ? null : key) : onAdd(p, null)}>{p.has_variants ? 'Choose variant' : '+ Add item'}</Button></div></div>{expanded === key && <SupplyVariants product={p} onAdd={onAdd} />}</article>;
      })}{!filtered.length && <p className="py-8 text-center text-xs text-muted-foreground">No priced items match.</p>}</div>
    </div>
  </div>;
}
