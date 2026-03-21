import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EMPTY_ADDRESS, type ProfileAddress } from "@/lib/profileData";

export interface CustomerAddress extends ProfileAddress {
  id: string;
  label: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string;
}

export interface SaveCustomerAddressInput extends ProfileAddress {
  id?: string;
  label: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

const mapRow = (row: Record<string, any>): CustomerAddress => ({
  id: String(row.id),
  label: String(row.label ?? "Address"),
  recipient: String(row.recipient ?? ""),
  line1: String(row.line1 ?? ""),
  line2: String(row.line2 ?? ""),
  city: String(row.city ?? ""),
  state: String(row.state ?? ""),
  postalCode: String(row.postal_code ?? ""),
  country: String(row.country ?? ""),
  isDefaultShipping: row.is_default_shipping === true,
  isDefaultBilling: row.is_default_billing === true,
  createdAt: String(row.created_at ?? new Date(0).toISOString()),
});

export const toProfileAddress = (address?: CustomerAddress | null): ProfileAddress => ({
  recipient: address?.recipient ?? EMPTY_ADDRESS.recipient,
  line1: address?.line1 ?? EMPTY_ADDRESS.line1,
  line2: address?.line2 ?? EMPTY_ADDRESS.line2,
  city: address?.city ?? EMPTY_ADDRESS.city,
  state: address?.state ?? EMPTY_ADDRESS.state,
  postalCode: address?.postalCode ?? EMPTY_ADDRESS.postalCode,
  country: address?.country ?? EMPTY_ADDRESS.country,
});

export const useCustomerAddresses = (targetUserId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = targetUserId ?? user?.id ?? null;

  const query = useQuery({
    queryKey: ["customer-addresses", effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_addresses")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return ((data ?? []) as Record<string, any>[]).map(mapRow);
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-addresses", effectiveUserId] });
  };

  const saveAddress = useMutation({
    mutationFn: async (input: SaveCustomerAddressInput) => {
      if (!effectiveUserId) throw new Error("No user selected.");

      const payload = {
        user_id: effectiveUserId,
        label: input.label.trim() || "Address",
        recipient: input.recipient.trim(),
        line1: input.line1.trim(),
        line2: input.line2.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        postal_code: input.postalCode.trim(),
        country: input.country.trim(),
        is_default_shipping: input.isDefaultShipping ?? false,
        is_default_billing: input.isDefaultBilling ?? false,
      };

      if (input.id) {
        const { error } = await (supabase as any)
          .from("customer_addresses")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }

      const { data, error } = await (supabase as any)
        .from("customer_addresses")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return String(data.id);
    },
    onSuccess: invalidate,
  });

  const removeAddress = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await (supabase as any)
        .from("customer_addresses")
        .delete()
        .eq("id", addressId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const defaultShipping = useMemo(
    () => query.data?.find((address) => address.isDefaultShipping) ?? query.data?.[0] ?? null,
    [query.data],
  );
  const defaultBilling = useMemo(
    () => query.data?.find((address) => address.isDefaultBilling) ?? defaultShipping ?? null,
    [query.data, defaultShipping],
  );

  return {
    ...query,
    addresses: query.data ?? [],
    defaultShipping,
    defaultBilling,
    saveAddress,
    removeAddress,
  };
};
