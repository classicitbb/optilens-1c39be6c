// Approved stock/supplies UI, backed by the existing account-priced stock order contract.
import { useRef, useState } from 'react';
import { PackagePlus, ScanLine, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resolveStockCode, variantIsChiral, useReleaseStockOrder, useStageStockOrder, useStockOrderCatalog, type StockCatalogItem, type StockVariant } from '@/hooks/useStockOrderBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StockItemBrowser } from './StockItemBrowser';
import { StockLensBrowser } from './StockLensBrowser';
import { StockCameraScanner } from './StockCameraScanner';
import { useIsMobile } from '@/hooks/use-mobile';
import { stageStockLines, stockLineKey, stockLineLimit, stockLinePrice, stockLineSku, type StockLine, type StockSide } from './stockOrderModel';
import './stock-order-form.css';

const money = (price: number) => new Intl.NumberFormat('en-BB', { style: 'currency', currency: 'BBD' }).format(price);
const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Please try again.';

export function StockServicePanel({ accountId, accountName }: { accountId: number | null; accountName: string }) {
  const isMobile = useIsMobile();
  const useCamera = isMobile || (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  const { toast } = useToast();
  const { data: catalog = [], isLoading, error } = useStockOrderCatalog(accountId);
  const stage = useStageStockOrder();
  const release = useReleaseStockOrder();
  const [lines, setLines] = useState<StockLine[]>([]);
  const [reference, setReference] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dialog, setDialog] = useState<'items' | 'lenses' | 'scanner' | 'review' | null>(null);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const submissionId = useRef<string | undefined>(undefined);
  const scanInFlight = useRef(false);
  const scanSession = useRef(0);
  const changeDialog = (next: typeof dialog) => { scanSession.current += 1; setDialog(next); };
  const busy = stage.isPending || release.isPending;
  const supplies = catalog.filter(p => p.product_type !== 'lens');
  const lenses = catalog.filter(p => p.product_type === 'lens');
  const total = lines.reduce((sum, l) => sum + Math.round(stockLinePrice(l) * 100) * l.quantity, 0) / 100;

  const add = (product: StockCatalogItem, variant: StockVariant | null, quantity = 1, side: StockSide = 'either') => {
    if (busy) return false;
    // A pair of eye-specific lenses is two order lines (right and left barcode), not one line of two.
    const split = product.product_type === 'lens' && side === 'pair' && variant != null && variantIsChiral(variant);
    if (split) {
      const codes = variant.metadata.opc_by_eye as Record<string, unknown> | undefined;
      if (!codes?.left || !codes?.right) { toast({ description: 'This pair is missing a left or right OPC. Choose a single eye.', variant: 'destructive' }); return false; }
    }
    const sides: StockSide[] = split ? ['right', 'left'] : [side];
    const targets = sides.map(s => ({ side: s, key: stockLineKey(product, variant, s) }));
    const limit = stockLineLimit({ product, side: sides[0] });
    if (targets.some(t => (lines.find(l => l.key === t.key)?.quantity ?? 0) + quantity > limit)) {
      toast({ description: `The maximum is ${limit} per line.`, variant: 'destructive' }); return false;
    }
    setLines(previous => targets.reduce((acc, t) => {
      const existing = acc.find(l => l.key === t.key);
      const nextQuantity = Math.min(limit, (existing?.quantity ?? 0) + quantity);
      return existing ? acc.map(l => l.key === t.key ? { ...l, quantity: nextQuantity } : l) : [...acc, { key: t.key, product, variant, side: t.side, quantity: nextQuantity, customerRef: '' }];
    }, previous));
    return true;
  };
  const patch = (key: string, change: Partial<StockLine>) => setLines(previous => previous.map(l => l.key === key ? { ...l, ...change } : l));
  const validate = () => {
    if (accountId == null) throw new Error('Choose an account first.');
    if (!reference.trim()) throw new Error('Patient / order reference is required.');
    if (!lines.length) throw new Error('Add at least one item.');
    return stageStockLines(lines);
  };
  const persist = async () => {
    const items = validate();
    if (accountId == null) throw new Error('Choose an account first.');
    const row = await stage.mutateAsync({ submissionId: submissionId.current, accountId, poNumber: poNumber.trim(), orderReference: reference.trim(), instructions: instructions.trim(), items });
    submissionId.current = row.submission_id;
    return row;
  };
  const saveDraft = async () => {
    try { await persist(); toast({ description: 'Stock order draft saved.' }); }
    catch (e) { toast({ title: 'Could not save the draft', description: errorMessage(e), variant: 'destructive' }); }
  };
  const submit = async () => {
    if (busy) return;
    try {
      const row = await persist();
      await release.mutateAsync({ id: row.submission_id });
      toast({ title: 'Sent to the lab queue', description: 'The stock order is queued for Innovations.' });
      submissionId.current = undefined;
      setLines([]); setReference(''); setPoNumber(''); setInstructions(''); setDialog(null);
    } catch (e) { toast({ title: 'Could not submit the order', description: errorMessage(e), variant: 'destructive' }); }
  };
  const review = () => {
    try { validate(); setDialog('review'); }
    catch (e) { toast({ description: errorMessage(e), variant: 'destructive' }); }
  };
  const scan = async (scannedCode = scanValue): Promise<boolean> => {
    if (accountId == null || scanInFlight.current || busy) return false;
    const code = scannedCode.trim();
    if (!code || !/^[a-z0-9._/-]+$/i.test(code)) { setScanMessage('Enter a valid SKU / OPC.'); return false; }
    scanInFlight.current = true;
    const session = scanSession.current;
    setScanning(true); setScanMessage('');
    try {
      const direct = supplies.find(p => p.sku === code && !p.has_variants);
      let added: boolean;
      if (direct) added = add(direct, null);
      else {
        const resolved = await resolveStockCode(code);
        if (session !== scanSession.current) return false;
        const product = resolved && catalog.find(p => p.product_type === resolved.productType && p.product_id === resolved.productId);
        if (!resolved || !product) throw new Error('This code is not offered on the selected account’s catalog.');
        if (resolved.isChiral && resolved.side === 'either') throw new Error('Scan the eye-specific OPC for this lens, or select its eye in the lens browser.');
        added = add(product, { id: resolved.variantId, title: resolved.variantTitle, sku: code, opc_code: code, attributes: {}, metadata: {}, stock_qty: 0 }, 1, resolved.side);
      }
      if (!added) { setScanMessage('The item could not be added: line limit reached.'); return false; }
      setScanValue(''); setScanMessage('Item added.');
      changeDialog(null);
      return true;
    } catch (e) { if (session === scanSession.current) setScanMessage(errorMessage(e)); return false; }
    finally { scanInFlight.current = false; setScanning(false); }
  };
  const scanInput = <Input aria-label="Scan SKU or OPC" value={scanValue} onChange={e => setScanValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); void scan(); } }} placeholder="Scan SKU / OPC, then Enter…" autoComplete="off" disabled={scanning || busy} />;
  const lineTable = <div className="overflow-auto"><table className="stock-entry-table"><thead><tr><th>#</th><th>SKU / OPC</th><th>Description</th><th>Line ref.</th><th>Qty</th><th>Unit price</th><th>Subtotal</th><th /></tr></thead><tbody>{lines.map((l, i) => <tr key={l.key}><td>{i + 1}</td><td className="font-mono text-[10px]">{stockLineSku(l) || '—'}</td><td><b className="font-semibold">{l.product.name}</b><small className="block text-muted-foreground">{l.variant?.title}{l.product.product_type === 'lens' ? ` · ${l.side === 'pair' ? 'Pair' : l.side === 'either' ? 'Single lens' : l.side === 'right' ? 'Right only' : 'Left only'}` : l.product.product_type === 'addon' ? ' · Service' : ''}</small></td><td><Input aria-label={`Line ${i + 1} reference`} value={l.customerRef} onChange={e => patch(l.key, { customerRef: e.target.value })} placeholder="Optional" className="w-24" disabled={busy} /></td><td><Input aria-label={`Line ${i + 1} quantity`} type="number" min={1} max={stockLineLimit(l)} step={1} value={l.quantity} onChange={e => patch(l.key, { quantity: Math.max(1, Math.min(stockLineLimit(l), Math.floor(Number(e.target.value) || 1))) })} className="w-16" disabled={busy} /></td><td className="whitespace-nowrap">{money(stockLinePrice(l))}<small className="block text-muted-foreground">per {l.product.product_type === 'lens' ? l.side === 'pair' ? 'pair' : 'lens' : 'item'}</small></td><td className="whitespace-nowrap font-semibold">{money(stockLinePrice(l) * l.quantity)}</td><td><Button type="button" size="icon" variant="ghost" aria-label={`Remove line ${i + 1}`} className="h-7 w-7" disabled={busy} onClick={() => setLines(previous => previous.filter(x => x.key !== l.key))}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>)}{!lines.length && <tr><td colSpan={8} className="stock-entry-empty"><PackagePlus className="mx-auto mb-3 h-6 w-6 text-secondary" /><b className="block text-foreground">Your order starts here</b><p className="mt-2">Choose supplies, service items, stock lenses, or scan a barcode.</p></td></tr>}</tbody></table></div>;

  return <div className="stock-entry space-y-3" data-testid="stock-service-panel">
    <section className="stock-entry-card" aria-label="Order identification"><fieldset disabled={busy} className="grid gap-4 md:grid-cols-[1.15fr_.85fr_1.6fr]"><label className="stock-entry-label" htmlFor="stock-reference">Patient / order reference <span className="text-destructive">*</span><Input id="stock-reference" value={reference} maxLength={20} required placeholder="Patient name or reference" onChange={e => setReference(e.target.value)} /></label><label className="stock-entry-label" htmlFor="stock-po">PO number <span className="stock-entry-optional">(optional)</span><Input id="stock-po" value={poNumber} maxLength={15} placeholder="Purchase order number" onChange={e => setPoNumber(e.target.value)} /></label><label className="stock-entry-label" htmlFor="stock-instructions">Special instructions <span className="stock-entry-optional">(optional)</span><Textarea id="stock-instructions" value={instructions} placeholder="Anything we should know?" className="h-9 min-h-9 resize-y" onChange={e => setInstructions(e.target.value)} /></label></fieldset></section>
    <section className="stock-entry-card"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Order lines</h2><p className="mt-1 text-[11px] text-muted-foreground">Browse your account’s items, or scan an SKU / OPC.</p></div><div className="flex flex-wrap gap-2">{supplies.length > 0 && <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setDialog('items')}><PackagePlus className="mr-1.5 h-3.5 w-3.5" />Add supplies{catalog.some(p => p.product_type === 'addon') ? ' / services' : ''}</Button>}{lenses.length > 0 && <Button type="button" size="sm" disabled={busy} onClick={() => setDialog('lenses')}>Add stock lenses</Button>}</div></div>
      {isLoading && <p className="mb-3 text-xs text-muted-foreground">Loading account catalog…</p>}{error && <p role="alert" className="mb-3 text-xs text-destructive">The account catalog could not be loaded. Try reselecting the account.</p>}{!isLoading && !error && !catalog.length && <p className="mb-3 text-xs text-muted-foreground">{accountId == null ? 'Choose an account to see available items.' : 'No stock lenses, supplies or service items are offered on this account’s pricelist.'}</p>}
      {lineTable}<div className="mt-1 flex flex-wrap items-center gap-2 border-b py-3"><Button type="button" variant="outline" size="sm" disabled={busy || !catalog.length} onClick={() => { setScanMessage(''); changeDialog('scanner'); }}><ScanLine className="mr-1.5 h-3.5 w-3.5" />Scan</Button><div className="w-64 max-w-full">{dialog !== 'scanner' && scanInput}</div></div>{dialog !== 'scanner' && scanMessage && <p role="status" className="mt-2 text-xs text-muted-foreground">{scanMessage}</p>}
      <div className="mt-4 flex items-center justify-between gap-4"><div><div className="font-mono text-[10px] uppercase text-muted-foreground">Checkout estimate · BBD</div><small className="text-[11px] text-muted-foreground">{lines.reduce((n, l) => n + l.quantity, 0)} selling units · account prices · tax excluded</small></div><b className="text-xl font-semibold">{money(total)}</b></div>
    </section>
    <section className="stock-entry-card flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-sm font-semibold">Ready when you are</h2><p className="mt-1 text-[11px] text-muted-foreground">Prices are rechecked when saved and submitted.</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={busy || !reference.trim() || !lines.length || accountId == null} onClick={() => void saveDraft()}>Save draft</Button><Button type="button" size="sm" disabled={busy || !reference.trim() || !lines.length || accountId == null} onClick={review}>Review order →</Button></div></section>
    <Dialog open={dialog !== null} onOpenChange={open => !open && changeDialog(null)}><DialogContent className="stock-entry-dialog flex max-h-[88dvh] w-[min(980px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0"><DialogHeader className="border-b px-5 pb-4 pt-5 text-left"><DialogTitle className="text-base">{dialog === 'items' ? 'Supplies & service items' : dialog === 'lenses' ? 'Choose lenses & powers' : dialog === 'scanner' ? 'Scan an item' : 'Review stock order'}</DialogTitle><DialogDescription className="text-xs">{dialog === 'review' ? `Reference: ${reference} · ${accountName}` : `Published, account-priced items for ${accountName || 'the selected account'}.`}</DialogDescription></DialogHeader><div className="min-h-0 overflow-y-auto p-5">{dialog === 'items' && <StockItemBrowser products={supplies} money={money} onAdd={(p, v) => add(p, v)} />}{dialog === 'lenses' && accountId != null && <StockLensBrowser accountId={accountId} products={lenses} money={money} onAdd={add} onDone={() => setDialog(null)} />}{dialog === 'scanner' && <div className="mx-auto max-w-lg space-y-4"><>{useCamera ? <StockCameraScanner onScan={scan} /> : <div className="stock-scan-target"><ScanLine className="h-5 w-5" /><span>Scan the barcode with your USB / handheld scanner</span></div>}</>{scanInput}<p className="text-xs text-muted-foreground">{useCamera ? 'SKU / OPC' : 'Scan or enter SKU / OPC'}</p>{scanMessage && <p role="status" className="text-xs">{scanMessage}</p>}<Button type="button" size="sm" disabled={scanning || !scanValue.trim()} onClick={() => void scan()}>{scanning ? 'Looking up…' : 'Add scanned item'}</Button></div>}{dialog === 'review' && <div className="space-y-3"><p className="text-xs"><b>Patient / order reference:</b> {reference}</p>{poNumber && <p className="text-xs"><b>PO:</b> {poNumber}</p>}{instructions && <p className="whitespace-pre-wrap text-xs"><b>Special instructions:</b> {instructions}</p>}<ul className="divide-y text-xs">{lines.map(l => <li key={l.key} className="flex justify-between gap-4 py-2"><span>{l.product.name} {l.variant?.title} · {l.side === 'pair' ? 'Pair' : l.side} × {l.quantity}</span><b>{money(stockLinePrice(l) * l.quantity)}</b></li>)}</ul><p className="text-right text-sm font-semibold">Estimate {money(total)}</p><p className="text-xs text-muted-foreground">Submitting saves this order and releases it to the Innovations queue.</p></div>}</div><div className="flex items-center justify-end gap-2 border-t px-5 py-3"><Button type="button" variant="outline" size="sm" onClick={() => changeDialog(null)} disabled={busy}> {dialog === 'review' ? 'Back to order' : 'Done'}</Button>{dialog === 'review' && <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit stock order'}</Button>}</div></DialogContent></Dialog>
  </div>;
}
