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
  /** ISO country code. Drives the Rx form's default delivery method — anything
   *  other than Barbados ships export rather than on the weekly courier run. */
  country_code: string | null;
}

export const useCustomerAccounts = () => {
  return useQuery<CustomerAccountOption[]>({
    queryKey: ["customer-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("customers") as any)
        .select("id, name, account_number, country_code")
        .order("name");
      if (error) throw error;
      if ((data ?? []).length > 0) return data as CustomerAccountOption[];

      // `customers` is staff-only under RLS, so a portal customer gets an empty
      // list here — and the Rx form, with no account to bill, runs in its demo
      // fallback (no "Ordering for" account, EUR currency). Their own accounts
      // come from the portal memberships RPC instead. country_code is not on
      // that RPC; it is unpopulated on every account today, and null is what
      // the form already treats as "unknown".
      const { data: memberships, error: memErr } = await (supabase.rpc as any)("get_portal_account_memberships");
      if (memErr) throw memErr;
      return ((memberships ?? []) as any[])
        .filter((m) => m.membership_status === "active")
        .map((m) => ({
          id: m.customer_id as number,
          name: (m.customer_name ?? "") as string,
          account_number: (m.account_number ?? null) as string | null,
          country_code: null,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });
};
