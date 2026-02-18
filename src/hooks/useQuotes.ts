import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Quote {
  id: string;
  quote_number: string;
  quote_type: "STOCK" | "RX";
  status: string;
  customer_name: string;
  account_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  currency: string;
  price_profile_id: string | null;
  valid_until: string | null;
  lead_time_days: number | null;
  notes_customer: string | null;
  notes_internal: string | null;
  subtotal_sell: number;
  total_landed_cost: number;
  gp_amount: number;
  gp_percent: number;
  grand_total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  line_type: string;
  product_id: string | null;
  sku: string;
  item_name: string;
  description_override: string | null;
  qty: number;
  unit_cost_landed_bbd: number;
  unit_base_price_bbd: number;
  unit_sell_price_bbd: number;
  price_override: boolean;
  override_reason: string | null;
  override_note: string | null;
  profit_status: string;
  threshold_percent: number;
  threshold_status: string;
  gp_amount: number;
  gp_percent: number;
  group_key: string | null;
  parent_line_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RxDetail {
  id: string;
  quote_line_id: string;
  od_sph: number | null;
  od_cyl: number | null;
  od_axis: number | null;
  od_add: number | null;
  os_sph: number | null;
  os_cyl: number | null;
  os_axis: number | null;
  os_add: number | null;
  pd: string | null;
  seg_height: string | null;
  fitting_height: string | null;
  rx_notes: string | null;
}

export const OVERRIDE_REASONS = [
  "Match competitor",
  "Strategic account/relationship",
  "Clearance/aging stock",
  "Pricing error correction",
  "Bundle/package deal",
  "Warranty/remake/service recovery",
  "Other",
] as const;

export const QUOTE_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired", "Void"] as const;

// Pricing computation helpers
export function computeLineProfit(
  unitSell: number,
  unitCost: number,
  qty: number,
  quoteType: "STOCK" | "RX"
) {
  const lineSellTotal = qty * unitSell;
  const lineCostTotal = qty * unitCost;

  if (!unitCost || unitCost === 0) {
    return { gp_amount: 0, gp_percent: 0, profit_status: "NoCost" as const, threshold_status: "NoCost" as const };
  }

  const gpAmount = lineSellTotal - lineCostTotal;
  const gpPercent = lineSellTotal > 0 ? (gpAmount / lineSellTotal) * 100 : 0;

  let profitStatus: string;
  if (unitSell < unitCost) profitStatus = "BelowCost";
  else if (unitSell === unitCost) profitStatus = "AtCost";
  else profitStatus = "Profitable";

  const thresholdPercent = quoteType === "STOCK" ? 28 : 48;
  let thresholdStatus: string;
  if (profitStatus === "Profitable") {
    thresholdStatus = gpPercent >= thresholdPercent ? "AboveThreshold" : "BelowThreshold";
  } else if (profitStatus === "AtCost") {
    thresholdStatus = "AtCost";
  } else if (profitStatus === "BelowCost") {
    thresholdStatus = "BelowCost";
  } else {
    thresholdStatus = "NoCost";
  }

  return { gp_amount: gpAmount, gp_percent: gpPercent, profit_status: profitStatus, threshold_status: thresholdStatus };
}

export const useQuotes = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery<Quote[]>({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Quote[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (params: { quote_type: "STOCK" | "RX"; customer_name?: string }) => {
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          quote_type: params.quote_type,
          customer_name: params.customer_name || "",
          created_by: user!.id,
          quote_number: "", // trigger fills this
        } as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Quote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Quote> }) => {
      const { error } = await supabase
        .from("quotes")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useQuoteLines = (quoteId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery<QuoteLine[]>({
    queryKey: ["quote-lines", quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase
        .from("quote_lines")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as QuoteLine[];
    },
    enabled: !!quoteId,
  });

  const addLineMutation = useMutation({
    mutationFn: async (line: Partial<QuoteLine> & { quote_id: string }) => {
      const { data, error } = await supabase
        .from("quote_lines")
        .insert(line as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as QuoteLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-lines", quoteId] }),
  });

  const updateLineMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<QuoteLine> }) => {
      const { error } = await supabase
        .from("quote_lines")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-lines", quoteId] }),
  });

  const deleteLineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quote_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-lines", quoteId] }),
  });

  return { ...query, addLineMutation, updateLineMutation, deleteLineMutation };
};

export const useRxDetails = (quoteLineId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery<RxDetail | null>({
    queryKey: ["rx-details", quoteLineId],
    queryFn: async () => {
      if (!quoteLineId) return null;
      const { data, error } = await supabase
        .from("rx_details")
        .select("*")
        .eq("quote_line_id", quoteLineId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as RxDetail | null;
    },
    enabled: !!quoteLineId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (detail: Partial<RxDetail> & { quote_line_id: string }) => {
      // Check if exists
      const { data: existing } = await supabase
        .from("rx_details")
        .select("id")
        .eq("quote_line_id", detail.quote_line_id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("rx_details")
          .update(detail as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rx_details")
          .insert(detail as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rx-details", quoteLineId] }),
  });

  return { ...query, upsertMutation };
};
