import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";
import RxForm from "@/features/rx-order/form/RxForm";
import { isEmbeddedRxOrderPayload, resolveResumedRxDraftId, useRxDraft } from "@/features/lens-assistant/api";
import { buildPrefillBanner, buildRxPrefillPayload } from "@/features/rx-order/prefill/rxOrderPrefill";
import { useMyRxOrder } from "@/features/rx-order/orders/api";
import { reorderPayload, rxActions } from "@/features/rx-order/orders/lifecycle";

// Shared portal form used both from the standalone order route and My Account.
// The quote is not created here: the form creates it on its first real save
// (save_rx_order), so both entry points price and save the same customer-locked
// RX quote and merely opening the form leaves nothing behind.
const PortalRxOrderForm = () => {
  const { toast } = useToast();
  const { identity, isLoading: identityLoading, isStaff, canAccessFeature } = usePortalIdentity();
  // Bumped by "Another" to give the form a fresh, quote-less start.
  const [formKey, setFormKey] = useState(0);
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft") ?? undefined;
  const { data: draft, isFetched: draftFetched, isError: draftError } = useRxDraft(draftId);
  const draftSettled = !draftId || draftFetched;
  // ?edit=<quote> reopens an order that has not been released (from My Orders or the cart);
  // ?from=<quote>&as=reorder|remake starts a new order with the same Rx, lens and coatings.
  const editId = searchParams.get("edit") ?? undefined;
  const fromId = searchParams.get("from") ?? undefined;
  const fromKind = searchParams.get("as") === "remake" ? "remake" : "reorder";
  const editFromCart = searchParams.get("cart") === "1";
  const { data: source, isFetched: sourceFetched, isError: sourceError } = useMyRxOrder(editId ?? fromId);
  const sourceSettled = !(editId ?? fromId) || sourceFetched;
  const sourceV1 = source?.payload && (source.payload as any).schema === "cv.rxorder/1" ? source.payload : undefined;
  const editable = !!source && rxActions(source).edit;
  const sourcePrefill = useMemo(() => {
    if (!sourceV1 || !source) return undefined;
    if (editId) return editable ? sourceV1 : undefined;
    return reorderPayload(sourceV1, fromKind, source.rx_order_number);
  }, [sourceV1, source, editId, editable, fromKind]);
  const sourceBanner = !sourcePrefill || !source ? undefined
    : editId ? `Editing Rx order <b>${source.rx_order_number != null ? `#${source.rx_order_number}` : ""}</b>. You can change it until Classic Visions releases it to the lab.`
    : fromKind === "remake" ? `Remake / warranty of Rx order <b>${source.rx_order_number != null ? `#${source.rx_order_number}` : ""}</b>. Check the frame details before sending.`
    : `Reorder of Rx order <b>${source.rx_order_number != null ? `#${source.rx_order_number}` : ""}</b>: same prescription, lens and coatings. Choose the new frame.`;
  // A draft made from an order that was in the cart keeps its quote, so resubmitting re-uses it.
  const draftQuoteId = typeof (draft?.input_payload as any)?.quoteId === "string" ? (draft!.input_payload as any).quoteId as string : undefined;
  const isEmbeddedDraft = isEmbeddedRxOrderPayload(draft?.input_payload);
  const prefill = useMemo(() => (
    !draft ? undefined : isEmbeddedDraft ? draft.input_payload : buildRxPrefillPayload(draft)
  ), [draft, isEmbeddedDraft]);
  const prefillBanner = useMemo(() => (
    !draft ? undefined : isEmbeddedDraft ? `Resuming saved Rx order for <b>${draft.name}</b>.` : buildPrefillBanner(draft)
  ), [draft, isEmbeddedDraft]);

  useEffect(() => {
    if (draftId && draftFetched && !draft) {
      toast({
        title: "Saved Rx not loaded",
        description: draftError
          ? "That saved prescription could not be opened, so the form is starting empty."
          : "That saved prescription no longer exists, so the form is starting empty.",
        variant: "destructive",
      });
    }
  }, [draftId, draftFetched, draftError, draft, toast]);

  const lockedAccountId: number | null = identity?.crmCustomerId ?? null;

  if (!identityLoading && lockedAccountId == null && !isStaff) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Your portal account isn't linked to a trading account yet, so Rx ordering is not available.
        Contact Classic Visions to finish setting up your account.
      </div>
    );
  }

  if (editId && sourceFetched && (sourceError || !source)) {
    return <div className="p-12 text-center text-sm text-muted-foreground">That Rx order could not be opened. <Link to="/profile/orders" className="font-medium text-primary hover:underline">Back to order history</Link></div>;
  }
  if (editId && source && !editable) {
    return <div className="p-12 text-center text-sm text-muted-foreground">This order has already been released to the lab, so it can no longer be edited. <Link to={`/profile/orders/rx/${editId}`} className="font-medium text-primary hover:underline">See its progress</Link></div>;
  }

  const ready = !identityLoading && (lockedAccountId != null || isStaff) && draftSettled && sourceSettled;

  return ready ? (
    <RxForm
      key={formKey}
      quoteId={editId ?? draftQuoteId ?? null}
      editFromCart={editFromCart}
      surface="portal"
      lockedAccountId={lockedAccountId}
      checkoutPath="/checkout"
      storePath="/store"
      onStartAnother={() => setFormKey((k) => k + 1)}
      prefill={sourcePrefill ?? prefill}
      prefillBanner={sourceBanner ?? prefillBanner}
      resumedDraftId={resolveResumedRxDraftId(draftId, draft?.input_payload)}
      pricesVisible={isStaff || canAccessFeature("order-prices")}
      // Credit-approved customers place Rx jobs straight onto their account.
      // Staff do not: an order placed from the admin surface still belongs in
      // the cart, where the account it bills is an explicit choice.
      allowDirectSubmit={!isStaff && identity?.paymentTerms === "credit"}
    />
  ) : (
    <div className="p-12 text-center text-sm text-muted-foreground">
      {draftId && !draftSettled ? "Loading your saved prescription…" : "Preparing your Rx order…"}
    </div>
  );
};

export default PortalRxOrderForm;
