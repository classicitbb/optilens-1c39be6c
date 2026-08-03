import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
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
        <p className="text-sm text-muted-foreground">Snapshots of carts you saved for later.</p>
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
                  return <tr key={draft.id}>
                    <td className="max-w-sm px-4 py-3"><p className="truncate font-medium">{draft.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{draft.total_items} item{draft.total_items === 1 ? "" : "s"} · {formatMoney(draft.total_amount)}{draft.note ? ` · ${draft.note}` : ""}</p></td>
                    <td className="px-4 py-3 text-muted-foreground">Cart</td>
                    <td className="px-4 py-3"><Badge variant={expired ? "outline" : "secondary"} className="text-[10px]">{expired ? "Expired" : "Draft"}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(draft.updated_at)}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => restore(draft)} disabled={restoringId === draft.id}>{restoringId === draft.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}<span className="ml-1.5">Restore</span></Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(draft)} aria-label={`Delete ${draft.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                  </tr>;
                })}
                {rxDrafts.map((draft) => <tr key={draft.id}>
                  <td className="max-w-sm px-4 py-3"><p className="truncate font-medium">{draft.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Not submitted to the lab</p></td>
                  <td className="px-4 py-3 text-muted-foreground">Rx order</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize text-[10px]">{draft.status.replace(/_/g, " ")}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(draft.updated_at)}</td>
                  <td className="px-4 py-3 text-right"><Button asChild variant="outline" size="sm"><Link to={`/profile/rx-order?draft=${draft.id}`}>Continue</Link></Button></td>
                </tr>)}
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
