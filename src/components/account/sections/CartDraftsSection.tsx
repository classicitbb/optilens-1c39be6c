import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2, RotateCcw, Trash2 } from "lucide-react";
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
import { useRxDrafts, useDeleteRxDraft, isEmbeddedRxOrderPayload } from "@/features/lens-assistant/api";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import type { RxOrderDraft } from "@/features/lens-assistant/types";
import { RxPayloadSummary } from "@/features/rx-order/orders/RxPayloadSummary";

const formatMoney = (n: number) => `$${Number(n ?? 0).toFixed(2)}`;
const formatDate = (s: string) => new Date(s).toLocaleString();

type SortKey = "name" | "type" | "status" | "updated";
type DraftRow =
  | { kind: "cart"; key: string; name: string; type: string; status: string; updated: number; draft: CartDraftRow }
  | { kind: "rx"; key: string; name: string; type: string; status: string; updated: number; draft: RxOrderDraft };

type ConfirmDeleteTarget = { kind: "cart" | "rx"; id: string; name: string };

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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "updated", dir: "desc" });
  const toggleSort = (key: SortKey) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "updated" ? "desc" : "asc" });

  const rows = useMemo<DraftRow[]>(() => {
    const cart: DraftRow[] = drafts.map((d) => {
      const expired = (Date.now() - new Date(d.updated_at).getTime()) / 86_400_000 > 30;
      return { kind: "cart", key: d.id, name: d.name, type: "Cart", status: expired ? "Expired" : "Draft", updated: new Date(d.updated_at).getTime(), draft: d };
    });
    const rx: DraftRow[] = rxDrafts.map((d) => ({
      kind: "rx", key: d.id, name: d.name, type: "Rx order", status: d.status.replace(/_/g, " "), updated: new Date(d.updated_at).getTime(), draft: d,
    }));
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...cart, ...rx].sort((a, b) => {
      const diff = sort.key === "updated" ? a.updated - b.updated : a[sort.key].localeCompare(b[sort.key], undefined, { numeric: true, sensitivity: "base" });
      return sign * (diff || b.updated - a.updated);
    });
  }, [drafts, rxDrafts, sort]);

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-4 py-3" aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
        {label}
        {sort.key === k ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );

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
        <p className="text-sm text-muted-foreground">Cart and Rx-order drafts saved for later by anyone on this account.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <SortHead k="name" label="Draft" />
              <SortHead k="type" label="Type" />
              <SortHead k="status" label="Status" />
              <SortHead k="updated" label="Last saved" />
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
                {rows.map((row) => row.kind === "cart" ? ((draft: CartDraftRow) => {
                  const expired = (Date.now() - new Date(draft.updated_at).getTime()) / 86_400_000 > 30;
                  return <Fragment key={draft.id}><tr>
                    <td className="max-w-sm px-4 py-3"><p className="truncate font-medium">{draft.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{draft.total_items} item{draft.total_items === 1 ? "" : "s"} · {formatMoney(draft.total_amount)} USD{draft.note ? ` · ${draft.note}` : ""}</p>{draft.created_by_name ? <p className="mt-0.5 truncate text-xs text-muted-foreground">Started by {draft.created_by_name}</p> : null}</td>
                    <td className="px-4 py-3 text-muted-foreground">Cart</td>
                    <td className="px-4 py-3"><Badge variant={expired ? "outline" : "secondary"} className="text-[10px]">{expired ? "Expired" : "Draft"}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(draft.updated_at)}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setPreviewId((id) => id === draft.id ? null : draft.id)} aria-expanded={previewId === draft.id}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button><Button variant="outline" size="sm" onClick={() => restore(draft)} disabled={restoringId === draft.id}>{restoringId === draft.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}<span className="ml-1.5">Restore</span></Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ kind: "cart", id: draft.id, name: draft.name })} aria-label={`Delete ${draft.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                  </tr>{previewId === draft.id ? <tr className="bg-muted/20"><td colSpan={5} className="px-6 py-4"><div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft contents · USD</p>{draft.items.map((item) => <div key={`${item.product_id}-${item.variant_id ?? "base"}`} className="flex items-start justify-between gap-4 text-sm"><div><p className="font-medium">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.variant_label || item.product_type} · Qty {item.quantity}</p></div><p className="font-medium">{formatMoney(item.product_price * item.quantity)} USD</p></div>)}<div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatMoney(draft.total_amount)} USD</span></div></div></td></tr> : null}</Fragment>;
                })(row.draft) : ((draft: RxOrderDraft) => { const payload = (draft.input_payload ?? {}) as any; const orderNumber = typeof payload.orderNo === "string" ? payload.orderNo.trim() : ""; const listName = orderNumber && !draft.name.includes(orderNumber) ? `${draft.name} · Order ${orderNumber}` : draft.name; return <Fragment key={draft.id}><tr>
                  <td className="max-w-sm px-4 py-3"><p className="truncate font-medium">{listName}</p><p className="mt-0.5 text-xs text-muted-foreground">Not submitted to the lab</p>{draft.created_by_name ? <p className="mt-0.5 truncate text-xs text-muted-foreground">Started by {draft.created_by_name}</p> : null}{isEmbeddedRxOrderPayload(draft.input_payload) ? null : <Badge variant="outline" className="mt-1 text-[10px]">From Lens Assistant</Badge>}</td>
                  <td className="px-4 py-3 text-muted-foreground">Rx order</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize text-[10px]">{draft.status.replace(/_/g, " ")}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(draft.updated_at)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setPreviewId((id) => id === draft.id ? null : draft.id)} aria-expanded={previewId === draft.id}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button><Button asChild variant="outline" size="sm"><Link to={`/profile/rx-order?draft=${draft.id}`}>Continue</Link></Button></div></td>
                </tr>{previewId === draft.id ? <tr className="bg-muted/20"><td colSpan={5} className="px-6 py-4">
                  <RxPayloadSummary payload={payload} patientFallback={draft.name} />
                  <div className="mt-3 flex justify-end border-t pt-3"><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ kind: "rx", id: draft.id, name: draft.name })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete draft</Button></div>
                </td></tr> : null}</Fragment>; })(row.draft))}
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
