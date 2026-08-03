import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Lightweight ERP account picker source for the Rx Order Form's account
// picker (and any other admin UI that needs "pick any customer account").
// Deliberately unfiltered — every row in `customers` is selectable, per the
// 2026-07-31 decision (place an order on behalf of any ERP account).
export interface CustomerAccountOption {
  id: number;
  name: string;
  account_number: string | null;
}

export const useCustomerAccounts = () => {
  return useQuery<CustomerAccountOption[]>({
    queryKey: ["customer-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("customers") as any)
        .select("id, name, account_number")
        .order("name");
      if (error) throw error;
      return data as CustomerAccountOption[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
