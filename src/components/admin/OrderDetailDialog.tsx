import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Printer, CheckCircle, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeError } from "@/lib/safeLog";
import type { AdminOrderRow } from "@/hooks/useAdminOrders";
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
    window.print();
  };

  const addr = fullOrder?.shipping_address as any;
  const next = STATUS_NEXT[order.status];

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
          <Button variant="outline" onClick={print}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
          {next && (
            <Button onClick={advance} disabled={updating}>
              {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <next.icon className="mr-1.5 h-4 w-4" />}
              {next.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
