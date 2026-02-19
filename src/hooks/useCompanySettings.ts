import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id: string;
  // Legacy cost engine fields
  import_duty: number;
  frames_duty: number;
  default_vat: number;
  labour_percent: number;
  profit_percent: number;
  import_multiple: number;
  wholesale_stock_percentage: number;
  updated_at: string;
  // Company variables
  company_name: string;
  primary_contact: string;
  email: string;
  tel: string;
  fax: string;
  tax_tin: string;
  base_currency: string;
  business_calendar: string;
  slogan: string;
  logo_file_name: string | null;
  logo_url: string | null;
  // Physical address
  physical_country: string;
  physical_state: string;
  physical_county: string;
  physical_line1: string;
  physical_line2: string;
  physical_city: string;
  physical_postcode: string;
  // Bill-to
  bill_use_physical: boolean;
  bill_country: string;
  bill_state: string;
  bill_county: string;
  bill_line1: string;
  bill_line2: string;
  bill_city: string;
  bill_postcode: string;
  // Ship-to
  ship_use_physical: boolean;
  ship_country: string;
  ship_state: string;
  ship_county: string;
  ship_line1: string;
  ship_line2: string;
  ship_city: string;
  ship_postcode: string;
}

export interface LegacyRate {
  id: string;
  rate_code: string;
  description: string;
  value_type: string;
  value: number;
  currency: string | null;
  effective_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LandedCostResult {
  bbCost: number;
  duty: number;
  vat: number;
  labour: number;
  fullCost: number;
  autoPrice: number;
  markup: number;
  profitPercent: number;
  salesTax: number;
  plusSalesTax: number;
  wsStkPrice: number;
  afterSalesProfit: number;
}

interface CostInput {
  base_price: number;
  sell_price: number;
  category: string;
  bb_item: boolean;
  duty_added: boolean;
  vat_paid: boolean;
  labour_added: boolean;
  stk_wspl: boolean;
}

export const calculateLandedCost = (
  supply: CostInput,
  settings: CompanySettings | null | undefined
): LandedCostResult => {
  const s = settings ?? {
    import_duty: 0, frames_duty: 0, default_vat: 0,
    labour_percent: 0, profit_percent: 0, import_multiple: 1,
    wholesale_stock_percentage: 0,
  } as CompanySettings;

  const cost = supply.base_price;
  const sellPrice = supply.sell_price;

  const bbCost = supply.bb_item ? cost : cost * s.import_multiple;
  const duty = supply.duty_added
    ? (supply.category === "frames" ? bbCost * s.frames_duty : bbCost * s.import_duty)
    : 0;
  const vat = supply.vat_paid ? duty * s.default_vat : 0;
  const labour = supply.labour_added ? bbCost * s.labour_percent : 0;
  const fullCost = supply.duty_added
    ? bbCost + (duty - bbCost) + (supply.vat_paid ? vat - bbCost : 0) + labour
    : bbCost * 1.15;
  const autoPrice = fullCost + fullCost * (s.profit_percent / 2);
  const markup = sellPrice - fullCost;
  const profitPercent = cost > 0 ? markup / fullCost : s.profit_percent;
  const salesTax = supply.vat_paid ? sellPrice * s.default_vat : sellPrice;
  const plusSalesTax = supply.vat_paid ? sellPrice * s.default_vat : sellPrice;
  const afterSalesProfit = sellPrice < 0 ? fullCost * s.profit_percent : sellPrice - fullCost;
  const wsStkPrice = supply.stk_wspl ? fullCost + fullCost * s.wholesale_stock_percentage : 0;

  return { bbCost, duty, vat, labour, fullCost, autoPrice, markup, profitPercent, salesTax, plusSalesTax, wsStkPrice, afterSalesProfit };
};

export const useCompanySettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery<CompanySettings>({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as CompanySettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<CompanySettings, "id" | "updated_at">>) => {
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .single();
      if (!existing) throw new Error("No company settings row found");
      const { error } = await supabase
        .from("company_settings")
        .update(updates as any)
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company_settings"] }),
  });

  return { ...query, updateMutation };
};

export const useLegacyRates = () => {
  const queryClient = useQueryClient();

  const query = useQuery<LegacyRate[]>({
    queryKey: ["legacy_rates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legacy_rates")
        .select("*")
        .order("rate_code");
      if (error) throw error;
      return (data ?? []) as LegacyRate[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rate: Partial<LegacyRate> & { id?: string }) => {
      if (rate.id) {
        const { error } = await (supabase as any).from("legacy_rates").update(rate).eq("id", rate.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("legacy_rates").insert(rate);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["legacy_rates"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("legacy_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["legacy_rates"] }),
  });

  return { ...query, upsertMutation, deleteMutation };
};
