import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes } from "@/hooks/useQuotes";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import RxOrderEmbed from "@/features/rx-order/RxOrderEmbed";
import { useRxDraft } from "@/features/lens-assistant/api";
import { buildPrefillBanner, buildRxPrefillPayload } from "@/features/rx-order/prefill/rxOrderPrefill";

// Customer-portal surface of the Rx order form (linked from /profile's
// "Start an Rx order"). Same verbatim prototype UI as the admin surface;
// the only difference is the account: the signed-in B2B account is applied
// automatically and the branch picker is locked (per the CX plan).
const RxOrderPage = () => {
  const { toast } = useToast();
  const { createMutation } = useQuotes();
  const { identity, isLoading: identityLoading, isStaff } = usePortalIdentity();
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const creatingRef = useRef(false);

  // Lens Assistant handoff: /rx-order?draft=<rx_order_drafts.id>. The engine
  // reads its prefill once during init, so the form must not mount until the
  // draft query has settled — including when it fails or returns nothing, in
  // which case the user simply gets an empty form.
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft") ?? undefined;
  // isFetched rather than !isLoading: the query stays disabled until the auth
  // user is known, and a disabled query is not "loaded", it just isn't running.
  const { data: draft, isFetched: draftFetched, isError: draftError } = useRxDraft(draftId);
  const draftSettled = !draftId || draftFetched;
  const prefill = useMemo(() => (draft ? buildRxPrefillPayload(draft) : undefined), [draft]);
  const prefillBanner = useMemo(() => (draft ? buildPrefillBanner(draft) : undefined), [draft]);

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
    // Customers must be linked to an ERP account before ordering; staff may
    // open the unlocked form (full account picker) from this route too.
    if (lockedAccountId == null && !isStaff) return;
    creatingRef.current = true;
    createMutation.mutate(
      { quote_type: "RX", account_id: lockedAccountId },
      {
        onSuccess: (q) => setQuoteId(q.id),
        onError: (e: any) => toast({ title: "Could not start an Rx order", description: e.message, variant: "destructive" }),
      },
    );
  }, [quoteId, lockedAccountId, identityLoading, isStaff]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!identityLoading && lockedAccountId == null && !isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 p-12 text-center text-sm text-muted-foreground max-w-lg mx-auto">
          Your portal account isn't linked to a trading account yet, so Rx ordering is not
          available. Contact Classic Visions to finish setting up your account.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        {quoteId && draftSettled ? (
          <RxOrderEmbed
            quoteId={quoteId}
            quoteNumber={quote?.quote_number}
            surface="portal"
            lockedAccountId={lockedAccountId}
            checkoutPath="/checkout"
            storePath="/store"
            prefill={prefill}
            prefillBanner={prefillBanner}
          />
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {draftId && !draftSettled ? "Loading your saved prescription…" : "Preparing your Rx order…"}
          </div>
        )}
      </div>
    </div>
  );
};

export default RxOrderPage;
