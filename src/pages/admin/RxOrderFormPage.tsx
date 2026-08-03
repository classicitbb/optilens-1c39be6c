import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import RxOrderEmbed from "@/features/rx-order/RxOrderEmbed";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Admin surface for the ported prototype Rx order form. Fast-path entry
// (/admin/website/quotations/new-rx) creates a blank RX quote and drops
// straight into the form; /admin/website/quotations/rx/:id re-opens one.
// The form itself is the verbatim prototype (see features/rx-order/embed).
const RxOrderFormPage = () => {
  const { id: routeQuoteId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createMutation } = useQuotes();
  const [quoteId, setQuoteId] = useState<string | null>(routeQuoteId ?? null);
  const creatingRef = useRef(false);

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
    if (quoteId || creatingRef.current) return;
    creatingRef.current = true;
    createMutation.mutate(
      { quote_type: "RX" },
      {
        onSuccess: (q) => {
          setQuoteId(q.id);
          navigate(`/admin/website/quotations/rx/${q.id}`, { replace: true });
        },
        onError: (e: any) => {
          toast({ title: "Could not start an Rx order", description: e.message, variant: "destructive" });
          navigate("/admin/website/quotations");
        },
      },
    );
  }, [quoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-0">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate("/admin/website/quotations")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Quotations
        </Button>
        {quote?.quote_number && (
          <span className="text-[11px] text-muted-foreground">Saved as quote <span className="font-mono">{quote.quote_number}</span></span>
        )}
      </div>
      {quoteId ? (
        <RxOrderEmbed
          quoteId={quoteId}
          quoteNumber={quote?.quote_number}
          surface="admin"
          checkoutPath="/checkout"
          storePath="/store"
        />
      ) : (
        <div className="text-xs text-muted-foreground p-6">Creating order…</div>
      )}
    </div>
  );
};

export default RxOrderFormPage;
