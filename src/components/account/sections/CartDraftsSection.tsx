import { Fragment, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCartDrafts, type CartDraftRow } from "@/hooks/useCartDrafts";
import { useCartContext } from "@/contexts/CartContext";
import { useRxDrafts, useDeleteRxDraft } from "@/features/lens-assistant/api";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const formatMoney = (n: number) => `$${Number(n ?? 0).toFixed(2)}`;
const formatDate = (s: string) => new Date(s).toLocaleString();

type ConfirmDeleteTarget = { kind: "cart" | "rx"; id: string; name: string };

const EYE_LABEL: Record<string, string> = { od: "Right (OD)", os: "Left (OS)" };

const toSentenceCase = (value: string) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() : trimmed;
};

/** Polar radii (+ optional angles) for the right lens → a scaled, centred SVG outline. Mirrors the
 * radiiToXY/scaleOutline maths in rx-order-engine.js, simplified to a single static preview. */
const buildShapeOutline = (shape: any) => {
  const radii: number[] = Array.isArray(shape?.radii?.R) ? shape.radii.R : [];
  if (!radii.length) return null;
  const angles: number[] | undefined = Array.isArray(shape?.angles?.R) ? shape.angles.R : undefined;
  const n = radii.length;
  const points = radii.map((r: number, i: number) => {
    const deg = angles && angles.length === n ? angles[i] : (i * 360) / n;
    const t = (deg * Math.PI) / 180;
    return { x: r * Math.cos(t), y: r * Math.sin(t) };
  });

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const targetA = Number(shape?.nativeBox?.a) || w;
  const targetB = Number(shape?.nativeBox?.b) || h;
  const sx = targetA / w;
  const sy = targetB / h;

  const path = points
    .map((p, i) => `${i ? "L" : "M"}${((p.x - cx) * sx).toFixed(2)},${(-(p.y - cy) * sy).toFixed(2)}`)
    .join(" ") + " Z";
  const pad = Math.max(targetA, targetB) * 0.12;
  const viewW = targetA + pad * 2;
  const viewH = targetB + pad * 2;

  return {
    path,
    viewBox: `${(-viewW / 2).toFixed(2)} ${(-viewH / 2).toFixed(2)} ${viewW.toFixed(2)} ${viewH.toFixed(2)}`,
    strokeWidth: Math.max(targetA * 0.025, 0.6),
  };
};

const RxDraftDetails = ({ payload, patientFallback }: { payload: any; patientFallback: string }) => {
  const patient = [payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ");
  const frame = payload.frame ?? {};
  const shape = payload.shape ?? null;
  const rx = payload.rx ?? {};
  const rxEyes = ["od", "os"].filter((eye) => rx[eye]);
  const quote = payload.quote ?? null;
  const shapeOutline = shape ? buildShapeOutline(shape) : null;

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Patient</dt><dd className="font-medium">{patient || patientFallback}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Lens</dt><dd className="font-medium">{[payload.lens?.material, payload.lens?.design, payload.lens?.colour].filter(Boolean).join(" · ") || "Not selected"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Treatments</dt><dd className="font-medium">{Array.isArray(payload.treatments) ? `${payload.treatments.length} selected` : "None selected"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Order</dt><dd className="font-medium">{payload.job?.scope || "Rx draft"}</dd></div>
      </dl>

      {rxEyes.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prescription</p>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-medium">Eye</th><th className="py-1 text-left font-medium">SPH</th><th className="py-1 text-left font-medium">CYL</th><th className="py-1 text-left font-medium">AXIS</th><th className="py-1 text-left font-medium">ADD</th><th className="py-1 text-left font-medium">PRISM</th><th className="py-1 text-left font-medium">PD</th><th className="py-1 text-left font-medium">NPD</th><th className="py-1 text-left font-medium">HT</th></tr></thead>
              <tbody>
                {rxEyes.map((eye) => { const row = rx[eye] ?? {}; return (
                  <tr key={eye} className="border-t"><td className="py-1 font-medium">{EYE_LABEL[eye] ?? eye}</td><td className="py-1">{row.sph ?? "—"}</td><td className="py-1">{row.cyl ?? "—"}</td><td className="py-1">{row.axis ?? "—"}</td><td className="py-1">{row.add ?? "—"}</td><td className="py-1">{row.prism ? `${row.prism} ${row.base ?? ""}`.trim() : "—"}</td><td className="py-1">{row.pd ?? "—"}</td><td className="py-1">{row.npd ?? "—"}</td><td className="py-1">{row.ht ?? "—"}</td></tr>
                ); })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frame</p>
          <p className="font-medium">{frame.name || "Not entered"}</p>
          <p className="text-xs text-muted-foreground">{[frame.mount, frame.source].filter(Boolean).join(" · ") || "No mount or source recorded"}</p>
        </div>
        <div className="flex items-start gap-3">
          {shapeOutline ? (
            <svg viewBox={shapeOutline.viewBox} className="h-16 w-16 shrink-0 rounded border bg-muted/30 text-foreground/70">
              <path d={shapeOutline.path} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeWidth={shapeOutline.strokeWidth} strokeLinejoin="round" />
            </svg>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shape</p>
            <p className="font-medium">{shape ? (shape.source === "standard" ? `Standard shape${shape.standardId ? ` · ${shape.standardId}` : ""}` : shape.file ? `Uploaded trace · ${shape.file}` : "Traced shape") : "No shape provided"}</p>
            {shape ? <p className="text-xs text-muted-foreground">{shape.confirmed ? "Confirmed by optician" : "Not yet confirmed"}</p> : null}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Measurements (mm)</p>
        <dl className="mt-1 grid grid-cols-3 gap-3 text-sm sm:grid-cols-5">
          <div><dt className="text-xs text-muted-foreground">A</dt><dd className="font-medium">{frame.a ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">B</dt><dd className="font-medium">{frame.b ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">ED</dt><dd className="font-medium">{frame.ed ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">DBL</dt><dd className="font-medium">{frame.dbl ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Temple</dt><dd className="font-medium">{frame.temple ?? "—"}</dd></div>
        </dl>
      </div>

      {payload.delivery?.notes ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{payload.delivery.notes}</p>
        </div>
      ) : null}

      {quote ? (
        <div className="rounded-md border bg-background/60 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order total</p>
          {quote.hidden ? (
            <p className="mt-1 font-medium">Pricing not shown on this account</p>
          ) : (
            <>
              <div className="mt-2 space-y-1.5">
                {(Array.isArray(quote.lines) ? quote.lines : []).map((line: any, index: number) => (
                  <div key={index} className="flex items-baseline justify-between gap-4 text-sm">
                    <span>
                      <span className="font-medium">{toSentenceCase(line.label)}</span>
                      {line.detail ? <span className="text-xs text-muted-foreground"> · {toSentenceCase(line.detail)}</span> : null}
                    </span>
                    <span className="shrink-0 font-medium">{quote.symbol ?? ""} {Number(line.amount ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>{quote.symbol ?? ""} {Number(quote.total ?? 0).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

const CartDraftsSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { emulation } = usePortalIdentity();
  const { drafts, isLoading, deleteDraft } = useCartDrafts(emulation?.userId);
  const { data: rxDrafts = [], isLoading: rxDraftsLoading } = useRxDrafts(emulation?.userId);
  const deleteRxDraft = useDeleteRxDraft();
  const { addToCart } = useCartContext();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteTarget | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const restore = async (draft: CartDraftRow) => {
    setRestoringId(draft.id);
    try {
      for (const item of draft.items) {
        await addToCart({
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          productType: item.product_type,
          quantity: item.quantity,
          variantId: item.variant_id ?? undefined,
          variantLabel: item.variant_label ?? undefined,
          variantSku: item.variant_sku ?? undefined,
          variantOpcCode: item.variant_opc_code ?? undefined,
          variantMetadata: (item.variant_metadata ?? undefined) as Record<string, unknown> | undefined,
        });
      }
      toast({ title: "Draft restored", description: "Items merged into your cart." });
      navigate("/cart");
    } catch (error: any) {
      toast({
        title: "Could not restore draft",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl text-foreground">Saved Drafts</h1>
        <p className="text-sm text-muted-foreground">Cart and Rx-order drafts you saved for later.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Draft</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last saved</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading || rxDraftsLoading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            ) : drafts.length + rxDrafts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No saved drafts yet. <Link to="/profile/rx-order" className="font-medium text-primary hover:underline">Start an Rx order</Link>.</td></tr>
            ) : (
              <>
                {drafts.map((draft) => {
                  const expired = (Date.now() - new Date(draft.updated_at).getTime()) / 86_400_000 > 30;
                  return <Fragment key={draft.id}><tr>
                    <td className="max-w-sm px-4 py-3"><p className="truncate font-medium">{draft.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{draft.total_items} item{draft.total_items === 1 ? "" : "s"} · {formatMoney(draft.total_amount)} USD{draft.note ? ` · ${draft.note}` : ""}</p></td>
                    <td className="px-4 py-3 text-muted-foreground">Cart</td>
                    <td className="px-4 py-3"><Badge variant={expired ? "outline" : "secondary"} className="text-[10px]">{expired ? "Expired" : "Draft"}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(draft.updated_at)}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setPreviewId((id) => id === draft.id ? null : draft.id)} aria-expanded={previewId === draft.id}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button><Button variant="outline" size="sm" onClick={() => restore(draft)} disabled={restoringId === draft.id}>{restoringId === draft.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}<span className="ml-1.5">Restore</span></Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ kind: "cart", id: draft.id, name: draft.name })} aria-label={`Delete ${draft.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                  </tr>{previewId === draft.id ? <tr className="bg-muted/20"><td colSpan={5} className="px-6 py-4"><div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft contents · USD</p>{draft.items.map((item) => <div key={`${item.product_id}-${item.variant_id ?? "base"}`} className="flex items-start justify-between gap-4 text-sm"><div><p className="font-medium">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.variant_label || item.product_type} · Qty {item.quantity}</p></div><p className="font-medium">{formatMoney(item.product_price * item.quantity)} USD</p></div>)}<div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatMoney(draft.total_amount)} USD</span></div></div></td></tr> : null}</Fragment>;
                })}
                {rxDrafts.map((draft) => { const payload = (draft.input_payload ?? {}) as any; return <Fragment key={draft.id}><tr>
                  <td className="max-w-sm px-4 py-3"><p className="truncate font-medium">{draft.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Not submitted to the lab</p></td>
                  <td className="px-4 py-3 text-muted-foreground">Rx order</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize text-[10px]">{draft.status.replace(/_/g, " ")}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(draft.updated_at)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setPreviewId((id) => id === draft.id ? null : draft.id)} aria-expanded={previewId === draft.id}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button><Button asChild variant="outline" size="sm"><Link to={`/profile/rx-order?draft=${draft.id}`}>Continue</Link></Button></div></td>
                </tr>{previewId === draft.id ? <tr className="bg-muted/20"><td colSpan={5} className="px-6 py-4">
                  <RxDraftDetails payload={payload} patientFallback={draft.name} />
                  <div className="mt-3 flex justify-end border-t pt-3"><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ kind: "rx", id: draft.id, name: draft.name })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete draft</Button></div>
                </td></tr> : null}</Fragment>; })}
              </>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.kind === "cart") {
                  await deleteDraft.mutateAsync(confirmDelete.id);
                } else {
                  await deleteRxDraft.mutateAsync(confirmDelete.id);
                }
                toast({ title: "Draft deleted" });
                setPreviewId((id) => id === confirmDelete.id ? null : id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CartDraftsSection;
