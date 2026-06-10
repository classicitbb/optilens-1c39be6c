import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeError } from "@/lib/safeLog";

export interface AdminOrderRow {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  checkoutMethod: string;
  customerName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  paymentStatus: string | null;
  paymentProvider: string | null;
}

const toAdminOrderRow = (row: Record<string, any>): AdminOrderRow => ({
  id: row.id,
  userId: row.user_id,
  status: row.status,
  totalAmount: Number(row.total_amount ?? 0),
  checkoutMethod: row.checkout_method ?? "",
  customerName: row.customer_name ?? null,
  contactEmail: row.contact_email ?? null,
  contactPhone: row.contact_phone ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  paymentStatus: row.payment_status ?? null,
  paymentProvider: row.payment_provider ?? null,
});

export const useAdminOrders = (statusFilter?: string) => {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("get_all_orders_admin", {
        p_status_filter: statusFilter ?? null,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      setOrders((data ?? []).map(toAdminOrderRow));
    } catch (error) {
      safeError("Error fetching admin orders:", error);
      toast({
        title: "Could not load orders",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  const approvePayment = async (orderId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase.rpc as any)("approve_pending_payment", {
        p_order_id: orderId,
      });
      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "confirmed", paymentStatus: "settled" }
            : o,
        ),
      );
      toast({ title: "Payment approved", description: "Order confirmed and ready to fulfil." });
      return true;
    } catch (error) {
      safeError("Error approving payment:", error);
      toast({
        title: "Error approving payment",
        description: error instanceof Error ? error.message : "Failed to approve payment.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { orders, loading, fetchOrders, approvePayment };
};
