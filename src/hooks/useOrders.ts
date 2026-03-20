import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { OrderEntity } from "@/domain/entities";
import { toOrderEntity } from "@/domain/services/recordMappers";
import type { CheckoutFormData } from "@/components/CheckoutDialog";
import { sanitizeProfileAddress } from "@/lib/profileData";

export const useOrders = () => {
  const [orders, setOrders] = useState<OrderEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items, error: itemsError } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          if (itemsError) throw itemsError;

          return {
            ...order,
            items: items || [],
          };
        })
      );

      setOrders(ordersWithItems.map(toOrderEntity));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (
    cartItems: {
      id: string;
      product_id: number;
      product_name: string;
      product_price: number;
      quantity: number;
    }[],
    totalAmount: number,
    checkout?: CheckoutFormData
  ): Promise<OrderEntity | null> => {
    if (!user || cartItems.length === 0) return null;

    try {
      if (checkout) {
        await supabase
          .from("profiles")
          .update({
            full_name: checkout.fullName,
            display_name: checkout.fullName,
            phone: checkout.phone,
            shipping_address: sanitizeProfileAddress(checkout.shippingAddress),
            billing_address: sanitizeProfileAddress(checkout.billingAddress),
          } as never)
          .eq("user_id", user.id);
      }

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          customer_name: checkout?.fullName ?? null,
          contact_email: checkout?.email ?? user.email ?? null,
          contact_phone: checkout?.phone ?? null,
          shipping_address: checkout ? sanitizeProfileAddress(checkout.shippingAddress) : null,
          billing_address: checkout ? sanitizeProfileAddress(checkout.billingAddress) : null,
          checkout_method: checkout?.checkoutMethod ?? "manual",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
      }));

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select();

      if (itemsError) throw itemsError;

      const newOrder = toOrderEntity({
        ...order,
        items: items || [],
      });

      setOrders((prev) => [newOrder, ...prev]);

      return newOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to create order.",
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
