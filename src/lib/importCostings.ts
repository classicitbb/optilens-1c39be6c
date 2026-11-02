// The cost math lives in the shared module so the shipment-binder edge function
// computes exactly what the screen and reports show.
export * from "../../supabase/functions/_shared/shipments/landedCost";

export const formatMoney = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
