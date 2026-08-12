import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Barcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "@/features/rx-order/embed/rx-order.css";
import "./stock-order-builder.css";
import {
  useStockEligibleAccounts, useStockOrderCatalog, useStockProductVariants, resolveStockCode,
  useStageStockOrder, useReleaseStockOrder, useStockOrderDraft, useStockOrderPreview,
  variantSkuFor, variantIsChiral,
  type StageOrderItem, type StockCatalogItem, type StockProductType, type StockVariant,
  type DispatchProvider,
} from "@/hooks/useStockOrderBuilder";

// Stock Order Builder (/admin/website/stock-orders) — staff tool for
// building SKU-identified stock orders and releasing them to Innova.
//
// It sells what the website sells: the published store items and their
// variants (Russell, 2026-08-12). Catalog and prices come from
// get_stock_order_catalog (the account's assigned pricelist, 'stock'
// section); variants come from the storefront's own reader, so this form and
// /store/product/* always show the same thing.
//
// Released orders go out through either transport — OptiLens (the
// optilens-local worker drops the file into Innova's Incoming share) or
// Gatekeeper (sent immediately by the Edge Function) — and both render the
// same order from supabase/functions/_shared/orders/hashref.ts. The preview
// pane below asks the server for that exact text rather than approximating
// it here.
//
// NOT tested against a live app/database this session. The migrations this
// depends on (20260811000000, 20260812000000) have not been run.

interface OrderLine {
  key: string;
  productType: StockProductType;
  productId: string;
  productName: string;
  variantId: string | null;
  variantTitle: string;
  side: "right" | "left" | "either";
  sku: string;
  description: string;
  quantity: number;
  customerRef: string;
  unitPrice: number;
}

type AnnotationPriority = "must" | "prefer" | "idea";

interface StockOrderAnnotation {
  id: string;
  label: string;
  text: string;
  priority: AnnotationPriority;
  createdAt: string;
}

const STOCK_ANNOTATIONS_KEY = "cv-stock-order-annotations";

const readStockAnnotations = (): StockOrderAnnotation[] => {
  try {
    return JSON.parse(localStorage.getItem(STOCK_ANNOTATIONS_KEY) ?? "[]") as StockOrderAnnotation[];
  } catch {
    return [];
  }
};

const annotationPriorityLabel = (priority: AnnotationPriority) => {
  if (priority === "must") return "Must change";
  if (priority === "idea") return "Idea";
  return "I'd prefer";
};

const PRODUCT_TYPE_LABEL: Record<StockProductType, string> = {
  lens: "Lens",
  supply: "Supply",
  addon: "Service",
};

const numericAttr = (variant: StockVariant, key: string): number | null => {
  const value = (variant.attributes as any)?.[key];
  return value == null || value === "" || Number.isNaN(Number(value)) ? null : Number(value);
};

/** Lens variants imported from Lens Local carry sphere/cylinder attributes, so
 *  they can be laid out as the power matrix staff are used to. Anything else
 *  (supplies, services, hand-built variants) lists instead. */
const hasPowerAxes = (variants: StockVariant[]) =>
  variants.length > 0 && variants.every((v) => numericAttr(v, "sphere") != null && numericAttr(v, "cylinder") != null);

const StockOrderBuilderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [accountId, setAccountId] = useState<number | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [instructions, setInstructions] = useState("");
  const [mode, setMode] = useState<"search" | "scan" | "grid">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProductKey, setExpandedProductKey] = useState<string | null>(null);
  const [gridProductKey, setGridProductKey] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [staged, setStaged] = useState<{ id: string; total: number } | null>(null);
  const [provider, setProvider] = useState<DispatchProvider>("innovations");
  const [showPreview, setShowPreview] = useState(false);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);
  const [annotateOn, setAnnotateOn] = useState(false);
  const [annotations, setAnnotations] = useState<StockOrderAnnotation[]>(readStockAnnotations);
  const [annotationTarget, setAnnotationTarget] = useState<{ label: string; rect: DOMRect } | null>(null);
  const [annotationText, setAnnotationText] = useState("");
  const [annotationPriority, setAnnotationPriority] = useState<AnnotationPriority>("prefer");
  const [showAnnotations, setShowAnnotations] = useState(false);

  const { data: eligibleAccounts = [], isLoading: accountsLoading } = useStockEligibleAccounts();
  const draftId = searchParams.get("draft");
  const { data: draft } = useStockOrderDraft(draftId);
  const selectedAccount = eligibleAccounts.find((a) => a.id === accountId) ?? null;

  const { data: catalog = [], isLoading: catalogLoading } = useStockOrderCatalog(accountId);
  const productKey = (item: Pick<StockCatalogItem, "product_type" | "product_id">) =>
    `${item.product_type}:${item.product_id}`;
  const byKey = useMemo(
    () => new Map(catalog.map((item) => [productKey(item), item])),
    [catalog],
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog.slice(0, 25);
    return catalog.filter((item) =>
      [item.name, item.category, item.sku, PRODUCT_TYPE_LABEL[item.product_type]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [catalog, searchQuery]);

  const expandedProduct = expandedProductKey ? byKey.get(expandedProductKey) ?? null : null;
  const gridProduct = gridProductKey ? byKey.get(gridProductKey) ?? null : null;
  const { data: expandedVariants = [] } = useStockProductVariants(
    expandedProduct?.product_type ?? null, expandedProduct?.product_id ?? null,
  );
  const { data: gridVariants = [] } = useStockProductVariants(
    gridProduct?.product_type ?? null, gridProduct?.product_id ?? null,
  );

  const stageMutation = useStageStockOrder();
  const releaseMutation = useReleaseStockOrder();
  const preview = useStockOrderPreview(staged?.id ?? null, showPreview);
  const retailAccount = useMemo(
    () => eligibleAccounts.find((a) => a.name.trim().toLowerCase() === "retail") ?? null,
    [eligibleAccounts],
  );

  useEffect(() => {
    if (!draftId && accountId == null && retailAccount) setAccountId(retailAccount.id);
  }, [accountId, draftId, retailAccount]);

  useEffect(() => {
    try { localStorage.setItem(STOCK_ANNOTATIONS_KEY, JSON.stringify(annotations)); } catch { /* optional persistence */ }
  }, [annotations]);

  useEffect(() => {
    if (!draft || loadedDraftId === draft.id) return;
    const payload = draft.payload ?? {};
    const account = payload.account;
    setAccountId(draft.account_id ?? account?.id ?? null);
    setPoNumber(draft.po_number ?? payload.po_number ?? "");
    setOrderReference(draft.order_reference ?? payload.order_reference ?? "");
    setInstructions(payload.instructions ?? "");
    setProvider(draft.dispatch_provider ?? "innovations");
    setLines((payload.items ?? []).map((item, index) => ({
      key: `${draft.id}:${item.variant_id ?? item.product_id ?? index}:${item.side ?? "either"}`,
      productType: (item.product_type ?? "lens") as StockProductType,
      productId: item.product_id ?? "",
      productName: item.description ?? "Stock item",
      variantId: item.variant_id ?? null,
      variantTitle: "",
      side: item.side ?? "either",
      sku: item.sku ?? "",
      description: item.description ?? item.sku ?? "Stock item",
      quantity: Number(item.quantity ?? 1),
      customerRef: item.comment ?? "",
      unitPrice: Number(item.unit_price ?? 0),
    })));
    setStaged({ id: draft.id, total: Number(payload.order_total ?? 0) });
    setLoadedDraftId(draft.id);
  }, [draft, loadedDraftId]);

  const addLine = (
    product: StockCatalogItem,
    variant: StockVariant | null,
    side: "right" | "left" | "either",
    quantity: number,
  ) => {
    const sku = variant ? variantSkuFor(variant, side) : product.sku;
    if (!sku) {
      toast({
        title: "No Innova code for that item",
        description: "Add its OPC code to the website variant before ordering it.",
        variant: "destructive",
      });
      return;
    }
    const key = `${product.product_type}:${product.product_id}:${variant?.id ?? "base"}:${side}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l));
      const variantTitle = variant?.title ?? "";
      return [...prev, {
        key,
        productType: product.product_type,
        productId: product.product_id,
        productName: product.name,
        variantId: variant?.id ?? null,
        variantTitle,
        side,
        sku,
        description: [product.name, variantTitle, side !== "either" ? side : null].filter(Boolean).join(" "),
        quantity,
        customerRef: "",
        unitPrice: product.unit_price,
      }];
    });
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));
  const updateLine = (key: string, patch: Partial<OrderLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const handleScan = async () => {
    const code = scanValue.trim();
    if (!code) return;
    try {
      const resolved = await resolveStockCode(code);
      if (!resolved) {
        setScanFeedback({ ok: false, message: `No website item is published with code ${code}.` });
        return;
      }
      const product = byKey.get(`${resolved.productType}:${resolved.productId}`);
      if (!product) {
        setScanFeedback({
          ok: false,
          message: `${resolved.variantTitle} is not priced on ${selectedAccount?.name ?? "this account"}'s pricelist.`,
        });
        return;
      }
      addLine(
        product,
        { id: resolved.variantId, title: resolved.variantTitle, sku: null, opc_code: code, attributes: {}, metadata: {}, stock_qty: 0 },
        resolved.side,
        1,
      );
      setScanFeedback({ ok: true, message: `Added ${product.name} ${resolved.variantTitle}.` });
      setScanValue("");
    } catch (err: any) {
      setScanFeedback({ ok: false, message: err.message ?? "Lookup failed." });
    }
  };

  const buildStageItems = (): StageOrderItem[] =>
    lines.map((l) => ({
      product_type: l.productType,
      product_id: l.productId,
      variant_id: l.variantId,
      side: l.side,
      quantity: l.quantity,
      customer_ref: l.customerRef,
    }));

  const handleStage = async () => {
    if (!accountId) return;
    try {
      const result = await stageMutation.mutateAsync({
        accountId, poNumber, orderReference, instructions, items: buildStageItems(),
      });
      setStaged({ id: result.submission_id, total: result.order_total });
      toast({ title: "Order staged", description: `Total $${result.order_total.toFixed(2)}` });
    } catch (err: any) {
      toast({ title: "Could not stage order", description: err.message, variant: "destructive" });
    }
  };

  const handleRelease = async () => {
    if (!staged) return;
    try {
      await releaseMutation.mutateAsync({ id: staged.id, provider });
      toast({
        title: "Released",
        description: provider === "gatekeeper"
          ? "Gatekeeper accepted the order and its receipt is on the submission."
          : "optilens-local will drop the file into Innova's Incoming folder shortly.",
      });
      setLines([]);
      setStaged(null);
    } catch (err: any) {
      toast({ title: "Could not release order", description: err.message, variant: "destructive" });
    }
  };

  const handleAnnotationCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!annotateOn) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-annotation-ui]")) return;
    event.preventDefault();
    event.stopPropagation();
    const element = target.closest<HTMLElement>("[data-annotatable]") ?? target;
    const fieldLabel = element.closest(".field")?.querySelector("label")?.textContent?.replace(/\s+/g, " ").trim();
    const label = (element.getAttribute("aria-label") || fieldLabel || element.textContent || element.getAttribute("title") || "Stock order form")
      .replace(/\s+/g, " ").trim().slice(0, 80);
    setAnnotationTarget({ label: label || "Stock order form", rect: element.getBoundingClientRect() });
    setAnnotationText("");
    setAnnotationPriority("prefer");
  };

  const saveAnnotation = () => {
    const text = annotationText.trim();
    if (!text) {
      toast({ title: "Add a note before saving", variant: "destructive" });
      return;
    }
    setAnnotations((current) => [...current, {
      id: `stock-${Date.now().toString(36)}`,
      label: annotationTarget?.label ?? "General note",
      text,
      priority: annotationPriority,
      createdAt: new Date().toISOString(),
    }]);
    setAnnotationTarget(null);
    setAnnotationText("");
    toast({ title: "Note saved" });
  };

  const downloadAnnotations = () => {
    if (!annotations.length) return;
    const markdown = [
      "# Stock order form — reviewer feedback", "",
      `Captured ${new Date().toLocaleString()} · ${annotations.length} notes`, "",
      ...annotations.map((note, index) => `## ${index + 1}. ${annotationPriorityLabel(note.priority)} — ${note.label}\n\n${note.text}\n`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "stock-order-form-FEEDBACK.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const previewText = !staged
    ? "Save the draft to see the order file this will send."
    : preview.isLoading
      ? "Rendering…"
      : preview.error
        ? `Could not render the order: ${(preview.error as Error).message}`
        : preview.data?.hashref ?? "";

  return (
    <div className={`cv-rx-embed no-gear stock-order-shell${annotateOn ? " stock-annotate-on" : ""}`} onClickCapture={handleAnnotationCapture}>
      <div className="flex items-center gap-2 px-4 pt-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate("/admin/website/quotations")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </div>

       <div className="wrap">
          <div className="pagehead" data-annotatable>
           <div className="stock-order-heading">
             <div className="stock-order-title-row">
             <h1>Stock order form</h1>
             <div className="stock-order-toolbar" data-annotation-ui>
               <span className="ordno"><span>Order</span> {staged?.id ? staged.id.slice(0, 8).toUpperCase() : "—"}</span>
               <button className="btn btn-ghost btn-sm" disabled={!lines.length || !accountId || stageMutation.isPending} onClick={handleStage}>
                 {stageMutation.isPending ? "Saving…" : "Save draft"}
               </button>
               <label className="stock-order-account" title="Customer account">
                 <span className="stock-order-account-dot" />
                 <span>Ordering for</span>
                 <select aria-label="Customer account" value={accountId ?? ""} disabled={accountsLoading} onChange={(e) => { setAccountId(e.target.value ? Number(e.target.value) : null); setLines([]); setStaged(null); }}>
                   <option value="">{accountsLoading ? "Loading…" : "Select account"}</option>
                   {eligibleAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
                 <span className="stock-order-chevron">▾</span>
               </label>
               <label className="stock-order-currency" title="Display currency">
                 <span>USD $</span><span className="stock-order-chevron">▾</span>
               </label>
               <button className="iconbtn" type="button" title="Annotate improvements" aria-label="Annotate improvements" onClick={() => setAnnotateOn((current) => !current)}>✎</button>
             </div>
             </div>
             <p>Search, scan, or fill a power grid to order the items published on the website.</p>
           </div>
        </div>

        <div className="card reveal" style={{ gridColumn: "1/-1" }} data-annotatable>
          <div className="card-h">
            <span className="idx">1</span>
            <div>
              <h2>Order details</h2>
              <div className="sub">Retail is the temporary default while stock pricelists are being corrected.</div>
            </div>
          </div>
          <div className="card-b">
            <div className="grid stock-order-details-grid">
              <div className="field">
                <label>PO number <span className="opt-tag">optional</span></label>
                <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="Optional" />
              </div>
              <div className="field">
                <label>Order reference</label>
                <input value={orderReference} onChange={(e) => setOrderReference(e.target.value)} placeholder="e.g. counter sale, phone order" />
              </div>
            </div>
          </div>
        </div>

        <div className="card reveal" style={{ gridColumn: "1/-1", opacity: accountId ? 1 : 0.45, pointerEvents: accountId ? "auto" : "none" }} data-annotatable>
          <div className="card-h">
            <span className="idx">2</span>
            <div>
              <h2>Add items</h2>
              <div className="sub">
                {selectedAccount
                  ? `Website items priced on ${selectedAccount.name}'s pricelist.`
                  : "Select a customer account first."}
              </div>
            </div>
          </div>
          <div className="card-b">
            <div className="seg" style={{ marginBottom: 16 }}>
              <button aria-pressed={mode === "search"} onClick={() => setMode("search")}>Search and select</button>
              <button aria-pressed={mode === "scan"} onClick={() => setMode("scan")}>Scan to add</button>
              <button aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>Grid entry</button>
            </div>

            {mode === "search" && (
              <div>
                <input
                  placeholder="Search product name, category, or SKU"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <div className="rxwrap">
                  {searchResults.map((item) => {
                    const key = productKey(item);
                    const isExpanded = expandedProductKey === key;
                    return (
                      <div key={key} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
                          onClick={() => setExpandedProductKey(isExpanded ? null : key)}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}</div>
                            <div className="hint">{[item.category, item.sku].filter(Boolean).join(" · ")}</div>
                          </div>
                          <span className="tchip">{PRODUCT_TYPE_LABEL[item.product_type]}</span>
                          <span style={{ fontWeight: 600, fontSize: 12.5 }}>${item.unit_price.toFixed(2)}</span>
                        </div>
                        {isExpanded && (
                          <VariantPicker
                            product={item}
                            variants={expandedVariants}
                            onAdd={(variant, side, qty) => addLine(item, variant, side, qty)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {!searchResults.length && (
                    <div className="hint">
                      {catalogLoading
                        ? "Loading the website catalog…"
                        : "No published website item matches that search on this account's pricelist."}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === "scan" && (
              <div>
                <div className="drop">
                  <Barcode className="di" style={{ width: 26, height: 26, margin: "0 auto" }} />
                  <div className="dt">Scan or type a code, then press Enter</div>
                  <div className="ds">Resolves to one website variant and side — priced and added directly.</div>
                  <input
                    autoFocus value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }}
                    placeholder="0011751138"
                    style={{ marginTop: 12, maxWidth: 260, textAlign: "center" }}
                  />
                </div>
                {scanFeedback && (
                  <div className={`callout${scanFeedback.ok ? "" : " gold"}`} style={{ marginTop: 12 }}>
                    {scanFeedback.message}
                  </div>
                )}
              </div>
            )}

            {mode === "grid" && (
              <div>
                <div className="field" style={{ maxWidth: 360, marginBottom: 12 }}>
                  <label>Product</label>
                  <select value={gridProductKey ?? ""} onChange={(e) => setGridProductKey(e.target.value || null)}>
                    <option value="">Select a product</option>
                    {catalog.filter((item) => item.has_variants).map((item) => (
                      <option key={productKey(item)} value={productKey(item)}>
                        {item.name} ({PRODUCT_TYPE_LABEL[item.product_type]})
                      </option>
                    ))}
                  </select>
                </div>
                {gridProduct && (
                  <VariantPicker
                    product={gridProduct}
                    variants={gridVariants}
                    onAdd={(variant, side, qty) => addLine(gridProduct, variant, side, qty)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card reveal" style={{ gridColumn: "1/-1" }} data-annotatable>
          <div className="card-h">
            <span className="idx">3</span>
            <div>
              <h2>Order lines</h2>
              <div className="sub">Ref carries through to the lab on each line.</div>
            </div>
            <div className="hx" style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted-fg)" }}>{lines.length} items</div>
          </div>
          <div className="card-b">
            {lines.map((line) => (
              <div key={line.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr 120px 70px 70px 90px auto", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                <span className="tchip">{PRODUCT_TYPE_LABEL[line.productType]}</span>
                <span>{line.sku} · {line.description}</span>
                <input placeholder="Ref" value={line.customerRef} onChange={(e) => updateLine(line.key, { customerRef: e.target.value })} style={{ height: 32 }} />
                <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} style={{ height: 32, textAlign: "center" }} />
                <span style={{ color: "var(--muted-fg)" }}>${line.unitPrice.toFixed(2)}</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>${(line.unitPrice * line.quantity).toFixed(2)}</span>
                <button className="iconbtn sm" aria-label="Remove line" onClick={() => removeLine(line.key)}>×</button>
              </div>
            ))}
            {!lines.length && <div className="hint">No items added yet.</div>}
            {!!lines.length && (
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 0 4px", fontWeight: 600 }}>
                Order total: ${total.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <div className="steps" style={{ position: "static", gridColumn: "1/-1" }} data-annotatable>
          <div className="step-actions" style={{ marginLeft: 0 }}>
            <label className="stock-order-account" title="Where this order is sent">
              <span>Send via</span>
              <select aria-label="Delivery route" value={provider} onChange={(e) => setProvider(e.target.value as DispatchProvider)}>
                <option value="innovations">OptiLens</option>
                <option value="gatekeeper">Gatekeeper</option>
              </select>
              <span className="stock-order-chevron">▾</span>
            </label>
            <button className="btn btn-ghost" onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide preview" : "Preview file"}</button>
            {staged && (
              <Link className="linkbtn" to="/admin/website/quotations">View drafts</Link>
            )}
            <button className="btn btn-primary" disabled={!staged || releaseMutation.isPending} onClick={handleRelease}>
              {releaseMutation.isPending ? "Submitting…" : "Submit order"}
            </button>
          </div>
        </div>
        {showPreview && (
          <pre style={{ gridColumn: "1/-1", background: "hsl(213 30% 12%)", color: "hsl(43 25% 92%)", borderRadius: 12, padding: "14px 16px", fontSize: 11.5, overflow: "auto" }}>
            {previewText}
          </pre>
        )}

        {annotateOn && (
          <>
            {annotationTarget && <div className="stock-annotation-highlight" style={{ top: annotationTarget.rect.top, left: annotationTarget.rect.left, width: annotationTarget.rect.width, height: annotationTarget.rect.height }} />}
            <div className="stock-annotation-bar" data-annotation-ui>
              <span>Annotate mode — click anything · <b>{annotations.length}</b> notes</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAnnotationTarget(null); setShowAnnotations(true); }}>View notes</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAnnotationTarget(null); setAnnotateOn(false); }}>Exit</button>
            </div>
          </>
        )}
        {annotationTarget && (
          <div className="stock-annotation-popover" data-annotation-ui>
            <div className="stock-annotation-label">Selected element</div>
            <div className="stock-annotation-target">{annotationTarget.label}</div>
            <textarea autoFocus value={annotationText} onChange={(e) => setAnnotationText(e.target.value)} placeholder="What should be improved?" />
            <div className="stock-annotation-priorities">
              {(["must", "prefer", "idea"] as AnnotationPriority[]).map((priority) => (
                <button key={priority} type="button" aria-pressed={annotationPriority === priority} onClick={() => setAnnotationPriority(priority)}>{annotationPriorityLabel(priority)}</button>
              ))}
            </div>
            <div className="stock-annotation-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setAnnotationTarget(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveAnnotation}>Save note</button>
            </div>
          </div>
        )}
        {showAnnotations && (
          <aside className="stock-annotation-drawer" data-annotation-ui>
            <div className="stock-annotation-drawer-head"><div><h3>Your notes</h3><span>{annotations.length} notes</span></div><button className="iconbtn" onClick={() => setShowAnnotations(false)} aria-label="Close notes">×</button></div>
            <div className="stock-annotation-drawer-body">
              {!annotations.length ? <p className="stock-annotation-empty">No notes yet. Turn on Annotate mode and click anything you would like changed.</p> : annotations.map((note, index) => (
                <div className={`stock-annotation-note ${note.priority}`} key={note.id}><div><b>{index + 1}. {note.label}</b><span>{annotationPriorityLabel(note.priority)}</span></div><p>{note.text}</p></div>
              ))}
            </div>
            <div className="stock-annotation-drawer-foot"><button className="btn btn-primary btn-sm" disabled={!annotations.length} onClick={downloadAnnotations}>Download .md</button><button className="btn btn-ghost btn-sm" disabled={!annotations.length} onClick={() => setAnnotations([])}>Clear notes</button></div>
          </aside>
        )}
      </div>
    </div>
  );
};

/** Picks one of a website product's variants. Lens variants imported from
 *  Lens Local carry sphere/cylinder attributes and lay out as the familiar
 *  power matrix; every other variant set lists. A product with no variants at
 *  all is ordered by its own SKU. */
const VariantPicker = ({
  product, variants, onAdd,
}: {
  product: StockCatalogItem;
  variants: StockVariant[];
  onAdd: (variant: StockVariant | null, side: "right" | "left" | "either", qty: number) => void;
}) => {
  const [qty, setQty] = useState<Record<string, number>>({});

  const take = (id: string, variant: StockVariant | null) => {
    const n = qty[id] || 0;
    if (!n) return;
    // A chiral lens variant is two physical lenses with different codes, so a
    // pair goes on as two lines rather than one ambiguous one.
    if (variant && variantIsChiral(variant)) {
      onAdd(variant, "right", n);
      onAdd(variant, "left", n);
    } else {
      onAdd(variant, "either", n);
    }
    setQty((p) => ({ ...p, [id]: 0 }));
  };

  const quantityCell = (id: string, variant: StockVariant | null) => (
    <>
      <input
        type="number" min={0} value={qty[id] ?? ""}
        onChange={(e) => setQty((p) => ({ ...p, [id]: Math.max(0, Number(e.target.value) || 0) }))}
        style={{ width: 52 }}
      />
      <button className="iconbtn sm" style={{ marginLeft: 4 }} aria-label="Add" onClick={() => take(id, variant)}>+</button>
    </>
  );

  if (!product.has_variants) {
    return (
      <div style={{ padding: "0 4px 14px" }}>
        <div className="hint" style={{ marginBottom: 8 }}>
          No variants on the website — ordered by its own SKU at ${product.unit_price.toFixed(2)}.
        </div>
        {quantityCell(`${product.product_type}:${product.product_id}`, null)}
      </div>
    );
  }

  if (!variants.length) return <div className="hint" style={{ padding: "8px 4px" }}>Loading variants…</div>;

  if (hasPowerAxes(variants)) {
    const rowValues = [...new Set(variants.map((v) => numericAttr(v, "sphere") as number))].sort((a, b) => b - a);
    const colValues = [...new Set(variants.map((v) => numericAttr(v, "cylinder") as number))].sort((a, b) => b - a);
    const byCell = new Map<string, StockVariant>();
    variants.forEach((v) => byCell.set(`${numericAttr(v, "sphere")}:${numericAttr(v, "cylinder")}`, v));

    return (
      <div style={{ padding: "0 4px 14px" }}>
        <div className="hint" style={{ marginBottom: 8 }}>Choose power and quantity — ${product.unit_price.toFixed(2)} per cell.</div>
        <div className="rxwrap">
          <table className="rxtable">
            <thead>
              <tr>
                <th>Sphere \ Cylinder</th>
                {colValues.map((c) => <th key={c}>{c.toFixed(2)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rowValues.map((r) => (
                <tr key={r}>
                  <td><div className="eye"><b>{r.toFixed(2)}</b></div></td>
                  {colValues.map((c) => {
                    const variant = byCell.get(`${r}:${c}`);
                    if (!variant) return <td key={c}>—</td>;
                    return <td key={c}>{quantityCell(variant.id, variant)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 4px 14px" }}>
      <div className="hint" style={{ marginBottom: 8 }}>${product.unit_price.toFixed(2)} per unit.</div>
      {variants.map((variant) => (
        <div key={variant.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 0 }}>{variant.title}</span>
          <span className="hint">{variantSkuFor(variant, "either") ?? "no code"}</span>
          {quantityCell(variant.id, variant)}
        </div>
      ))}
    </div>
  );
};

export default StockOrderBuilderPage;
