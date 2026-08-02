import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes } from "@/hooks/useQuotes";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";
import RxOrderEmbed from "@/features/rx-order/RxOrderEmbed";

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
      <div className="p-12 text-center text-sm text-muted-foreground max-w-lg mx-auto">
        Your portal account isn't linked to a trading account yet, so Rx ordering is not
        available. Contact Classic Visions to finish setting up your account.
      </div>
    );
  }

  return quoteId ? (
    <RxOrderEmbed
      quoteId={quoteId}
      quoteNumber={quote?.quote_number}
      surface="portal"
      lockedAccountId={lockedAccountId}
      checkoutPath="/checkout"
      storePath="/store"
    />
  ) : (
    <div className="p-12 text-center text-sm text-muted-foreground">Preparing your Rx order…</div>
  );
};

export default RxOrderPage;
