import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id: string;
  import_duty: number;
  frames_duty: number;
  default_vat: number;
  labour_percent: number;
  profit_percent: number;
  import_multiple: number;
  wholesale_stock_percentage: number;
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

  const wsStkPrice = supply.stk_wspl
    ? fullCost + fullCost * s.wholesale_stock_percentage
    : 0;

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
