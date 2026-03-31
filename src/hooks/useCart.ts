import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CartItem {
  id: string;
  product_id: number;
  product_name: string;
  product_price: number;
  product_type: "lens" | "supply" | "addon";
  variant_id?: string | null;
  variant_label?: string | null;
  variant_sku?: string | null;
  variant_opc_code?: string | null;
  variant_metadata?: Record<string, unknown> | null;
  quantity: number;
}

interface UseCartOptions {
  enabled?: boolean;
}

const getDefaultCartEnabled = () => {
  if (typeof window === "undefined") return true;
  return !window.location.pathname.startsWith("/admin");
};

const getErrorField = (error: unknown, field: "message" | "details") => {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return "";
  }

  return String((error as Record<string, unknown>)[field] ?? "");
};

const isExpectedCartError = (error: unknown) => {
  const candidateMessages = [
    error instanceof Error ? error.message : "",
    typeof error === "string" ? error : "",
    getErrorField(error, "message"),
    getErrorField(error, "details"),
  ].filter(Boolean);

  const combinedMessage = candidateMessages.join(" | ");
  return /Failed to fetch|permission denied|row-level security|not authorized/i.test(combinedMessage);
};

export const useCart = ({ enabled = getDefaultCartEnabled() }: UseCartOptions = {}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCart = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems((data || []).map((d) => ({ ...d, product_type: d.product_type as "lens" | "supply" | "addon" })));
    } catch (error) {
      if (!isExpectedCartError(error)) {
        console.error("Error fetching cart:", error);
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    fetchCart();
  }, [enabled, fetchCart]);

  const addToCart = async (product: {
    id: number;
    name: string;
    price: number;
    productType: "lens" | "supply" | "addon";
    variantId?: string;
    variantLabel?: string;
    variantSku?: string;
    variantOpcCode?: string;
    variantMetadata?: Record<string, unknown>;
    quantity?: number;
  }) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      return;
    }

    try {
      const quantityToAdd = Math.max(1, Math.floor(product.quantity ?? 1));

      // Check if item already exists
      const existingItem = items.find((item) => item.product_id === product.id && (item.variant_id ?? null) === (product.variantId ?? null));

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;

        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("id", existingItem.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setItems((prev) =>
          prev.map((item) => (item.id === existingItem.id ? { ...item, quantity: newQuantity } : item)),
        );
      } else {
        // Insert new item
        const cartInsertPayload = {
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          product_type: product.productType,
          quantity: quantityToAdd,
          variant_id: product.variantId ?? null,
          variant_label: product.variantLabel ?? null,
          variant_sku: product.variantSku ?? null,
          variant_opc_code: product.variantOpcCode ?? null,
          variant_metadata: product.variantMetadata ?? {},
        };

        const { data, error } = await supabase
          .from("cart_items")
          .insert(cartInsertPayload)
          .select()
          .single();

        if (error) throw error;
        setItems((prev) => [...prev, { ...data, product_type: data.product_type as "lens" | "supply" | "addon" }]);
      }

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to update your cart.",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 1) {
      return removeFromCart(itemId);
    }

    try {
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId).eq("user_id", user.id);

      if (error) throw error;

      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)));
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({
        title: "Error",
        description: "Failed to update quantity.",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to modify your cart.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId).eq("user_id", user.id);

      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== itemId));

      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart.",
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);

      if (error) throw error;

      setItems([]);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.product_price * item.quantity, 0);

  return {
    items,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice,
    refetch: fetchCart,
  };
};
