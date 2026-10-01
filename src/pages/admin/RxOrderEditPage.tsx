import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RxForm from "@/features/rx-order/form/RxForm";
import { savedRxPayload } from "@/features/rx-order/embed/rx-order-adapter";
import { Button } from "@/components/ui/button";

// Admin surface for the React Rx form. /admin/orders/rx/new starts a blank order
// WITHOUT creating anything (the quote comes into being on the first save);
// /admin/orders/rx/:quoteId/edit reopens a saved one, which stays editable until it
// is released (save_rx_order refuses a released order). Release, retry and cancel
// happen in the Rx Orders workspace.
export default function RxOrderEditPage() {
  const { quoteId: routeQuoteId } = useParams<{ quoteId?: string }>();
  const navigate = useNavigate();
  const [created, setCreated] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const { data: quote, isFetched, error } = useQuery({
    queryKey: ["rx-order-edit-quote", routeQuoteId],
    enabled: !!routeQuoteId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quotes") as any)
        .select("id, quote_number, status, rx_payload, notes_internal").eq("id", routeQuoteId).single();
      if (error) throw error;
      return data;
    },
  });
  const prefill = useMemo(() => savedRxPayload(quote), [quote]);
  const quoteNumber = quote?.quote_number ?? null;

  return (
    <div className="min-h-0">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigate("/admin/orders/rx")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Rx Orders
        </Button>
        {quoteNumber && <span className="text-[11px] text-muted-foreground">Quote <span className="font-mono">{quoteNumber}</span></span>}
        <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={() => navigate("/admin/orders/rx-test")}>
          <FlaskConical className="h-3.5 w-3.5" /> Test bench
        </Button>
      </div>
      {routeQuoteId && !isFetched ? (
        <p className="p-6 text-xs text-muted-foreground">Opening order…</p>
      ) : error ? (
        <p className="p-6 text-xs text-destructive">This order could not be opened.</p>
      ) : (
        <RxForm
          key={`${routeQuoteId ?? "new"}:${formKey}`}
          quoteId={routeQuoteId ?? null}
          surface="admin"
          prefill={prefill ?? undefined}
          prefillBanner={prefill && quoteNumber ? `Reopened saved order <b>${quoteNumber}</b>.` : undefined}
          checkoutPath="/checkout"
          storePath="/store"
          onQuoteCreated={({ quoteId: id }) => {
            setCreated(id);
            // point the address bar at the saved quote WITHOUT a router navigation, which would remount the form mid-entry
            window.history.replaceState(window.history.state, "", `/admin/orders/rx/${id}/edit`);
          }}
          onStartAnother={() => {
            setCreated(null);
            window.history.replaceState(window.history.state, "", "/admin/orders/rx/new");
            setFormKey((k) => k + 1);
          }}
        />
      )}
      {created && !routeQuoteId && <p className="px-4 pb-4 text-[11px] text-muted-foreground">Saved. Release it from Rx Orders when it is ready.</p>}
    </div>
  );
}
