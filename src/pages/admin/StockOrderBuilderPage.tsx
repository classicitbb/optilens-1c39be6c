import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CircleDollarSign, Glasses, PackagePlus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import "@/features/rx-order/embed/rx-order.css";
import "./stock-order-builder.css";
import { resolveStockOrderAnnotationTarget } from "./stock-order-annotations";
import {
  useStockEligibleAccounts, useStockOrderCatalog, useStockProductVariants, resolveStockCode,
  useStageStockOrder, useReleaseStockOrder, useSaveStockOrderAsQuote, useStockOrderDraft, useStockOrderDraftForQuote, useStockOrderPreview,
  variantSkuFor, variantIsChiral,
  type StageOrderItem, type StockCatalogItem, type StockProductType, type StockVariant,
} from "@/hooks/useStockOrderBuilder";
import { useBBDUSDRate } from "@/hooks/usePricelistVersions";

// Stock Order Builder (/admin/website/stock-orders) — staff tool for
// building SKU-identified stock orders and releasing them to Innova.
//
// It sells what the website sells: the published store items and their
// variants (Russell, 2026-08-12). Catalog and prices come from
// get_stock_order_catalog (the account's assigned pricelist, 'stock'
// section); variants come from the storefront's own reader, so this form and
// /store/product/* always show the same thing.
//
// Released orders go through OptiLens. The optilens-local worker drops the
// rendered file into Innova's Incoming share. The preview pane asks the server
// for that exact text rather than approximating it here.
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
  unitCost: number | null;
  priceSource?: StockCatalogItem["price_source"];
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
  const { canEdit } = useAdminRole();

  const [accountId, setAccountId] = useState<number | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [instructions, setInstructions] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProductKey, setExpandedProductKey] = useState<string | null>(null);
  const [gridProductKey, setGridProductKey] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [addDialog, setAddDialog] = useState<"supplies" | "lenses" | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [staged, setStaged] = useState<{ id: string; total: number } | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);
  const [annotateOn, setAnnotateOn] = useState(false);
  const [annotations, setAnnotations] = useState<StockOrderAnnotation[]>(readStockAnnotations);
  const [annotationTarget, setAnnotationTarget] = useState<{ label: string; rect: DOMRect } | null>(null);
  const [annotationText, setAnnotationText] = useState("");
  const [annotationPriority, setAnnotationPriority] = useState<AnnotationPriority>("prefer");
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "BBD">("USD");
  const orderDetailsRef = useRef<HTMLDivElement>(null);
  const detailsEditRef = useRef<HTMLButtonElement>(null);
  const poNumberRef = useRef<HTMLInputElement>(null);
  const orderReferenceRef = useRef<HTMLInputElement>(null);
  const savedSnapshotRef = useRef<string | null>(null);
  const failedSnapshotRef = useRef<string | null>(null);

  const { data: eligibleAccounts = [], isLoading: accountsLoading } = useStockEligibleAccounts();
  // Catalog prices are stored in USD; the rate is USD per 1 BBD (0.5), so a
  // BBD figure is the USD one divided by it.
  const { data: usdPerBbd = 0.5 } = useBBDUSDRate();
  const money = useMemo(() => {
    const factor = displayCurrency === "BBD" && usdPerBbd > 0 ? 1 / usdPerBbd : 1;
    const prefix = displayCurrency === "BBD" ? "BBD $" : "$";
    return (usd: number) => `${prefix}${((usd ?? 0) * factor).toFixed(2)}`;
  }, [displayCurrency, usdPerBbd]);
  const draftId = searchParams.get("draft");
  const quoteId = searchParams.get("quote");
  const { data: quotedDraft, isLoading: quotedDraftLoading } = useStockOrderDraftForQuote(quoteId);
  const effectiveDraftId = draftId ?? quotedDraft?.id ?? null;
  const { data: draft } = useStockOrderDraft(effectiveDraftId);
  const selectedAccount = eligibleAccounts.find((a) => a.id === accountId) ?? null;

  const { data: catalog = [], isLoading: catalogLoading } = useStockOrderCatalog(accountId);
  const { data: websiteProducts = [], isLoading: websiteProductsLoading } = useStoreProducts();
  const productKey = (item: Pick<StockCatalogItem, "product_type" | "product_id">) =>
    `${item.product_type}:${item.product_id}`;
  // The complete published catalogue is visible for staff, but only products
  // returned by the server resolver can be added. This makes availability
  // actionable without letting the browser bypass account pricing rules.
  const combinedCatalog = useMemo<StockCatalogItem[]>(() => {
    const resolved = new Map(catalog.map((item) => [productKey(item), { ...item, available: true }]));
    for (const product of websiteProducts) {
      const key = `${product.product_type}:${product.id}`;
      if (!resolved.has(key)) {
        resolved.set(key, {
          product_type: product.product_type,
          product_id: product.id,
          name: product.name,
          category: product.category || null,
          sku: product.sku ?? null,
          unit_price: 0,
          has_variants: product.has_variants,
          available: false,
        });
      }
    }
    return [...resolved.values()];
  }, [catalog, websiteProducts]);
  const byKey = useMemo(
    () => new Map(combinedCatalog.map((item) => [productKey(item), item])),
    [combinedCatalog],
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const supplies = combinedCatalog.filter((item) => item.product_type === "supply");
    if (!q) return supplies;
    return supplies.filter((item) =>
      [item.name, item.category, item.sku, PRODUCT_TYPE_LABEL[item.product_type]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [combinedCatalog, searchQuery]);

  const lensCatalog = useMemo(() => combinedCatalog.filter((item) => item.product_type === "lens"), [combinedCatalog]);

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
  const saveAsQuoteMutation = useSaveStockOrderAsQuote();
  const preview = useStockOrderPreview(staged?.id ?? null, showPreview);
  const retailAccount = useMemo(
    () => eligibleAccounts.find((a) => a.name.trim().toLowerCase() === "retail") ?? null,
    [eligibleAccounts],
  );

  useEffect(() => {
    if (!effectiveDraftId && accountId == null && retailAccount) setAccountId(retailAccount.id);
  }, [accountId, effectiveDraftId, retailAccount]);

  useEffect(() => {
    try { localStorage.setItem(STOCK_ANNOTATIONS_KEY, JSON.stringify(annotations)); } catch { /* optional persistence */ }
  }, [annotations]);

  useEffect(() => {
    if (!scanFeedback?.ok) return;
    const timeout = window.setTimeout(() => setScanFeedback(null), 30_000);
    return () => window.clearTimeout(timeout);
  }, [scanFeedback]);

  const hasCapturedOrderDetails = Boolean(poNumber.trim() || orderReference.trim());

  useEffect(() => {
    if (!hasCapturedOrderDetails) setDetailsCollapsed(false);
  }, [hasCapturedOrderDetails]);

  // Restored/autosaved drafts do not emit a browser blur event. Once both
  // summary values are hydrated, keep the expanded form out of the way just
  // as if staff had completed the fields and moved on.
  useEffect(() => {
    if (loadedDraftId && poNumber.trim() && orderReference.trim()) {
      setDetailsCollapsed(true);
    }
  }, [loadedDraftId, orderReference, poNumber]);

  useEffect(() => {
    if (!hasCapturedOrderDetails || detailsCollapsed) return;

    const collapseWhenScrolledPast = () => {
      const details = orderDetailsRef.current;
      const heading = document.querySelector<HTMLElement>(".stock-order-heading");
      if (!details || !heading || details.getBoundingClientRect().top > heading.getBoundingClientRect().bottom) return;

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && details.contains(activeElement)) activeElement.blur();
      setDetailsCollapsed(true);
      requestAnimationFrame(() => {
        details.scrollIntoView({ behavior: "smooth", block: "start" });
        detailsEditRef.current?.focus();
      });
    };

    window.addEventListener("scroll", collapseWhenScrolledPast, true);
    return () => window.removeEventListener("scroll", collapseWhenScrolledPast, true);
  }, [detailsCollapsed, hasCapturedOrderDetails]);

  const advanceFromPoNumber = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    orderReferenceRef.current?.focus();
  };

  const advanceFromOrderReference = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setDetailsCollapsed(true);
    requestAnimationFrame(() => detailsEditRef.current?.focus());
  };

  const collapseOrderDetailsOnBlur = () => {
    window.setTimeout(() => {
      const details = orderDetailsRef.current;
      if (!details || details.contains(document.activeElement)) return;
      if (poNumber.trim() || orderReference.trim()) setDetailsCollapsed(true);
    }, 0);
  };

  const editOrderDetails = () => {
    setDetailsCollapsed(false);
    requestAnimationFrame(() => {
      orderDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      poNumberRef.current?.focus();
    });
  };

  const closeAddDialog = () => {
    setAddDialog(null);
    setExpandedProductKey(null);
    setGridProductKey(null);
  };

  useEffect(() => {
    if (!draft || loadedDraftId === draft.id) return;
    const payload = draft.payload ?? {};
    const account = payload.account;
    setAccountId(draft.account_id ?? account?.id ?? null);
    setPoNumber(draft.po_number ?? payload.po_number ?? "");
    setOrderReference(draft.order_reference ?? payload.order_reference ?? "");
    setInstructions(payload.instructions ?? "");
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
      unitCost: null,
      priceSource: undefined,
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
    if (product.available === false) {
      toast({ title: "Product unavailable for this account", description: "Configure its account pricing before adding it to a stock order.", variant: "destructive" });
      return;
    }
    const sku = variant ? variantSkuFor(variant, side) : product.sku;
    if (!sku) {
      toast({
        title: "No Innova code for that item",
        description: "Add its OPC code to the website variant before ordering it.",
        variant: "destructive",
      });
      return;
    }
    setStaged(null);
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
        unitCost: product.unit_cost ?? null,
        priceSource: product.price_source,
      }];
    });
  };

  const removeLine = (key: string) => {
    setStaged(null);
    setLines((prev) => prev.filter((l) => l.key !== key));
  };
  const updateLine = (key: string, patch: Partial<OrderLine>) => {
    setStaged(null);
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  // Display-only checkout estimate. Prices are not included in buildStageItems;
  // the server resolves the actual order price when staging/releasing.
  const checkoutEstimate = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const handleSaveAsQuotation = async () => {
    if (!staged || !stageItems.length || hasUnsavedChanges || autosaveStatus === "error") return;
    try {
      const quote = await saveAsQuoteMutation.mutateAsync({ submissionId: staged.id });
      toast({ title: `Quotation ${quote.quote_number} saved`, description: "The quote is ready for preview, printing, or email." });
      navigate(`/admin/docs/studio?billingDocument=${encodeURIComponent(quote.docstudio_document_id)}`);
    } catch (err: any) {
      toast({ title: "Could not save quotation", description: err.message ?? "Please review the order pricing and try again.", variant: "destructive" });
    }
  };

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

  const stageItems = useMemo<StageOrderItem[]>(() => lines.map((l) => ({
      product_type: l.productType,
      product_id: l.productId,
      variant_id: l.variantId,
      side: l.side,
      quantity: l.quantity,
      customer_ref: l.customerRef,
    })), [lines]);

  const hasDraftContent = Boolean(stageItems.length || poNumber.trim() || orderReference.trim());
  const autosaveSnapshot = JSON.stringify({ accountId, poNumber, orderReference, instructions, items: stageItems });
  const { mutateAsync: saveStockOrder, isPending: isSavingStockOrder } = stageMutation;
  const stagedId = staged?.id;
  const canPersistDraft = Boolean(accountId && (hasDraftContent || stagedId));
  const hasUnsavedChanges = canPersistDraft && savedSnapshotRef.current !== autosaveSnapshot;

  useEffect(() => {
    if ((draftId || quoteId) && (!effectiveDraftId || loadedDraftId !== effectiveDraftId)) return;
    if (!canPersistDraft || !accountId) return;
    if (savedSnapshotRef.current === autosaveSnapshot) {
      return;
    }
    if (failedSnapshotRef.current === autosaveSnapshot || isSavingStockOrder) return;

    const timeout = window.setTimeout(() => {
      setAutosaveStatus("saving");
      setAutosaveError(null);
      void saveStockOrder({
        submissionId: stagedId,
        accountId,
        poNumber,
        orderReference,
        instructions,
        items: stageItems,
      }).then((result) => {
        setStaged({ id: result.submission_id, total: result.order_total });
        savedSnapshotRef.current = autosaveSnapshot;
        failedSnapshotRef.current = null;
        setAutosaveStatus("saved");
      }).catch((err: any) => {
        failedSnapshotRef.current = autosaveSnapshot;
        setAutosaveError(err.message ?? "Please check the order and try again.");
        setAutosaveStatus("error");
      });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [accountId, autosaveSnapshot, canPersistDraft, draftId, effectiveDraftId, instructions, isSavingStockOrder, loadedDraftId, orderReference, poNumber, quoteId, saveStockOrder, stageItems, stagedId]);

  const handleRelease = async () => {
    if (!staged) return;
    try {
      await releaseMutation.mutateAsync({ id: staged.id });
      toast({
        title: "Released",
        description: "OptiLens will drop the file into Innova's Incoming folder shortly.",
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
    const annotation = resolveStockOrderAnnotationTarget(target);
    setAnnotationTarget({ label: annotation.label, rect: annotation.element.getBoundingClientRect() });
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
    ? "Add a product or enter an order detail to create this order and preview its file."
    : !stageItems.length
      ? "Add a product before previewing the order file."
    : preview.isLoading
      ? "Rendering…"
      : preview.error
        ? `Could not render the order: ${(preview.error as Error).message}`
        : preview.data?.hashref ?? "";

  if (quoteId && !quotedDraftLoading && !quotedDraft) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p>This historical stock quotation has no linked Stock Order Builder draft, so it is read-only.</p>
        <Link className="linkbtn" to="/admin/website/quotations">Back to quotations</Link>
      </div>
    );
  }

  return (
    <div className={`cv-rx-embed no-gear stock-order-shell${annotateOn ? " stock-annotate-on" : ""}`} onClickCapture={handleAnnotationCapture}>
       <div className="wrap">
          <div className="pagehead" data-annotatable>
           <div className="stock-order-heading">
             <div className="stock-order-toolbar" data-annotation-ui>
               <Button variant="ghost" size="sm" className="stock-order-back" onClick={() => navigate("/admin/website/quotations")}>
                 <ArrowLeft className="h-4 w-4" /> Back
               </Button>
               <h1>Stock order form</h1>
               <div className="stock-order-toolbar-actions">
               <span className="ordno"><span>Order</span> {staged?.id ? staged.id.slice(0, 8).toUpperCase() : "—"}</span>
                <span className="stock-order-autosave" role="status" aria-live="polite">
                  {autosaveStatus === "error" ? "Not saved" : hasUnsavedChanges || autosaveStatus === "saving" ? "Saving…" : staged ? "Saved" : ""}
                </span>
               <label className="stock-order-account" title="Customer account">
                 <span className="stock-order-account-dot" />
                 <span>Ordering for</span>
                 <select aria-label="Customer account" value={accountId ?? ""} disabled={accountsLoading} onChange={(e) => { setAccountId(e.target.value ? Number(e.target.value) : null); setLines([]); setStaged(null); }}>
                   <option value="">{accountsLoading ? "Loading…" : "Select account"}</option>
                   {eligibleAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
                 <span className="stock-order-chevron">▾</span>
               </label>
               <label className="stock-order-currency" title="Change the currency used to display order prices">
                 <span className="stock-order-currency-label">Display</span>
                 <select
                   aria-label="Display currency"
                   value={displayCurrency}
                   onChange={(e) => setDisplayCurrency(e.target.value as "USD" | "BBD")}
                 >
                   <option value="USD">USD — US dollar</option>
                   <option value="BBD">BBD — Barbadian dollar</option>
                 </select>
                 <span className="stock-order-chevron">▾</span>
               </label>
               <button className="iconbtn" type="button" title="Annotate improvements" aria-label="Annotate improvements" onClick={() => setAnnotateOn((current) => !current)}><Pencil aria-hidden="true" /></button>
               </div>
             </div>
           </div>
       </div>

        <div ref={orderDetailsRef} className={`card reveal stock-order-details${detailsCollapsed ? " stock-order-details-collapsed" : ""}`} style={{ gridColumn: "1/-1" }} data-annotatable>
          <div className="card-h">
            <div>
              <h2>Order details</h2>
              <div className="sub">Retail is the temporary default while stock pricelists are being corrected.</div>
            </div>
            {detailsCollapsed && <button ref={detailsEditRef} className="iconbtn sm stock-order-details-edit" type="button" title="Edit order details" aria-label="Edit order details" onClick={editOrderDetails}><Pencil aria-hidden="true" /></button>}
          </div>
          <div className="stock-order-details-summary" aria-live="polite">
            {[poNumber.trim() && `PO ${poNumber.trim()}`, orderReference.trim()].filter(Boolean).join(" · ")}
          </div>
          <div className="card-b" inert={detailsCollapsed}>
            <div className="grid stock-order-details-grid">
              <div className="field stock-order-detail-field stock-order-detail-field-po">
                <label htmlFor="stock-order-po-number">PO number <span className="opt-tag">optional</span></label>
                <p id="stock-order-po-number-hint" className="stock-order-field-hint">Your purchase order or internal tracking number.</p>
                <input ref={poNumberRef} id="stock-order-po-number" aria-describedby="stock-order-po-number-hint" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} onKeyDown={advanceFromPoNumber} onBlur={collapseOrderDetailsOnBlur} onClick={(e) => e.stopPropagation()} placeholder="YYYY-MM-DD" />
              </div>
              <div className="field stock-order-detail-field stock-order-detail-field-reference">
                <label htmlFor="stock-order-reference">Order reference</label>
                <p id="stock-order-reference-hint" className="stock-order-field-hint">A customer-facing or staff note that identifies this order.</p>
                <input ref={orderReferenceRef} id="stock-order-reference" aria-describedby="stock-order-reference-hint" value={orderReference} onChange={(e) => setOrderReference(e.target.value)} onKeyDown={advanceFromOrderReference} onBlur={collapseOrderDetailsOnBlur} placeholder="e.g. counter sale, phone order" />
              </div>
            </div>
          </div>
        </div>

        <div className="card reveal stock-order-lines-card" style={{ gridColumn: "1/-1" }} data-annotatable>
          <div className="card-h stock-order-lines-header">
            <div>
              <h2>Order lines</h2>
            </div>
            <div className="stock-order-card-actions" aria-label="Add order items">
              <Button className="stock-order-add-button stock-order-add-supplies" type="button" onClick={() => setAddDialog("supplies")} disabled={!accountId}>
                <PackagePlus aria-hidden="true" /> Add supplies
              </Button>
              <Button className="stock-order-add-button stock-order-add-lens" type="button" onClick={() => setAddDialog("lenses")} disabled={!accountId}>
                <Glasses aria-hidden="true" /> Add lens powers
              </Button>
            </div>
          </div>
          <div className="card-b">
            <div className="rxwrap stock-order-lines-wrap">
              <table className="rxtable stock-order-lines-table">
                <thead><tr><th>Line</th><th>SKU / OPC</th><th>Description</th><th>Ref</th><th>Qty</th><th>Unit cost</th><th>Subtotal</th><th><span className="sr-only">Remove</span></th></tr></thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.key}>
                      <th scope="row">{index + 1}</th>
                      <td className="stock-order-line-sku">{line.sku}</td>
                      <td className="stock-order-line-description"><span>{line.description}</span></td>
                      <td><input aria-label={`Reference for line ${index + 1}`} placeholder="Ref" value={line.customerRef} onChange={(e) => updateLine(line.key, { customerRef: e.target.value })} /></td>
                      <td><input aria-label={`Quantity for line ${index + 1}`} type="number" min={1} value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} /></td>
                      <td className="stock-order-money">
                        <span>{money(line.unitPrice)}</span>
                        {canEdit && (
                          <span className="stock-order-profit" tabIndex={0} title={`Price source: ${line.priceSource ?? "saved quote"}. Cost: ${line.unitCost == null ? "not recorded" : money(line.unitCost)}. Margin: ${line.unitCost != null && line.unitPrice > 0 ? (((line.unitPrice - line.unitCost) / line.unitPrice) * 100).toFixed(1) : "—"}%`}>
                            <CircleDollarSign aria-label="Margin and profit details" />
                          </span>
                        )}
                      </td>
                      <td className="stock-order-money stock-order-line-subtotal">{money(line.unitPrice * line.quantity)}</td>
                      <td><button className="iconbtn sm stock-order-remove-line" type="button" aria-label={`Remove line ${index + 1}`} title={`Remove line ${index + 1}`} onClick={() => removeLine(line.key)}><Trash2 aria-hidden="true" /></button></td>
                    </tr>
                  ))}
                  <tr className="stock-order-new-line">
                    <th scope="row">{lines.length + 1}</th>
                    <td><input aria-label="Scan OPC for new line" value={scanValue} onChange={(e) => setScanValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }} placeholder="Scan OPC" /></td>
                    <td colSpan={6} className="stock-order-new-line-label">New line</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={4} scope="row">Checkout estimate <span>Display only · not sent with this order</span></th>
                    <td className="stock-order-qty-total">{lines.length} items</td>
                    <td />
                    <td className="stock-order-line-subtotal">{money(checkoutEstimate)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {scanFeedback && <div className={`callout${scanFeedback.ok ? "" : " gold"}`} role="status" style={{ marginTop: 12 }}>{scanFeedback.message}</div>}
          </div>
        </div>

        <div className="steps" style={{ position: "static", gridColumn: "1/-1" }} data-annotatable>
          <div className="step-actions" style={{ marginLeft: 0 }}>
            <span className="stock-order-submit-route">Sent through OptiLens</span>
            <button className="btn btn-ghost" disabled={!staged || !stageItems.length} onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide preview" : "Preview file"}</button>
            <button className="btn btn-ghost" disabled={!staged || !stageItems.length || hasUnsavedChanges || autosaveStatus === "error" || saveAsQuoteMutation.isPending} onClick={handleSaveAsQuotation}>
              {saveAsQuoteMutation.isPending ? "Saving quotation…" : "Save as quotation"}
            </button>
            {staged && (
              <Link className="linkbtn" to="/admin/website/quotations">View drafts</Link>
            )}
            <span id="stock-submit-gate" className="stock-submit-gate" role="status">
              {!accountId ? "Select an account to start an order." : !hasDraftContent ? "Add a product or enter a PO number or order reference to create an order." : autosaveStatus === "error" ? `Changes not saved: ${autosaveError}` : hasUnsavedChanges || autosaveStatus === "saving" ? "Saving changes…" : "All changes saved."}
            </span>
            <button className="btn btn-primary" disabled={!staged || !stageItems.length || hasUnsavedChanges || isSavingStockOrder || autosaveStatus === "error" || releaseMutation.isPending} aria-describedby="stock-submit-gate" title={!staged ? "The order will be ready when its first change has been saved." : !stageItems.length ? "Add a product before submitting the order." : hasUnsavedChanges ? "Wait for changes to save before submitting." : undefined} onClick={handleRelease}>
              {releaseMutation.isPending ? "Submitting…" : "Submit order"}
            </button>
          </div>
        </div>
        {showPreview && (
          <pre style={{ gridColumn: "1/-1", background: "hsl(213 30% 12%)", color: "hsl(43 25% 92%)", borderRadius: 12, padding: "14px 16px", fontSize: 11.5, overflow: "auto" }}>
            {previewText}
          </pre>
        )}

        <Sheet open={addDialog === "supplies"} onOpenChange={(open) => !open && closeAddDialog()}>
          <SheetContent className="stock-order-panel stock-order-supplies-panel">
            <SheetHeader className="stock-order-panel-header">
              <SheetTitle>Add Stock Item</SheetTitle>
              <SheetDescription>All published supplies are listed. Unavailable products stay disabled until their account pricing is configured.</SheetDescription>
            </SheetHeader>
            <div className="stock-order-supply-search">
              <label className="sr-only" htmlFor="stock-supply-search">Search published stock items</label>
              <input id="stock-supply-search" autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search published items…" />
            </div>
            <div className="stock-order-panel-results" aria-live="polite">
              {searchResults.map((item) => {
                const key = productKey(item);
                const isExpanded = expandedProductKey === key;
                return (
                  <div className={`stock-order-panel-result${item.available === false ? " is-unavailable" : ""}`} key={key}>
                    <button type="button" disabled={item.available === false} aria-expanded={isExpanded} onClick={() => {
                      if (!item.has_variants) {
                        addLine(item, null, "either", 1);
                        closeAddDialog();
                        return;
                      }
                      setExpandedProductKey(isExpanded ? null : key);
                    }}>
                      <span><b>{item.name}</b>{item.category && <small>{item.category}</small>}</span>
                      <span>{item.available === false ? "Unavailable" : money(item.unit_price)}</span>
                    </button>
                    {item.available === false && <Link className="stock-order-availability-link" to={`/admin/website/store/variants/${item.product_type}/${item.product_id}`}>Configure price & variants</Link>}
                    {isExpanded && <VariantPicker money={money} product={item} variants={expandedVariants} onAdd={(variant, side, quantity) => { addLine(item, variant, side, quantity); closeAddDialog(); }} />}
                  </div>
                );
              })}
              {!searchResults.length && <p className="hint">{catalogLoading || websiteProductsLoading ? "Loading published supplies…" : "No published supplies match this search."}</p>}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={addDialog === "lenses"} onOpenChange={(open) => !open && closeAddDialog()}>
          <SheetContent className="stock-order-panel stock-order-lenses-panel">
            <SheetHeader className="stock-order-panel-header">
              <SheetTitle>Add Lens Powers</SheetTitle>
              <SheetDescription>Choose a published semi-finished lens with variants, enter quantities in the power matrix, then add the selected powers to the order.</SheetDescription>
            </SheetHeader>
            <div className="stock-lens-select field">
              <span id="stock-lens-product-label">Lens product</span>
              <Select value={gridProductKey ?? ""} onValueChange={(value) => setGridProductKey(value || null)}>
                <SelectTrigger id="stock-lens-product" aria-labelledby="stock-lens-product-label" autoFocus className="stock-lens-select-trigger">
                  <SelectValue placeholder="Select a published lens" />
                </SelectTrigger>
                <SelectContent className="stock-lens-select-menu">
                  {lensCatalog.filter((item) => item.has_variants).map((item) => <SelectItem className="stock-lens-select-option" key={productKey(item)} value={productKey(item)} disabled={item.available === false}>{item.name}{item.available === false ? " — unavailable for this account" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="stock-order-panel-body">
              {gridProduct && <VariantPicker money={money} product={gridProduct} variants={gridVariants} onAdd={(variant, side, quantity) => addLine(gridProduct, variant, side, quantity)} onBatchAdded={closeAddDialog} />}
              {!gridProduct && (
              <div className="stock-power-picker-placeholder">
                <span>Select a lens to load its power grid</span>
              </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

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
            <div className="stock-annotation-drawer-head"><div><h3>Your notes</h3><span>{annotations.length} notes</span></div><button className="iconbtn" onClick={() => setShowAnnotations(false)} aria-label="Close notes"><X aria-hidden="true" /></button></div>
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
  product, variants, onAdd, onBatchAdded, money,
}: {
  product: StockCatalogItem;
  variants: StockVariant[];
  money: (usd: number) => string;
  onAdd: (variant: StockVariant | null, side: "right" | "left" | "either", qty: number) => void;
  onBatchAdded?: () => void;
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

  const quantityCell = (id: string, variant: StockVariant | null, powerLabel?: string) => (
    <div className={powerLabel ? "stock-power-cell" : "stock-quantity-cell"}>
        <input
          type="number" min={0} inputMode="numeric" value={qty[id] ?? ""}
        onChange={(e) => setQty((p) => ({ ...p, [id]: Math.max(0, Number(e.target.value) || 0) }))}
        onDoubleClick={(e) => e.preventDefault()}
        aria-label={powerLabel ? `Quantity for ${powerLabel}` : "Quantity"}
      />
      {!powerLabel && <button className="btn btn-ghost btn-sm" type="button" aria-label="Add selected supply" onClick={() => take(id, variant)}>Add</button>}
    </div>
  );

  if (!product.has_variants) {
    return null;
  }

  if (!variants.length) return <div className="hint" style={{ padding: "8px 4px" }}>Loading variants…</div>;

  if (hasPowerAxes(variants)) {
    // Stock is read from the lowest power upward in both directions. Keep the
    // axes consistent for every power-matrix product, rather than depending
    // on the order returned by a catalog source.
    const rowValues = [...new Set(variants.map((v) => numericAttr(v, "sphere") as number))].sort((a, b) => a - b);
    const colValues = [...new Set(variants.map((v) => numericAttr(v, "cylinder") as number))].sort((a, b) => a - b);
    const byCell = new Map<string, StockVariant>();
    variants.forEach((v) => byCell.set(`${numericAttr(v, "sphere")}:${numericAttr(v, "cylinder")}`, v));
    const selectedVariants = variants.filter((variant) => (qty[variant.id] ?? 0) > 0);
    const selectedPowers = selectedVariants.length;
    const selectedLines = selectedVariants.reduce((count, variant) => count + (variantIsChiral(variant) ? 2 : 1), 0);
    const selectedTotal = selectedVariants.reduce((sum, variant) => sum + (qty[variant.id] ?? 0) * product.unit_price * (variantIsChiral(variant) ? 2 : 1), 0);

    const addSelected = () => {
      selectedVariants.forEach((variant) => {
        const quantity = qty[variant.id] ?? 0;
        if (variantIsChiral(variant)) {
          onAdd(variant, "right", quantity);
          onAdd(variant, "left", quantity);
        } else {
          onAdd(variant, "either", quantity);
        }
      });
      setQty({});
      onBatchAdded?.();
    };

    return (
      <div className="stock-power-picker">
        <div className="stock-power-picker-heading">
          <span>Cylinder / ADD</span>
          <span>{money(product.unit_price)} each</span>
        </div>
        <div className="rxwrap">
          <table className="rxtable stock-power-table">
            <thead>
              <tr>
                <th><span>Base</span><span>Sphere</span></th>
                {colValues.map((c) => <th key={c}>{c.toFixed(2)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rowValues.map((r) => (
                <tr key={r}>
                  <th scope="row">{r.toFixed(2)}</th>
                  {colValues.map((c) => {
                    const variant = byCell.get(`${r}:${c}`);
                    if (!variant) return <td key={c}>—</td>;
                    const powerLabel = `sphere ${r.toFixed(2)}, cylinder ${c.toFixed(2)}`;
                    return <td key={c}>{quantityCell(variant.id, variant, powerLabel)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stock-power-picker-footer" aria-live="polite">
          <span>{selectedPowers ? `${selectedPowers} powers selected · ${selectedLines} order lines · ${money(selectedTotal)}` : "Enter a quantity to select a power."}</span>
          <button className="btn btn-primary" type="button" disabled={!selectedPowers} onClick={addSelected}>Add selected to order</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 4px 14px" }}>
      <div className="hint" style={{ marginBottom: 8 }}>{money(product.unit_price)} per unit.</div>
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
