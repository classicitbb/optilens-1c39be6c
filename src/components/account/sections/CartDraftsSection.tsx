import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { FileText, Loader2, RotateCcw, Trash2 } from "lucide-react";
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
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const formatMoney = (n: number) => `$${Number(n ?? 0).toFixed(2)}`;
const formatDate = (s: string) => new Date(s).toLocaleString();

const CartDraftsSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { emulation } = usePortalIdentity();
  const { drafts, isLoading, deleteDraft } = useCartDrafts(emulation?.userId);
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

      {isLoading || rxDraftsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No saved drafts yet.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/cart")}>
            Go to cart
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium">{draft.name}</div>
                  {(() => {
                    const ageDays = (Date.now() - new Date(draft.updated_at).getTime()) / 86_400_000;
                    return ageDays > 30 ? (
                      <Badge variant="outline" className="text-[10px]">Expired</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                    );
                  })()}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{draft.total_items}</span> item{draft.total_items === 1 ? "" : "s"} ·{" "}
                  <span className="font-medium text-foreground">{formatMoney(draft.total_amount)}</span> ·{" "}
                  Saved {formatDate(draft.updated_at)}
                </div>
                {draft.note && <div className="mt-1 text-xs text-muted-foreground/80">{draft.note}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restore(draft)}
                  disabled={restoringId === draft.id}
                >
                  {restoringId === draft.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5">Restore</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(draft)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4">
        <h2 className="text-lg font-semibold text-foreground">Rx order drafts</h2>
        <p className="text-sm text-muted-foreground">Controlled lens recommendations saved before final LabLink submission.</p>
      </div>
      {rxDrafts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No Rx drafts yet. <Link to="/lens-assistant?audience=professional" className="font-medium text-primary hover:underline">Start the lens assistant</Link>.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rxDrafts.map((draft) => (
            <li key={draft.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2"><span className="font-medium">{draft.name}</span><Badge variant="secondary" className="capitalize">{draft.status.replace(/_/g, " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Saved {formatDate(draft.updated_at)} · Not submitted to the lab</p></div>
              <Button asChild variant="outline" size="sm"><Link to={`/profile/rx-drafts/${draft.id}`}>Open draft</Link></Button>
            </li>
          ))}
        </ul>
      )}

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
