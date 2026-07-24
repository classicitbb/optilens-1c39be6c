// ============================================================
// OrderCompletePage — /order/:orderId
// ------------------------------------------------------------
// Landing page after a Scotia eCom+ payment. `scotia-return` redirects the
// buyer's browser here with `?scotia=success|declined|error` after settling
// the order server-side via the service role. We independently confirm the
// outcome by polling the order + latest payment row from Supabase (every 3s,
// up to ~60s) so the UI reflects the true database state, not just the
// query flag.
//
// States surfaced to the buyer:
//   • Pending  — payment row not yet marked settled/failed (rare — the
//                return endpoint settles synchronously; polling covers the
//                brief window between the redirect and the RPC commit)
//   • Approved — payment status = 'authorized' (approved, not yet fully
//                settled downstream)
//   • Settled  — payment status = 'settled' and order status advanced
//   • Failed   — payment status = 'failed' or scotia=declined/error
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { CheckCircle2, Clock, XCircle, ArrowRight, RefreshCcw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type PaymentStatus = "initiated" | "authorized" | "settled" | "failed" | "refunded" | "void" | "pending_review";
type OrderStatus = "draft" | "pending" | "pending_payment" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";

interface OrderRow {
  id: string;
  status: OrderStatus;
  total_amount: number | null;
  created_at: string;
  checkout_method: string | null;
}

interface PaymentRow {
  id: string;
  status: PaymentStatus;
  amount: number | null;
  provider: string | null;
  card_brand: string | null;
  card_last4: string | null;
  gateway_oid: string | null;
  gateway_response_code: string | null;
  gateway_fail_rc: string | null;
  updated_at: string;
}

type Phase = "loading" | "pending" | "approved" | "settled" | "failed" | "not-found" | "unauthorized";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 60000;

function derivePhase(
  order: OrderRow | null,
  payment: PaymentRow | null,
  scotiaFlag: string | null,
): Phase {
  if (!order) return "not-found";
  if (scotiaFlag === "declined" || scotiaFlag === "error") {
    if (payment?.status === "settled") return "settled";
    return "failed";
  }
  if (!payment) return "pending";
  switch (payment.status) {
    case "settled":
      return "settled";
    case "authorized":
      return "approved";
    case "failed":
    case "void":
      return "failed";
    default:
      return "pending";
  }
}

export default function OrderCompletePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const scotiaFlag = searchParams.get("scotia");
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [pollElapsed, setPollElapsed] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!orderId) {
      setPhase("not-found");
      return;
    }
    if (!user) {
      setPhase("unauthorized");
      return;
    }

    let cancelled = false;
    const start = Date.now();

    const fetchOnce = async () => {
      const [orderRes, paymentRes] = await Promise.all([
        supabase.from("orders").select("id,status,total_amount,created_at,checkout_method").eq("id", orderId).maybeSingle(),
        supabase
          .from("order_payments")
          .select("id,status,amount,provider,card_brand,card_last4,gateway_oid,gateway_response_code,gateway_fail_rc,updated_at")
          .eq("order_id", orderId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      const nextOrder = (orderRes.data as OrderRow | null) ?? null;
      const nextPayment = (paymentRes.data as PaymentRow | null) ?? null;
      setOrder(nextOrder);
      setPayment(nextPayment);
      const nextPhase = derivePhase(nextOrder, nextPayment, scotiaFlag);
      setPhase(nextPhase);
      setPollElapsed(Date.now() - start);
      return nextPhase;
    };

    (async () => {
      const initial = await fetchOnce();
      // Poll while pending (payment hasn't landed) — the return endpoint settles
      // synchronously, so this window is usually <1s but occasionally the
      // browser races the RPC commit.
      if (initial === "pending") {
        const interval = window.setInterval(async () => {
          const elapsed = Date.now() - start;
          if (elapsed >= POLL_MAX_MS) {
            window.clearInterval(interval);
            return;
          }
          const next = await fetchOnce();
          if (next && next !== "pending") {
            window.clearInterval(interval);
          }
        }, POLL_INTERVAL_MS);
        return () => window.clearInterval(interval);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, user, authLoading, scotiaFlag, refreshTick]);

  const currency = useMemo(() => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  }, []);

  if (phase === "loading" || authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (phase === "unauthorized") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardHeader><CardTitle>Sign in to view this order</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to be signed in to see order {orderId?.slice(0, 8)}…
            </p>
            <Button asChild>
              <Link to={`/auth?redirect=${encodeURIComponent(`/order/${orderId}${scotiaFlag ? `?scotia=${scotiaFlag}` : ""}`)}`}>Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "not-found") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardHeader><CardTitle>Order not found</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">We couldn't find that order under your account.</p>
            <Button asChild variant="outline"><Link to="/profile/orders">Back to my orders</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = phase === "settled" ? CheckCircle2
    : phase === "approved" ? CheckCircle2
    : phase === "failed" ? XCircle
    : Clock;

  const iconClass = phase === "settled" || phase === "approved" ? "text-emerald-600"
    : phase === "failed" ? "text-destructive"
    : "text-amber-600";

  const heading = phase === "settled" ? "Payment settled"
    : phase === "approved" ? "Payment approved"
    : phase === "failed" ? (scotiaFlag === "declined" ? "Payment declined" : "Payment did not complete")
    : "Confirming your payment…";

  const subheading = phase === "settled" ? "Your order is confirmed and your card has been charged."
    : phase === "approved" ? "The gateway approved your card. We're finalizing your order."
    : phase === "failed" ? "The transaction was not approved. Your card was not charged."
    : `We're waiting for the payment gateway to confirm. ${Math.max(0, Math.ceil((POLL_MAX_MS - pollElapsed) / 1000))}s remaining…`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <StatusIcon className={`h-10 w-10 shrink-0 ${iconClass}`} aria-hidden="true" />
            <div className="flex-1">
              <CardTitle className="text-2xl">{heading}</CardTitle>
              <p className="text-muted-foreground mt-1">{subheading}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Order reference</div>
              <div className="font-mono text-xs break-all">{order?.id}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Order status</div>
              <div><Badge variant="outline">{order?.status ?? "—"}</Badge></div>
            </div>
            <div>
              <div className="text-muted-foreground">Payment status</div>
              <div>
                <Badge variant={phase === "failed" ? "destructive" : "outline"}>
                  {payment?.status ?? (phase === "pending" ? "pending" : "—")}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Amount</div>
              <div className="font-medium">
                {order?.total_amount != null ? currency.format(order.total_amount) : "—"}
              </div>
            </div>
            {payment?.card_brand && (
              <div>
                <div className="text-muted-foreground">Card</div>
                <div>{payment.card_brand} •••• {payment.card_last4 ?? "----"}</div>
              </div>
            )}
            {payment?.gateway_response_code && (
              <div>
                <div className="text-muted-foreground">Gateway code</div>
                <div className="font-mono text-xs">{payment.gateway_response_code}{payment.gateway_fail_rc ? ` / ${payment.gateway_fail_rc}` : ""}</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {phase === "pending" && (
              <Button variant="outline" onClick={() => setRefreshTick((t) => t + 1)}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Refresh now
              </Button>
            )}
            {(phase === "settled" || phase === "approved") && (
              <Button asChild>
                <Link to="/profile/orders">View my orders <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            )}
            {phase === "failed" && (
              <>
                <Button asChild>
                  <Link to="/checkout">Try again</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/profile/orders">Back to my orders</Link>
                </Button>
              </>
            )}
            <Button asChild variant="ghost">
              <Link to="/store">Continue shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
