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
import { useRxDrafts } from "@/features/lens-assistant/api";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const formatMoney = (n: number) => `$${Number(n ?? 0).toFixed(2)}`;
const formatDate = (s: string) => new Date(s).toLocaleString();

const CartDraftsSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { emulation } = usePortalIdentity();
  const { drafts, isLoading, deleteDraft } = useCartDrafts(emulation?.userId);
  const { data: rxDrafts = [], isLoading: rxDraftsLoading } = useRxDrafts(emulation?.userId);
  const { addToCart } = useCartContext();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CartDraftRow | null>(null);
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
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setPreviewId((id) => id === draft.id ? null : draft.id)} aria-expanded={previewId === draft.id}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button><Button variant="outline" size="sm" onClick={() => restore(draft)} disabled={restoringId === draft.id}>{restoringId === draft.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}<span className="ml-1.5">Restore</span></Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(draft)} aria-label={`Delete ${draft.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                  </tr>{previewId === draft.id ? <tr className="bg-muted/20"><td colSpan={5} className="px-6 py-4"><div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft contents · USD</p>{draft.items.map((item) => <div key={`${item.product_id}-${item.variant_id ?? "base"}`} className="flex items-start justify-between gap-4 text-sm"><div><p className="font-medium">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.variant_label || item.product_type} · Qty {item.quantity}</p></div><p className="font-medium">{formatMoney(item.product_price * item.quantity)} USD</p></div>)}<div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatMoney(draft.total_amount)} USD</span></div></div></td></tr> : null}</Fragment>;
                })}
                {rxDrafts.map((draft) => { const payload = (draft.input_payload ?? {}) as any; const patient = [payload.patient?.first, payload.patient?.last].filter(Boolean).join(" "); return <Fragment key={draft.id}><tr>
                  <td className="max-w-sm px-4 py-3"><p className="truncate font-medium">{draft.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Not submitted to the lab</p></td>
                  <td className="px-4 py-3 text-muted-foreground">Rx order</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize text-[10px]">{draft.status.replace(/_/g, " ")}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(draft.updated_at)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setPreviewId((id) => id === draft.id ? null : draft.id)} aria-expanded={previewId === draft.id}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button><Button asChild variant="outline" size="sm"><Link to={`/profile/rx-order?draft=${draft.id}`}>Continue</Link></Button></div></td>
                </tr>{previewId === draft.id ? <tr className="bg-muted/20"><td colSpan={5} className="px-6 py-4"><dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-muted-foreground">Patient</dt><dd className="font-medium">{patient || draft.name}</dd></div><div><dt className="text-xs text-muted-foreground">Lens</dt><dd className="font-medium">{[payload.lens?.material, payload.lens?.design, payload.lens?.colour].filter(Boolean).join(" · ") || "Not selected"}</dd></div><div><dt className="text-xs text-muted-foreground">Treatments</dt><dd className="font-medium">{Array.isArray(payload.treatments) ? `${payload.treatments.length} selected` : "None selected"}</dd></div><div><dt className="text-xs text-muted-foreground">Order</dt><dd className="font-medium">{payload.job?.scope || "Rx draft"}</dd></div></dl></td></tr> : null}</Fragment>; })}
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
                await deleteDraft.mutateAsync(confirmDelete.id);
                toast({ title: "Draft deleted" });
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
