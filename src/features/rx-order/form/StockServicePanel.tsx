// Stock / supplies and service-request orders, inside the Rx order form. It is a
// compact front end for the stock order path: items come from the account's
// stock catalog, are staged with save_stock_order_draft and released through
// OptiLens exactly like /admin/orders/stock-orders. Prices are resolved by the
// server; nothing here sends one.
import { useMemo, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useReleaseStockOrder, useStageStockOrder, useStockOrderCatalog, useStockProductVariants, variantIsChiral,
  type StageOrderItem, type StockCatalogItem, type StockVariant,
} from "@/hooks/useStockOrderBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SERVICE_REQUEST_TAG, stageFor, type OrderType } from "./orderType";

type Side = StageOrderItem["side"];
interface Line {
  key: string; productType: StageOrderItem["product_type"]; productId: string; productName: string;
  variantId: string | null; variantTitle: string; side: Side; quantity: number; customerRef: string;
}

function VariantPicker({ product, onAdd }: { product: StockCatalogItem; onAdd: (v: StockVariant | null) => void }) {
  const { data: variants = [], isLoading } = useStockProductVariants(product.has_variants ? product.product_type : null, product.has_variants ? product.product_id : null);
  const [filter, setFilter] = useState("");
  if (!product.has_variants) {
    return <Button type="button" size="sm" onClick={() => onAdd(null)}>Add {product.name}</Button>;
  }
  const shown = variants.filter((v) => v.title.toLowerCase().includes(filter.toLowerCase())).slice(0, 40);
  return (
    <div className="space-y-2">
      <Input aria-label="Filter variants" placeholder="Filter variants (power, add, colour)…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {isLoading && <p className="text-xs text-muted-foreground">Loading variants…</p>}
      <ul className="max-h-56 divide-y overflow-auto rounded-md border">
        {shown.map((v) => (
          <li key={v.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
            <span className="min-w-0 flex-1 truncate">{v.title}</span>
            <span className="text-muted-foreground">stock {v.stock_qty}</span>
            <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => onAdd(v)}>Add</Button>
          </li>
        ))}
        {!isLoading && !shown.length && <li className="px-3 py-2 text-xs text-muted-foreground">No variants match.</li>}
      </ul>
    </div>
  );
}

export function StockServicePanel({ type, accountId, accountName }: {
  type: Exclude<OrderType, "rx">; accountId: number | null; accountName: string;
}) {
  const { toast } = useToast();
  const { data: catalog = [], isLoading: catalogLoading } = useStockOrderCatalog(accountId);
  const stage = useStageStockOrder();
  const release = useReleaseStockOrder();
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<StockCatalogItem | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [poNumber, setPoNumber] = useState("");
  const [reference, setReference] = useState("");
  const [instructions, setInstructions] = useState("");
  const submissionId = useRef<string | undefined>(undefined);
  const service = type === "service";

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.sku ?? "").toLowerCase().includes(q)).slice(0, 30);
  }, [catalog, search]);

  const addLine = (p: StockCatalogItem, v: StockVariant | null) => {
    const side: Side = v && variantIsChiral(v) ? "right" : "either";
    setLines((ls) => [...ls, {
      key: `${Date.now()}-${ls.length}`, productType: p.product_type, productId: p.product_id, productName: p.name,
      variantId: v?.id ?? null, variantTitle: v?.title ?? "", side, quantity: 1, customerRef: "",
    }]);
  };
  const patch = (key: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const persist = async () => {
    if (accountId == null) throw new Error("Choose an account first.");
    const staged = stageFor(type, {
      instructions,
      items: lines.map((l) => ({
        product_type: l.productType, product_id: l.productId, variant_id: l.variantId, side: l.side,
        quantity: l.quantity, customer_ref: l.customerRef,
      })),
    });
    const row = await stage.mutateAsync({
      submissionId: submissionId.current, accountId, poNumber, orderReference: reference,
      instructions: staged.instructions, items: staged.items,
    });
    submissionId.current = row.submission_id;
    return row;
  };

  const saveDraft = async () => {
    try { await persist(); toast({ description: "Draft saved" }); }
    catch (e: any) { toast({ title: "Could not save the draft", description: e?.message, variant: "destructive" }); }
  };

  const submit = async () => {
    try {
      const row = await persist();
      await release.mutateAsync({ id: row.submission_id });
      toast({ title: "Sent to the lab queue", description: "OptiLens will drop the file into Innova's Incoming folder shortly." });
      submissionId.current = undefined;
      setLines([]); setPoNumber(""); setReference(""); setInstructions(""); setProduct(null);
    } catch (e: any) {
      toast({ title: "Could not submit the order", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const busy = stage.isPending || release.isPending;

  return (
    <div className="space-y-4" data-testid="stock-service-panel">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">{service ? "Service request order" : "Stock / supplies order"} <span className="font-normal text-muted-foreground">for {accountName || "—"}</span></h2>
        {service && (
          <p className="mt-1 text-xs text-muted-foreground">
            Name the items this request is about. It goes to the lab as a stock order marked <b>{SERVICE_REQUEST_TAG}</b> on the order and on every item.
          </p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input aria-label="PO number" placeholder="PO number" value={poNumber} onChange={(e) => setPoNumber(e.target.value.toUpperCase())} />
          <Input aria-label="Order reference" placeholder="Order reference" value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} />
        </div>
        <Textarea className="mt-2" aria-label="Instructions" placeholder="Instructions (optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Add items</h3>
        {accountId == null ? (
          <p className="mt-2 text-xs text-muted-foreground">Choose the account above to see what it can order.</p>
        ) : catalogLoading ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the catalog…</p>
        ) : !catalog.length ? (
          <p className="mt-2 text-xs text-muted-foreground">This account has no stock catalog (no assigned pricelist covering published stock items).</p>
        ) : (
          <div className="mt-2 space-y-2">
            <Input aria-label="Search items" placeholder="Search by name or SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setProduct(null); }} />
            {!product ? (
              <ul className="max-h-56 divide-y overflow-auto rounded-md border">
                {results.map((c) => (
                  <li key={`${c.product_type}:${c.product_id}`}>
                    <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted" onClick={() => setProduct(c)}>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="text-muted-foreground">{c.product_type}</span>
                    </button>
                  </li>
                ))}
                {!results.length && <li className="px-3 py-2 text-xs text-muted-foreground">Nothing matches.</li>}
              </ul>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <b className="min-w-0 flex-1 truncate">{product.name}</b>
                  <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setProduct(null)}>Change item</Button>
                </div>
                <VariantPicker product={product} onAdd={(v) => addLine(product, v)} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Order lines ({lines.length})</h3>
        {!lines.length ? <p className="mt-2 text-xs text-muted-foreground">Nothing added yet.</p> : (
          <ul className="mt-2 divide-y">
            {lines.map((l) => (
              <li key={l.key} className="grid items-center gap-2 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_88px_88px_minmax(0,160px)_32px]">
                <span className="min-w-0 truncate">{l.productName}{l.variantTitle ? ` — ${l.variantTitle}` : ""}</span>
                <select aria-label="Side" className="h-8 rounded-md border bg-background px-1" value={l.side} onChange={(e) => patch(l.key, { side: e.target.value as Side })}>
                  <option value="either">Either</option><option value="right">Right</option><option value="left">Left</option>
                </select>
                <Input aria-label="Quantity" type="number" min={1} className="h-8" value={l.quantity} onChange={(e) => patch(l.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                <Input aria-label="Item note" className="h-8" placeholder="Note" value={l.customerRef} onChange={(e) => patch(l.key, { customerRef: e.target.value })} />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={!lines.length || busy || accountId == null} onClick={submit}>
            {busy ? "Working…" : service ? "Submit service request" : "Submit stock order"}
          </Button>
          <Button type="button" variant="outline" disabled={!lines.length || busy || accountId == null} onClick={saveDraft}>Save draft</Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Prices come from the account's pricelist when the order is saved and again when it is released.</p>
      </div>
    </div>
  );
}
