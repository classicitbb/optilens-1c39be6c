import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes } from "@/hooks/useQuotes";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";
import RxOrderEmbed from "@/features/rx-order/RxOrderEmbed";
import { isEmbeddedRxOrderPayload, useRxDraft } from "@/features/lens-assistant/api";
import { buildPrefillBanner, buildRxPrefillPayload } from "@/features/rx-order/prefill/rxOrderPrefill";

// Shared portal form used both from the standalone order route and My Account.
// Keeping order creation here ensures both entry points create and price the
// same customer-locked RX quote.
const PortalRxOrderForm = () => {
  const { toast } = useToast();
  const { createMutation } = useQuotes();
  const { identity, isLoading: identityLoading, isStaff, canAccessFeature } = usePortalIdentity();
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const creatingRef = useRef(false);
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

  const { data: quote } = useQuery({
    queryKey: ["rx-order-quote-header", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quotes") as any)
        .select("id, quote_number").eq("id", quoteId).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (quoteId || creatingRef.current || identityLoading) return;
    if (lockedAccountId == null && !isStaff) return;
    creatingRef.current = true;
    createMutation.mutate(
      { quote_type: "RX", account_id: lockedAccountId },
      {
        onSuccess: (quote) => setQuoteId(quote.id),
        onError: (error: any) => toast({ title: "Could not start an Rx order", description: error.message, variant: "destructive" }),
      },
    );
  }, [quoteId, lockedAccountId, identityLoading, isStaff]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!identityLoading && lockedAccountId == null && !isStaff) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Your portal account isn't linked to a trading account yet, so Rx ordering is not available.
        Contact Classic Visions to finish setting up your account.
      </div>
    );
  }

  return quoteId && draftSettled ? (
    <RxOrderEmbed
      quoteId={quoteId}
      quoteNumber={quote?.quote_number}
      surface="portal"
      lockedAccountId={lockedAccountId}
      checkoutPath="/checkout"
      storePath="/store"
      onStartAnother={() => { setQuoteId(null); creatingRef.current = false; }}
      prefill={prefill}
      prefillBanner={prefillBanner}
      pricesVisible={isStaff || canAccessFeature("order-prices")}
      currency="BBD"
    />
  ) : (
    <div className="p-12 text-center text-sm text-muted-foreground">
      {draftId && !draftSettled ? "Loading your saved prescription…" : "Preparing your Rx order…"}
    </div>
  );
};

export default PortalRxOrderForm;
