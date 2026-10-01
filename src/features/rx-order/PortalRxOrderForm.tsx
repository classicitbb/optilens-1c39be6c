import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";
import RxOrderEmbed from "@/features/rx-order/RxOrderEmbed";
import { isEmbeddedRxOrderPayload, resolveResumedRxDraftId, useRxDraft } from "@/features/lens-assistant/api";
import { buildPrefillBanner, buildRxPrefillPayload } from "@/features/rx-order/prefill/rxOrderPrefill";

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

  const ready = !identityLoading && (lockedAccountId != null || isStaff) && draftSettled;

  return ready ? (
    <RxOrderEmbed
      key={formKey}
      quoteId={null}
      surface="portal"
      lockedAccountId={lockedAccountId}
      checkoutPath="/checkout"
      storePath="/store"
      onStartAnother={() => setFormKey((k) => k + 1)}
      prefill={prefill}
      prefillBanner={prefillBanner}
      resumedDraftId={resolveResumedRxDraftId(draftId, draft?.input_payload)}
      pricesVisible={isStaff || canAccessFeature("order-prices")}
      // Credit-approved customers place Rx jobs straight onto their account.
      // Staff do not: an order placed from the admin surface still belongs in
      // the cart, where the account it bills is an explicit choice.
      allowDirectSubmit={!isStaff && identity?.paymentTerms === "credit"}
      currency="BBD"
    />
  ) : (
    <div className="p-12 text-center text-sm text-muted-foreground">
      {draftId && !draftSettled ? "Loading your saved prescription…" : "Preparing your Rx order…"}
    </div>
  );
};

export default PortalRxOrderForm;
