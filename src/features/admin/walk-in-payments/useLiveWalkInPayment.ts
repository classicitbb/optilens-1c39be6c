import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Watches one walk-in payment while the customer is paying on their own device.
 *
 * Realtime is the fast path, but a missed event here means a cashier either
 * hands over glasses that were not paid for or holds on to glasses that were —
 * so a slow poll backs it up. Both stop as soon as the row leaves `pending`.
 */
export const useLiveWalkInPayment = (
  paymentId: string | undefined,
  isPending: boolean,
  onChange: () => void,
) => {
  useEffect(() => {
    if (!paymentId || !isPending) return;

    const channel = supabase
      .channel(`walk-in-payment:${paymentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "walk_in_payments", filter: `id=eq.${paymentId}` },
        () => onChange(),
      )
      .subscribe();

    const poll = window.setInterval(onChange, 8000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [isPending, onChange, paymentId]);
};
