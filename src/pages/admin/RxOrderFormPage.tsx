import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuotes } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import RxOrderForm from "@/features/rx-order/RxOrderForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Fast-path entry (RX_ORDER_FORM_BUILD_PLAN.md §5): /admin/website/quotations/new-rx
// creates a blank RX quote and drops straight into the shared Rx Order Form —
// no type-picker modal. /admin/website/quotations/rx/:id re-opens an existing
// quote in the same form.
const RxOrderFormPage = () => {
  const { id: routeQuoteId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createMutation } = useQuotes();
  const [quoteId, setQuoteId] = useState<string | null>(routeQuoteId ?? null);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (quoteId || creatingRef.current) return;
    creatingRef.current = true;
    createMutation.mutate(
      { quote_type: "RX" },
      {
        onSuccess: (q) => {
          setQuoteId(q.id);
          // Make the URL shareable/reloadable without creating a second quote.
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
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/admin/website/quotations")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Quotations
        </Button>
        <h1 className="text-base font-semibold text-foreground">Rx Order Form</h1>
      </div>
      {quoteId ? (
        <RxOrderForm
          quoteId={quoteId}
          surface="admin"
          account={{ accountId: null, locked: false }}
          actions={{ print: true, cart: true }}
        />
      ) : (
        <div className="text-xs text-muted-foreground p-6">Creating order…</div>
      )}
    </div>
  );
};

export default RxOrderFormPage;
