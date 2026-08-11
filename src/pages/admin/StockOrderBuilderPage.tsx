import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Barcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "@/features/rx-order/embed/rx-order.css";
import "./stock-order-builder.css";
import {
  useStockEligibleAccounts, useStockLensPricing, resolveStockCode,
  useStageStockOrder, useReleaseStockOrder, useStockOrderDraft, StageOrderItem,
} from "@/hooks/useStockOrderBuilder";
import { useInnovationsStoreLensCatalog, useInnovationsLensPowerRows } from "@/hooks/useInnovationsStoreLensCatalog";

// Stock Order Builder (/admin/website/stock-orders) — staff tool for
// building SKU-identified stock/finished-lens orders and releasing them to
// Innova. Completely separate from the Rx order form (prescription orders):
// see optilens-local docs/innova-stockhashref-format.md for why the two
// file formats and pipelines don't mix. Styled with the same visual system
// as the Rx order form (rx-order.css, .cv-rx-embed) per Russell's request,
// but this is a native implementation, not a ported prototype.
//
// NOT tested against a live app/database this session — the migration this
// depends on (20260811000000_stock_order_pricing_and_outbox.sql) hasn't
// been run yet. Treat this as a first pass to review and exercise once it
// has, not as verified-working code.

interface PowerRow {
  id: string; innovations_lens_id: string;
  diameter: number | null; sphere: number | null; base: number | null; cylinder: number | null; add: number | null;
  stock_on_hand: number | null; right_opc: string | null; left_opc: string | null;
}

interface OrderLine {
  key: string; powerRowId: string; familyId: string; familyName: string; lensState: string;
  side: "right" | "left" | "either"; sku: string; description: string;
  quantity: number; customerRef: string; unitPrice: number;
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

const describePower = (row: Pick<PowerRow, "sphere" | "base" | "cylinder" | "add">) => {
  const primary = row.sphere ?? row.base;
  const secondary = row.cylinder ?? row.add;
  const parts = [primary, secondary].filter((v) => v != null).map((v) => Number(v).toFixed(2));
  return parts.join(" / ");
};

const axisLabels = (rows: PowerRow[]) => {
  const usesBaseAdd = rows.some((r) => r.base != null || r.add != null);
  return usesBaseAdd ? { row: "Base", col: "Add" } : { row: "Sphere", col: "Cylinder" };
};

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
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [gridFamilyId, setGridFamilyId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [staged, setStaged] = useState<{ id: string; total: number } | null>(null);
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
  const { data: pricing } = useStockLensPricing(selectedAccount?.pricelist_version_id ?? null);

  const { data: families = [] } = useInnovationsStoreLensCatalog();
  const orderableFamilies = useMemo(
    () => families.filter((f) => pricing?.has(f.id)),
    [families, pricing],
  );
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orderableFamilies.slice(0, 25);
    return orderableFamilies.filter((f) =>
      [f.name, f.material, f.manufacturer, f.mf_type, f.option_name].filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [orderableFamilies, searchQuery]);

  const expandedFamily = orderableFamilies.find((f) => f.id === expandedFamilyId) ?? null;
  const gridFamily = orderableFamilies.find((f) => f.id === gridFamilyId) ?? null;
  const { data: expandedPowers = [] } = useInnovationsLensPowerRows(expandedFamily ? [expandedFamily.innovations_lens_id] : []);
  const { data: gridPowers = [] } = useInnovationsLensPowerRows(gridFamily ? [gridFamily.innovations_lens_id] : []);

  const stageMutation = useStageStockOrder();
  const releaseMutation = useReleaseStockOrder();
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
    setLines((payload.items ?? []).map((item, index) => ({
      key: `${draft.id}:${item.power_row_id ?? index}:${item.side ?? "either"}`,
      powerRowId: item.power_row_id ?? "",
      familyId: "draft",
      familyName: item.description ?? "Stock lens",
      lensState: item.source === "FLENS" ? "finished" : "semi_finished",
      side: item.side ?? "either",
      sku: item.sku ?? "",
      description: item.description ?? item.sku ?? "Stock lens",
      quantity: Number(item.quantity ?? 1),
      customerRef: item.comment ?? "",
      unitPrice: Number(item.unit_price ?? 0),
    })));
    setStaged({ id: draft.id, total: Number(payload.order_total ?? 0) });
    setLoadedDraftId(draft.id);
  }, [draft, loadedDraftId]);

  const addLine = (family: { id: string; name: string; lens_state: string }, row: PowerRow, side: "right" | "left" | "either", quantity: number) => {
    const unitPrice = pricing?.get(family.id) ?? 0;
    const sku = side === "left" ? row.left_opc : row.right_opc;
    if (!sku) {
      toast({ title: "No Innova code for that side", variant: "destructive" });
      return;
    }
    setLines((prev) => {
      const key = `${row.id}:${side}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, {
        key, powerRowId: row.id, familyId: family.id, familyName: family.name, lensState: family.lens_state,
        side, sku, description: `${family.name} ${describePower(row)} / ${side}`,
        quantity, customerRef: "", unitPrice,
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
        setScanFeedback({ ok: false, message: `No item found for code ${code}.` });
        return;
      }
      const family = families.find((f) => f.innovations_lens_id === resolved.innovationsLensId);
      if (!family || !pricing?.has(family.id)) {
        setScanFeedback({ ok: false, message: `${code} isn't priced on this account's pricelist.` });
        return;
      }
      const row: PowerRow = {
        id: resolved.powerRowId, innovations_lens_id: resolved.innovationsLensId,
        diameter: null, sphere: resolved.sphere, base: resolved.base, cylinder: resolved.cylinder, add: resolved.add,
        stock_on_hand: null,
        right_opc: resolved.side === "right" ? code : null,
        left_opc: resolved.side === "left" ? code : null,
      };
      addLine(family, row, resolved.side, 1);
      setScanFeedback({ ok: true, message: `Added ${code} x1 — ${family.name} ${describePower(row)}` });
      setScanValue("");
    } catch (err: any) {
      setScanFeedback({ ok: false, message: err.message ?? "Lookup failed." });
    }
  };

  const buildStageItems = (): StageOrderItem[] =>
    lines.map((l) => ({ power_row_id: l.powerRowId, side: l.side, quantity: l.quantity, customer_ref: l.customerRef }));

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
      await releaseMutation.mutateAsync(staged.id);
      toast({ title: "Released", description: "optilens-local will drop the file into Innova's Incoming folder shortly." });
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

  const previewText = useMemo(() => {
    // Approximate preview only — the authoritative .stockhashref is
    // rendered by optilens-local's stock-order-generator.js at release
    // time. Keeping one template in one place (Node, where it's actually
    // sent from) rather than risking the two drifting apart.
    const itemBlocks = lines.map((l) =>
      `item_start\nsku:${l.sku}\nitem_source:${l.lensState === "finished" ? "FLENS" : "SLENS"}\nitem_description:${l.description}\nitem_quantity:${l.quantity}\nitem_comment:${l.customerRef}\nitem_part_rx:Y\nitem_end`,
    ).join("\n");
    return [
      "file_version:1.0", "hashrouting_key:", "start_order",
      `cust_num:${selectedAccount?.account_number ?? ""}`,
      `customer_po_num:${poNumber}`, `patient_name:${orderReference || "Stock Order"}`,
      itemBlocks, "end_order",
    ].join("\n");
  }, [lines, poNumber, orderReference, selectedAccount]);

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
             <p>Search, scan, or fill a power grid to order finished and semi-finished lenses by SKU.</p>
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
              <div className="sub">{selectedAccount ? `Prices shown are ${selectedAccount.name}'s pricelist.` : "Select a customer account first."}</div>
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
                  placeholder="Search product name, material, or manufacturer"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <div className="rxwrap">
                  {searchResults.map((family) => {
                    const isExpanded = expandedFamilyId === family.id;
                    const price = pricing?.get(family.id) ?? 0;
                    return (
                      <div key={family.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
                          onClick={() => setExpandedFamilyId(isExpanded ? null : family.id)}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{family.name}</div>
                            <div className="hint">{family.material} · {family.mf_type}</div>
                          </div>
                          <span className="tchip">{family.lens_state === "finished" ? "Finished" : "Semi-finished"}</span>
                          <span style={{ fontWeight: 600, fontSize: 12.5 }}>${price.toFixed(2)}</span>
                        </div>
                        {isExpanded && (
                          <PowerGrid
                            rows={expandedPowers as PowerRow[]}
                            price={price}
                            onAdd={(row, side, qty) => addLine(family, row, side, qty)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {!searchResults.length && <div className="hint">No priced items match that search.</div>}
                </div>
              </div>
            )}

            {mode === "scan" && (
              <div>
                <div className="drop">
                  <Barcode className="di" style={{ width: 26, height: 26, margin: "0 auto" }} />
                  <div className="dt">Scan or type a code, then press Enter</div>
                  <div className="ds">Resolves to one exact power and side — priced and added directly.</div>
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
                  <label>Product family</label>
                  <select value={gridFamilyId ?? ""} onChange={(e) => setGridFamilyId(e.target.value || null)}>
                    <option value="">Select a family</option>
                    {orderableFamilies.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.lens_state === "finished" ? "finished" : "semi-finished"})</option>
                    ))}
                  </select>
                </div>
                {gridFamily && (
                  <PowerGrid
                    rows={gridPowers as PowerRow[]}
                    price={pricing?.get(gridFamily.id) ?? 0}
                    onAdd={(row, side, qty) => addLine(gridFamily, row, side, qty)}
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
                <span className="tchip">{line.lensState === "finished" ? "Finished" : "Semi-fin."}</span>
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

const PowerGrid = ({ rows, price, onAdd }: { rows: PowerRow[]; price: number; onAdd: (row: PowerRow, side: "right" | "left" | "either", qty: number) => void }) => {
  const [qty, setQty] = useState<Record<string, number>>({});
  const labels = axisLabels(rows);
  const rowValues = [...new Set(rows.map((r) => r.sphere ?? r.base).filter((v) => v != null))].sort((a, b) => (b as number) - (a as number));
  const colValues = [...new Set(rows.map((r) => r.cylinder ?? r.add).filter((v) => v != null))].sort((a, b) => (b as number) - (a as number));
  const byCell = new Map<string, PowerRow>();
  rows.forEach((r) => byCell.set(`${r.sphere ?? r.base}:${r.cylinder ?? r.add}`, r));

  if (!rows.length) return <div className="hint" style={{ padding: "8px 4px" }}>Loading powers…</div>;

  return (
    <div style={{ padding: "0 4px 14px" }}>
      <div className="hint" style={{ marginBottom: 8 }}>Choose power and quantity — ${price.toFixed(2)} per cell.</div>
      <div className="rxwrap">
        <table className="rxtable">
          <thead>
            <tr>
              <th>{labels.row} \ {labels.col}</th>
              {colValues.map((c) => <th key={String(c)}>{Number(c).toFixed(2)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rowValues.map((r) => (
              <tr key={String(r)}>
                <td><div className="eye"><b>{Number(r).toFixed(2)}</b></div></td>
                {colValues.map((c) => {
                  const row = byCell.get(`${r}:${c}`);
                  if (!row) return <td key={String(c)}>—</td>;
                  const chiral = row.right_opc && row.left_opc && row.right_opc !== row.left_opc;
                  const cellKey = row.id;
                  return (
                    <td key={String(c)}>
                      <input
                        type="number" min={0} value={qty[cellKey] ?? ""}
                        onChange={(e) => setQty((p) => ({ ...p, [cellKey]: Math.max(0, Number(e.target.value) || 0) }))}
                        style={{ width: 52 }}
                      />
                      <button
                        className="iconbtn sm" style={{ marginLeft: 4 }} aria-label="Add"
                        onClick={() => {
                          const n = qty[cellKey] || 0;
                          if (!n) return;
                          onAdd(row, chiral ? "right" : "either", n);
                          if (chiral) onAdd(row, "left", n);
                          setQty((p) => ({ ...p, [cellKey]: 0 }));
                        }}
                      >+</button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockOrderBuilderPage;
