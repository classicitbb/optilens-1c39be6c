import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import SecurityTrustBar from "@/components/checkout/SecurityTrustBar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createAuthHref } from "@/lib/authFlow";
import { prepareScotiaPayment, redirectToScotiaPayment, SCOTIA_RETURN_URL } from "@/lib/payments/scotiaConnect";

type CompletionState = "checking" | "success" | "declined" | "pending" | "error" | "not_found";

type OrderSnapshot = {
  id: string;
  status: string;
  total_amount: number;
  checkout_method: string | null;
};

type PaymentSnapshot = {
  status: string;
  provider: string;
};

const MAX_POLL_ATTEMPTS = 8;

/**
 * Final state for a Scotia redirect. The `scotia` query parameter is only a
 * transport hint from the callback; the visible result always comes from the
 * RLS-protected order and payment records belonging to the signed-in buyer.
 */
const OrderCompletePage = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId: routeOrderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order") ?? routeOrderId ?? null;
  const returnedOutcome = searchParams.get("scotia");
  const [state, setState] = useState<CompletionState>("checking");
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [payment, setPayment] = useState<PaymentSnapshot | null>(null);
  const [retrying, setRetrying] = useState(false);
  const pollAttempts = useRef(0);

  const loadOutcome = useCallback(async (): Promise<CompletionState> => {
    if (!orderId) {
      setState("error");
      return "error";
    }

    const [{ data: orderData, error: orderError }, { data: paymentData, error: paymentError }] = await Promise.all([
      (supabase as any)
        .from("orders")
        .select("id,status,total_amount,checkout_method")
        .eq("id", orderId)
        .maybeSingle(),
      (supabase as any)
        .from("order_payments")
        .select("status,provider")
        .eq("order_id", orderId)
        .eq("provider", "scotia")
        .maybeSingle(),
    ]);

    // RLS makes an order belonging to another account indistinguishable from
    // a missing one. Do not reveal any order or payment data in either case.
    if (orderError || paymentError || !orderData || !paymentData || orderData.checkout_method !== "scotia_ecom") {
      setOrder(null);
      setPayment(null);
      setState("not_found");
      return "not_found";
    }

    setOrder(orderData as OrderSnapshot);
    setPayment(paymentData as PaymentSnapshot);

    const nextState: CompletionState =
      orderData.status === "confirmed" && paymentData.status === "settled"
        ? "success"
        : paymentData.status === "failed" || orderData.status === "pending_payment"
          ? "declined"
          : "pending";
    setState(nextState);
    return nextState;
  }, [orderId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(createAuthHref({ mode: "signin", redirect: `${location.pathname}${location.search}` }), { replace: true });
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const nextState = await loadOutcome();
        if (!cancelled && nextState === "pending" && pollAttempts.current < MAX_POLL_ATTEMPTS) {
          pollAttempts.current += 1;
          timeout = setTimeout(poll, 1500);
        } else if (!cancelled && nextState === "pending") {
          setState(returnedOutcome === "success" ? "error" : "pending");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [authLoading, loadOutcome, location.pathname, location.search, navigate, returnedOutcome, user]);

  const retryPayment = async () => {
    if (!order || !payment || !["initiated", "failed"].includes(payment.status)) return;
    setRetrying(true);
    try {
      const prepared = await prepareScotiaPayment({
        chargetotal: Number(order.total_amount),
        responseSuccessURL: SCOTIA_RETURN_URL,
        responseFailURL: SCOTIA_RETURN_URL,
        orderId: order.id,
      });
      redirectToScotiaPayment(prepared);
    } catch {
      setRetrying(false);
      setState("error");
    }
  };

  const content = (() => {
    if (state === "checking" || state === "pending") {
      return {
        icon: <Loader2 className="h-9 w-9 animate-spin text-secondary" aria-hidden="true" />,
        title: "Confirming your payment",
        description: "We are checking the result returned by Scotiabank. This usually takes only a few seconds.",
      };
    }
    if (state === "success") {
      return {
        icon: <CheckCircle className="h-9 w-9 text-secondary" aria-hidden="true" />,
        title: "Payment received",
        description: "Your payment is confirmed and your order is now being processed.",
      };
    }
    if (state === "declined") {
      return {
        icon: <AlertCircle className="h-9 w-9 text-destructive" aria-hidden="true" />,
        title: "Payment declined",
        description: "Your bank did not approve this payment. Your order is reserved and you can try again.",
      };
    }
    if (state === "not_found") {
      return {
        icon: <AlertCircle className="h-9 w-9 text-destructive" aria-hidden="true" />,
        title: "Order unavailable",
        description: "We could not find a Scotia checkout belonging to this account.",
      };
    }
    return {
      icon: <AlertCircle className="h-9 w-9 text-destructive" aria-hidden="true" />,
      title: "Payment not confirmed",
      description: "We could not verify a completed payment. Your order has not been marked as paid.",
    };
  })();

  const canRetry = state === "declined" && !!order && !!payment && ["initiated", "failed"].includes(payment.status);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center px-4 pb-16 pt-24">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">{content.icon}</div>
          <h1 className="mb-2 text-2xl text-foreground">{content.title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{content.description}</p>
          {state === "success" && order && (
            <div className="mb-6 rounded-lg bg-muted/60 px-4 py-3 text-left">
              <p className="font-mono text-xs text-muted-foreground">Order reference</p>
              <p className="mt-0.5 break-all font-mono text-sm font-semibold text-secondary">{order.id}</p>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {canRetry && (
              <Button onClick={retryPayment} disabled={retrying} className="gap-1.5">
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                Retry payment
              </Button>
            )}
            {state === "success" ? (
              <Button asChild><Link to="/profile/orders">View my orders</Link></Button>
            ) : (
              <Button variant="outline" asChild><Link to="/profile/helpdesk">Contact us</Link></Button>
            )}
            <Button variant="outline" asChild><Link to="/store">Continue shopping</Link></Button>
          </div>
          <SecurityTrustBar compact className="mt-6 justify-center" />
        </div>
      </main>
    </div>
  );
};

export default OrderCompletePage;
