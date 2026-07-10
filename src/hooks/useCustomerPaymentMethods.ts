import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CustomerPaymentMethod {
  id: string;
  provider: "demo" | "scotia";
  paymentToken: string;
  cardholderName: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  status: "active" | "archived";
  createdAt: string;
}

export interface SaveCustomerPaymentMethodInput {
  id?: string;
  cardholderName: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
}

const mapRow = (row: Record<string, any>): CustomerPaymentMethod => ({
  id: String(row.id),
  provider: row.provider === "scotia" ? "scotia" : "demo",
  paymentToken: String(row.payment_token ?? ""),
  cardholderName: String(row.cardholder_name ?? ""),
  brand: String(row.brand ?? "Visa"),
  last4: String(row.last4 ?? "0000"),
  expiryMonth: Number(row.expiry_month ?? 1),
  expiryYear: Number(row.expiry_year ?? new Date().getFullYear()),
  isDefault: row.is_default === true,
  status: row.status === "archived" ? "archived" : "active",
  createdAt: String(row.created_at ?? new Date(0).toISOString()),
});

export const useCustomerPaymentMethods = (targetUserId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = targetUserId ?? user?.id ?? null;

  const query = useQuery({
    queryKey: ["customer-payment-methods", effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_payment_methods")
        .select("*")
        .eq("user_id", effectiveUserId)
        .neq("status", "archived")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Record<string, any>[]).map(mapRow);
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-payment-methods", effectiveUserId] });
  };

  const savePaymentMethod = useMutation({
    mutationFn: async (input: SaveCustomerPaymentMethodInput) => {
      if (!effectiveUserId) throw new Error("No user selected.");
      const normalizedLast4 = input.last4.replace(/\D/g, "").slice(-4).padStart(4, "0");
      const payload = {
        user_id: effectiveUserId,
        provider: "demo",
        payment_token: input.id ? undefined : `demo_${effectiveUserId}_${Date.now()}`,
        cardholder_name: input.cardholderName.trim(),
        brand: input.brand.trim() || "Visa",
        last4: normalizedLast4,
        expiry_month: input.expiryMonth,
        expiry_year: input.expiryYear,
        is_default: input.isDefault ?? false,
        is_demo: true,
      };

      if (input.id) {
        const { error } = await (supabase as any)
          .from("customer_payment_methods")
          .update({ ...payload, payment_token: undefined })
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }

      const { data, error } = await (supabase as any)
        .from("customer_payment_methods")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return String(data.id);
    },
    onSuccess: invalidate,
  });

  const archivePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { error } = await (supabase as any)
        .from("customer_payment_methods")
        .update({ status: "archived", is_default: false })
        .eq("id", paymentMethodId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const defaultPaymentMethod = useMemo(
    () => query.data?.find((method) => method.isDefault) ?? query.data?.[0] ?? null,
    [query.data],
  );

  return {
    ...query,
    paymentMethods: query.data ?? [],
    defaultPaymentMethod,
    savePaymentMethod,
    archivePaymentMethod,
  };
};
