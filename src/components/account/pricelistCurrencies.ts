import { INDICATIVE_BBD_PER_UNIT } from "@/features/rx-order/pricing/currencies";

export interface PricelistCurrency {
  currencyCode: string;
  bbdPerUnit: number;
  isDefault: boolean;
  indicative?: boolean;
}

export function pricelistCurrencies(configured: PricelistCurrency[]): PricelistCurrency[] {
  const options = new Map(configured.filter((item) => Number.isFinite(item.bbdPerUnit) && item.bbdPerUnit > 0)
    .map((item) => [item.currencyCode, item]));
  if (!options.has("BBD")) options.set("BBD", { currencyCode: "BBD", bbdPerUnit: 1, isDefault: options.size === 0 });
  for (const code of ["EUR", "XCD"]) {
    if (!options.has(code)) options.set(code, { currencyCode: code, bbdPerUnit: INDICATIVE_BBD_PER_UNIT[code], isDefault: false, indicative: true });
  }
  return [...options.values()];
}

const formatters = new Map<string, Intl.NumberFormat>();
export function formatPricelistMoney(amount: number, currency: string): string {
  if (!formatters.has(currency)) formatters.set(currency, new Intl.NumberFormat("en-US", {
    style: "currency", currency, useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }));
  return formatters.get(currency)!.format(amount);
}

export function convertPricelistAmount(amount: number, from: string, to: string, options: PricelistCurrency[]): number | null {
  if (from === to) return amount;
  const source = options.find((item) => item.currencyCode === from)?.bbdPerUnit;
  const target = options.find((item) => item.currencyCode === to)?.bbdPerUnit;
  return source && target ? amount * source / target : null;
}
