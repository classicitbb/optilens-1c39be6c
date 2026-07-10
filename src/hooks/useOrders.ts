import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { safeError, safeWarn } from "@/lib/safeLog";
import type { OrderEntity } from "@/domain/entities";
import { toOrderEntity } from "@/domain/services/recordMappers";
import type { CheckoutFormData } from "@/components/CheckoutDialog";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (typeof error === "object" && error !== null) {
    const message = "message" in error ? String(error.message ?? "") : "";
    const details = "details" in error ? String(error.details ?? "") : "";
    return message || details || "Failed to create order.";
  }
  return "Failed to create order.";
};

export const useOrders = (targetUserId?: string) => {
  const [orders, setOrders] = useState<OrderEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const effectiveUserId = targetUserId ?? user?.id ?? null;

  const fetchOrders = useCallback(async () => {
    if (!effectiveUserId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const { data: ordersData, error: ordersError } = await (supabase as any)
        .from("orders")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const [{ data: items, error: itemsError }, { data: payments, error: paymentsError }] = await Promise.all([
            (supabase as any)
              .from("order_items")
              .select("*")
              .eq("order_id", order.id),
            (supabase as any)
              .from("order_payments")
              .select("*")
              .eq("order_id", order.id)
              .order("created_at", { ascending: false }),
          ]);

          if (itemsError) throw itemsError;
          if (paymentsError) throw paymentsError;

          return {
            ...order,
            items: items || [],
            payments: payments || [],
          };
        }),
      );

      setOrders(ordersWithDetails.map(toOrderEntity));
    } catch (error) {
      safeError("Error fetching orders:", error);
      setOrders([]);
      toast({
        title: "Could not load orders",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (
    cartItems: {
      id: string;
      product_id: number;
      product_name: string;
      product_price: number;
      product_type: "lens" | "supply" | "addon";
      quantity: number;
      variant_id?: string | null;
      variant_label?: string | null;
      variant_sku?: string | null;
      variant_opc_code?: string | null;
      variant_metadata?: Record<string, unknown> | null;
    }[],
    totalAmount: number,
    checkout?: CheckoutFormData,
    actorUserId?: string,
  ): Promise<OrderEntity | null> => {
    if (!effectiveUserId || cartItems.length === 0 || !checkout) return null;

    try {
      const payload = {
        full_name: checkout.fullName,
        email: checkout.email || user?.email || "",
        phone: checkout.phone,
        shipping_address_id: checkout.shippingAddressId,
        billing_address_id: checkout.billingAddressId,
        shipping_address: checkout.shippingAddress,
        billing_address: checkout.billingAddress,
        payment_method_id: checkout.paymentMethodId,
        checkout_method: checkout.checkoutMethod,
        save_payment_method: checkout.savePaymentMethod,
        cardholder_name: checkout.cardholderName,
        card_brand: checkout.cardBrand,
        card_last4: checkout.cardLast4,
        expiry_month: checkout.expiryMonth,
        expiry_year: checkout.expiryYear,
      };

      const { data, error } = await (supabase.rpc as any)("place_customer_order", {
        p_target_user_id: effectiveUserId,
        p_items: cartItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          product_type: item.product_type,
          quantity: item.quantity,
          variant_id: item.variant_id ?? null,
          variant_label: item.variant_label ?? null,
          variant_sku: item.variant_sku ?? null,
          variant_opc_code: item.variant_opc_code ?? null,
          variant_metadata: item.variant_metadata ?? {},
        })),
        p_checkout: payload,
        p_actor_user_id: actorUserId ?? user?.id ?? effectiveUserId,
      });

      if (error) throw error;

      const orderId = Array.isArray(data) ? data[0] : data;
      if (!orderId) throw new Error("Order placement did not return an order id.");

      const [{ data: order, error: orderError }, { data: items, error: itemsError }, { data: payments, error: paymentsError }] = await Promise.all([
        (supabase as any).from("orders").select("*").eq("id", orderId).single(),
        (supabase as any).from("order_items").select("*").eq("order_id", orderId),
        (supabase as any).from("order_payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      ]);

      if (orderError) throw orderError;
      if (itemsError) throw itemsError;
      if (paymentsError) throw paymentsError;

      const newOrder = toOrderEntity({
        ...order,
        total_amount: order.total_amount ?? totalAmount,
        items: items || [],
        payments: payments || [],
      });

      supabase.functions.invoke("order-confirmation", {
        body: { orderId },
      }).catch((emailError) => {
        safeWarn("Failed to queue order confirmation email:", emailError);
      });

      setOrders((prev) => [newOrder, ...prev]);
      return newOrder;
    } catch (error) {
      safeError("Error creating order:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Record a verified Scotia eCom+ gateway outcome against an existing order.
   * The response hash is validated server-side (scotia-payment Edge Function)
   * before this is called; `gateway` carries only whitelisted, verified fields.
   */
  const settleScotiaPayment = async (
    orderId: string,
    gateway: {
      approved: boolean;
      oid?: string | null;
      association_response_code?: string | null;
      fail_rc?: string | null;
      hosteddataid?: string | null;
      card_brand?: string | null;
      card_last4?: string | null;
      cardholder_name?: string | null;
      expiry_month?: number | null;
      expiry_year?: number | null;
      save_token?: boolean;
    },
    actorUserId?: string,
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase.rpc as any)("settle_scotia_payment", {
        p_order_id: orderId,
        p_gateway: gateway,
        p_actor_user_id: actorUserId ?? user?.id ?? effectiveUserId,
      });
      if (error) throw error;
      await fetchOrders();
      return true;
    } catch (error) {
      safeError("Error settling Scotia payment:", error);
      toast({
        title: "Payment recorded with issues",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const approvePayment = async (orderId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase.rpc as any)("approve_pending_payment", {
        p_order_id: orderId,
      });
      if (error) throw error;

      // Optimistically update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "confirmed" as const, payments: o.payments.map((p) => ({ ...p, status: "settled" as const })) }
            : o,
        ),
      );

      toast({
        title: "Payment approved",
        description: "The order has been confirmed and moved to processing.",
      });
      return true;
    } catch (error) {
      safeError("Error approving payment:", error);
      toast({
        title: "Error approving payment",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    orders,
    loading,
    createOrder,
    settleScotiaPayment,
    approvePayment,
    refetch: fetchOrders,
  };
};
