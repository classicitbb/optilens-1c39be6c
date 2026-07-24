import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CircleX, Loader2, Printer, RotateCcw, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeError } from "@/lib/safeLog";
import type { AdminOrderRow } from "@/hooks/useAdminOrders";
import { printOrderDocument } from "@/features/admin/print/orderDocument";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_name: string;
  product_type: string;
  product_price: number;
  quantity: number;
  variant_label: string | null;
  sku: string | null;
}

interface Props {
  order: AdminOrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged?: () => void;
}

const STATUS_NEXT: Record<string, { label: string; next: string; icon: any }> = {
  confirmed: { label: "Mark as Shipped", next: "shipped", icon: Truck },
  processing: { label: "Mark as Shipped", next: "shipped", icon: Truck },
  pending: { label: "Mark as Shipped", next: "shipped", icon: Truck },
  shipped: { label: "Mark Completed", next: "completed", icon: CheckCircle },
};

const OrderDetailDialog = ({ order, open, onOpenChange, onStatusChanged }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fullOrder, setFullOrder] = useState<any>(null);
  const [returnToDraftOpen, setReturnToDraftOpen] = useState(false);
  const [cancelOrderOpen, setCancelOrderOpen] = useState(false);

  useEffect(() => {
    if (!order || !open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [{ data: itemRows }, { data: orderRow }] = await Promise.all([
          (supabase.from("order_items") as any)
            .select("id,product_name,product_type,product_price,quantity,variant_label,sku")
            .eq("order_id", order.id),
          (supabase.from("orders") as any)
            .select("shipping_address,billing_address,checkout_method,total_amount,status,created_at")
            .eq("id", order.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;
        setItems((itemRows ?? []) as OrderItem[]);
        setFullOrder(orderRow);
      } catch (e) {
        safeError("OrderDetailDialog load", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order, open]);

  if (!order) return null;

  const advance = async () => {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    setUpdating(true);
    try {
      const { error } = await (supabase.from("orders") as any)
        .update({ status: next.next, updated_at: new Date().toISOString() })
        .eq("id", order.id);
      if (error) throw error;
      toast({ title: `Order ${next.next}`, description: `Order moved to ${next.next}.` });
      onStatusChanged?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Could not update order",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const print = () => {
    const opened = printOrderDocument({
      id: order.id,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      status: order.status,
      customerName: order.customerName,
      contactEmail: order.contactEmail,
      contactPhone: order.contactPhone,
      shippingAddress: fullOrder?.shipping_address ?? null,
      checkoutMethod: order.checkoutMethod,
      items: items.map((item) => ({
        id: item.id,
        productName: item.product_name,
        productType: item.product_type,
        unitPrice: Number(item.product_price),
        quantity: item.quantity,
        variantLabel: item.variant_label,
        sku: item.sku,
      })),
    });
    if (!opened) {
      toast({
        title: "Print window blocked",
        description: "Allow pop-ups for this site, then try printing the order again.",
        variant: "destructive",
      });
    }
  };

  const returnToDraft = async () => {
    setUpdating(true);
    try {
      const { error } = await (supabase.rpc as any)("revert_on_account_order_to_draft", {
        p_order_id: order.id,
      });
      if (error) throw error;
      toast({
        title: "Order returned to draft",
        description: "The customer can restore the saved draft, update the items, and check out again.",
      });
      onStatusChanged?.();
      setReturnToDraftOpen(false);
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Could not return order to draft",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async (reason: "refund_requested" | "order_error") => {
    setUpdating(true);
    try {
      const { error } = await (supabase.rpc as any)("cancel_order", {
        p_order_id: order.id,
        p_reason: reason,
      });
      if (error) throw error;
      toast({
        title: "Order cancelled",
        description: reason === "refund_requested"
          ? "The refund request was recorded. Process the refund with the payment provider."
          : "The cancellation was recorded as an order error.",
      });
      onStatusChanged?.();
      setCancelOrderOpen(false);
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Could not cancel order",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const addr = fullOrder?.shipping_address as any;
  const next = STATUS_NEXT[order.status];
  const canCancel = ["draft", "pending_payment", "pending", "confirmed", "processing"].includes(order.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl print:shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Order <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
            <Badge variant="outline" className="capitalize">
              {order.status.replace(/_/g, " ")}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Placed {format(new Date(order.createdAt), "dd MMM yyyy, p")} · {order.checkoutMethod}
          </DialogDescription>
        </DialogHeader>

        <div id="order-print-region" className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Customer</div>
              <div className="mt-1 font-medium">{order.customerName ?? "—"}</div>
              <div className="text-muted-foreground">{order.contactEmail}</div>
              <div className="text-muted-foreground">{order.contactPhone}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Ship to</div>
              {addr ? (
                <div className="mt-1 text-muted-foreground">
                  {[addr.line1, addr.line2, addr.city, addr.region, addr.postal_code, addr.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              ) : (
                <div className="mt-1 text-muted-foreground">—</div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Items</div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-4 text-muted-foreground">No line items.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-1.5 text-left">Product</th>
                    <th className="py-1.5 text-right">Qty</th>
                    <th className="py-1.5 text-right">Unit</th>
                    <th className="py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b last:border-0">
                      <td className="py-1.5">
                        <div className="font-medium">{it.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.variant_label ?? it.product_type}
                          {it.sku && ` · ${it.sku}`}
                        </div>
                      </td>
                      <td className="py-1.5 text-right">{it.quantity}</td>
                      <td className="py-1.5 text-right">${Number(it.product_price).toFixed(2)}</td>
                      <td className="py-1.5 text-right font-medium">
                        ${(Number(it.product_price) * it.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Separator />
          <div className="flex justify-end gap-6 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={print} disabled={loading}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
          {order.checkoutMethod === "on_account" && order.status === "pending" && (
            <Button variant="outline" onClick={() => setReturnToDraftOpen(true)} disabled={updating}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Return to Draft
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelOrderOpen(true)} disabled={updating}>
              <CircleX className="mr-1.5 h-4 w-4" />
              Cancel Order
            </Button>
          )}
          {next && (
            <Button onClick={advance} disabled={updating}>
              {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <next.icon className="mr-1.5 h-4 w-4" />}
              {next.label}
            </Button>
          )}
        </DialogFooter>

        <AlertDialog open={returnToDraftOpen} onOpenChange={setReturnToDraftOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Return this account order to draft?</AlertDialogTitle>
              <AlertDialogDescription>
                The ordered items will be saved as a customer draft. The customer can restore it to their cart, change the items, and place a new order. This is available only before fulfilment starts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={returnToDraft} disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Return to Draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={cancelOrderOpen} onOpenChange={setCancelOrderOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
              <AlertDialogDescription>
                Choose the reason for the cancellation. A refund-request cancellation is recorded for processing; it does not issue a refund automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updating}>Keep order</AlertDialogCancel>
              <Button variant="outline" onClick={() => void cancelOrder("order_error")} disabled={updating}>
                Cancel — Order Error
              </Button>
              <Button variant="destructive" onClick={() => void cancelOrder("refund_requested")} disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel — Refund Requested
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
