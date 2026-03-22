import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (
    cartItems: {
      id: string;
      product_id: number;
      product_name: string;
      product_price: number;
      product_type: "lens" | "supply";
      quantity: number;
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

      setOrders((prev) => [newOrder, ...prev]);
      return newOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    orders,
    loading,
    createOrder,
    refetch: fetchOrders,
  };
};
