// /profile/orders/rx/:id — one Rx order for the customer: a read-only summary, the price
// lines, a status timeline, and the actions that are still open (edit, cancel, reorder,
// remake). Reads only through get_my_rx_order_status; the lab's internals never reach here.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Check, Circle, Loader2, Pencil, RotateCcw, Wrench, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import InquireButton from "@/components/account/InquireButton";
import { cn } from "@/lib/utils";
import { useCancelMyRxOrder, useMyRxOrder } from "./api";
import { rxActions, rxBrief, rxStage, rxTimeline, STAGE_LABELS } from "./lifecycle";
import { RxPayloadSummary } from "./RxPayloadSummary";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

export default function RxOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isStaff, canAccessFeature } = usePortalIdentity();
  const { data: order, isLoading, error } = useMyRxOrder(id);
  const cancel = useCancelMyRxOrder();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !order) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="font-semibold">Rx order not found</p>
        <p className="mt-1 text-sm text-muted-foreground">It may belong to another account, or it was removed.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/profile/orders">Back to order history</Link></Button>
      </CardContent></Card>
    );
  }

  const stage = rxStage(order);
  const steps = rxTimeline(order);
  const actions = rxActions(order);
  const brief = rxBrief(order.payload);
  const showPrices = isStaff || canAccessFeature("order-prices");
  const title = `Rx order${order.rx_order_number != null ? ` #${order.rx_order_number}` : ""}`;
  const canWrite = isStaff || canAccessFeature("rx-order");

  // The summary's own price block mirrors the saved payload; hide it where prices are not shown.
  const payload = order.payload ? { ...order.payload, quote: order.payload.quote ? { ...order.payload.quote, hidden: !showPrices } : null } : {};

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild><Link to="/profile/orders"><ArrowLeft className="mr-2 h-4 w-4" />Back to order history</Link></Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[brief.patient, brief.reference && `Ref ${brief.reference}`, `Placed ${when(order.created_at)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge variant={stage === "cancelled" ? "outline" : "secondary"} className="text-xs">{STAGE_LABELS[stage]}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
        <CardContent>
          {stage === "cancelled" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><XCircle className="h-4 w-4" />This order was cancelled.</p>
          ) : (
            <ol className="grid gap-3 sm:grid-cols-5" aria-label="Order progress">
              {steps.map((s) => (
                <li key={s.stage} className={cn("flex items-start gap-2 text-sm", s.state === "todo" && "text-muted-foreground")} aria-current={s.state === "current" ? "step" : undefined}>
                  {s.state === "done" ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    : s.state === "current" ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    : <Circle className="mt-0.5 h-4 w-4 shrink-0 opacity-40" aria-hidden />}
                  <span>
                    <span className={cn("block font-medium", s.state === "current" && "text-primary")}>{s.label}</span>
                    {s.at ? <span className="block text-xs text-muted-foreground">{when(s.at)}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {order.lab_status && stage !== "cancelled" ? <p className="mt-3 text-xs text-muted-foreground">Lab status: <span className="font-medium text-foreground">{order.lab_status}</span>{order.lab_status_at ? ` · ${when(order.lab_status_at)}` : ""}</p> : null}
          {stage === "submitted" ? <p className="mt-3 text-xs text-muted-foreground">Classic Visions checks every order before it goes to the lab. Until then you can still edit or cancel it.</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {actions.edit && canWrite ? <Button asChild><Link to={`/profile/rx-order?edit=${order.quote_id}`}><Pencil className="mr-2 h-4 w-4" />Edit order</Link></Button> : null}
        {actions.reorder && canWrite ? <Button asChild variant="outline"><Link to={`/profile/rx-order?from=${order.quote_id}&as=reorder`}><RotateCcw className="mr-2 h-4 w-4" />Reorder (new frame)</Link></Button> : null}
        {actions.remake && canWrite ? <Button asChild variant="outline"><Link to={`/profile/rx-order?from=${order.quote_id}&as=remake`}><Wrench className="mr-2 h-4 w-4" />Remake / warranty</Link></Button> : null}
        {actions.cancel ? <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmCancel(true)}><XCircle className="mr-2 h-4 w-4" />Cancel order</Button> : null}
        <InquireButton
          label="Ask about this order"
          title={`Inquiry about ${title}`}
          description={[title, brief.patient ? `Patient: ${brief.patient}` : null, `Status: ${STAGE_LABELS[stage]}`, "", "Question: "].filter((l) => l !== null).join("\n")}
        />
      </div>
      {actions.cancelBlocked ? <p className="text-sm text-muted-foreground">{actions.cancelBlocked}</p> : null}

      <RxPayloadSummary payload={payload} patientFallback={brief.patient || title} />

      {showPrices && order.lines?.length ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Charges</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {order.lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-4"><span>{l.item_name}{l.qty !== 1 ? ` × ${l.qty}` : ""}</span><span className="font-medium tabular-nums">{(Number(l.unit_price) * Number(l.qty)).toFixed(2)}</span></div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Total ({order.currency ?? "BBD"})</span><span className="tabular-nums">{Number(order.total ?? 0).toFixed(2)}</span></div>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this Rx order?</AlertDialogTitle>
            <AlertDialogDescription>It has not gone to the lab yet, so nothing is lost. You can reorder it later from your order history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try { await cancel.mutateAsync(order.quote_id); toast({ title: "Order cancelled" }); navigate("/profile/orders"); }
              catch (e: any) { toast({ title: "Could not cancel the order", description: e?.message, variant: "destructive" }); }
            }}>Cancel order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
