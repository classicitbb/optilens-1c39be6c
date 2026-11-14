import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_ADDRESS, type ProfileAddress } from "@/lib/profileData";

export interface ContactShippingAddress {
  /** "contact" = the person's own record, "company" = their parent company. */
  source: "contact" | "company";
  recipient: string;
  phone: string;
  address: ProfileAddress;
}

const isMissingFunction = (message?: string) =>
  /get_my_contact_shipping_address|update_my_contact_shipping_address|schema cache|Could not find the function/i.test(message ?? "");

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const sameAddress = (a: ProfileAddress, b: ProfileAddress) =>
  (["line1", "line2", "city", "state", "postalCode", "country"] as const).every(
    (key) => clean(a[key]).toLowerCase() === clean(b[key]).toLowerCase(),
  );

/**
 * The address on the signed-in customer's own CRM contact (or their company
 * when the person has none). Customers cannot read `contacts` directly, so
 * this goes through ownership-checked RPCs. Returns null while the migration
 * is not applied, so checkout keeps working without it.
 */
export const useContactShippingAddress = (contactId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ["contact-shipping-address", contactId ?? null];

  const query = useQuery({
    queryKey,
    enabled: !!contactId,
    staleTime: 60_000,
    queryFn: async (): Promise<ContactShippingAddress | null> => {
      const { data, error } = await (supabase.rpc as any)("get_my_contact_shipping_address", {
        p_contact_id: contactId,
      });
      if (error) {
        if (isMissingFunction(error.message)) return null;
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !clean(row.street)) return null;
      return {
        source: row.source === "company" ? "company" : "contact",
        recipient: clean(row.recipient),
        phone: clean(row.phone),
        address: {
          ...EMPTY_ADDRESS,
          recipient: clean(row.recipient),
          line1: clean(row.street),
          line2: clean(row.street2),
          city: clean(row.city),
          state: clean(row.state),
          postalCode: clean(row.zip),
          country: clean(row.country),
        },
      };
    },
  });

  /** Store an address the customer typed at checkout on their own contact. */
  const saveToContact = useCallback(
    async (address: ProfileAddress) => {
      if (!contactId || !clean(address.line1)) return false;
      const { error } = await (supabase.rpc as any)("update_my_contact_shipping_address", {
        p_contact_id: contactId,
        p_street: address.line1,
        p_street2: address.line2,
        p_city: address.city,
        p_state: address.state,
        p_zip: address.postalCode,
        p_country: address.country,
      });
      if (error) {
        if (isMissingFunction(error.message)) return false;
        throw error;
      }
      await queryClient.invalidateQueries({ queryKey });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contactId, queryClient],
  );

  return {
    contactAddress: query.data ?? null,
    isLoading: !!contactId && query.isLoading,
    saveToContact,
  };
};
