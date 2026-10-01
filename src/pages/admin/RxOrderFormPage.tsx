import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RxOrderEmbed from "@/features/rx-order/RxOrderEmbed";
import { savedRxPayload } from "@/features/rx-order/embed/rx-order-adapter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FlaskConical } from "lucide-react";
import "./rx-order-form-page.css";

// Admin surface for the ported prototype Rx order form. /new-rx opens a blank
// form WITHOUT creating anything: the quote comes into being on the first real
// save (save_rx_order), so opening and abandoning the page leaves no orphan
// quote behind. /quotations/rx/:id re-opens a saved one.
// The form itself is the verbatim prototype (see features/rx-order/embed).
const RxOrderFormPage = () => {
  const { id: routeQuoteId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  // A saved quote's number, once the first save has created it.
  const [created, setCreated] = useState<{ id: string; number: string | null } | null>(null);
  // Bumped by "Another" to give the form a fresh, quote-less start.
  const [formKey, setFormKey] = useState(0);

  // /quotations/rx/:id and /quotations/new-rx render this same component, so
  // React Router does not remount it between them. The embed's key follows the
  // route id, so it remounts; this clears the "saved as" label with it.
  useEffect(() => { setCreated(null); }, [routeQuoteId]);

  const quoteId = routeQuoteId ?? null;
  const { data: quote, isFetched: quoteFetched } = useQuery({
    queryKey: ["rx-order-quote-header", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quotes") as any)
        .select("id, quote_number, rx_payload, notes_internal").eq("id", quoteId).single();
      if (error) throw error;
      return data;
    },
  });
  const quoteNumber = quote?.quote_number ?? created?.number ?? null;
  // A saved quote reopens with its order replayed into the form; without this
  // the form would open blank and the next autosave would overwrite the quote.
  const prefill = useMemo(() => savedRxPayload(quote), [quote]);

  return (
    <div className="min-h-0 rx-order-admin-shell">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate("/admin/orders/quotations")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Quotations
        </Button>
        {quoteNumber && (
          <span className="text-[11px] text-muted-foreground">Saved as quote <span className="font-mono">{quoteNumber}</span></span>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 ml-auto" onClick={() => navigate("/admin/orders/rx-test")}>
          <FlaskConical className="h-3.5 w-3.5" /> Test bench
        </Button>
      </div>
      {quoteId && !quoteFetched ? (
        <div className="text-xs text-muted-foreground p-6">Opening order…</div>
      ) : (
      <RxOrderEmbed
        key={`${routeQuoteId ?? "new"}:${formKey}`}
        quoteId={quoteId}
        quoteNumber={quote?.quote_number}
        prefill={prefill ?? undefined}
        prefillBanner={prefill && quote ? `Reopened saved order <b>${quote.quote_number}</b>.` : undefined}
        surface="admin"
        checkoutPath="/checkout"
        storePath="/store"
        onQuoteCreated={({ quoteId: id, quoteNumber: number }) => {
          setCreated({ id, number });
          // Point the address bar at the saved quote WITHOUT a router
          // navigation: that would remount the form mid-entry.
          window.history.replaceState(window.history.state, "", `/admin/orders/quotations/rx/${id}`);
        }}
        onStartAnother={() => {
          setCreated(null);
          window.history.replaceState(window.history.state, "", "/admin/orders/quotations/new-rx");
          setFormKey((k) => k + 1);
        }}
      />
      )}
    </div>
  );
};

export default RxOrderFormPage;
