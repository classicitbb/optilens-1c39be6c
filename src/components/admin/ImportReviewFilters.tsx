import { Badge } from "@/components/ui/badge";
import type { PricingEngineResult } from "@/hooks/usePricingEngine";

export type HealthFilter =
  | "all"
  | "below_floor"
  | "below_45"
  | "zero_cost"
  | "large_negative_gap"
  | "large_positive_outlier"
  | "loss";

interface FilterDef {
  key: HealthFilter;
  label: string;
  bg: string;
  fg: string;
}

const FILTERS: FilterDef[] = [
  { key: "all", label: "All", bg: "hsl(215 10% 93%)", fg: "hsl(215 30% 25%)" },
  { key: "loss", label: "Loss", bg: "hsl(0 84% 60% / 0.12)", fg: "hsl(0 72% 40%)" },
  { key: "below_floor", label: "Below Floor", bg: "hsl(0 84% 60% / 0.08)", fg: "hsl(0 60% 45%)" },
  { key: "below_45", label: "Below 45%", bg: "hsl(38 92% 50% / 0.12)", fg: "hsl(38 80% 35%)" },
  { key: "zero_cost", label: "Zero Cost", bg: "hsl(280 60% 50% / 0.1)", fg: "hsl(280 50% 40%)" },
  { key: "large_negative_gap", label: "Large −Gap", bg: "hsl(0 70% 50% / 0.08)", fg: "hsl(0 60% 40%)" },
  { key: "large_positive_outlier", label: "Outlier +", bg: "hsl(215 65% 50% / 0.1)", fg: "hsl(215 55% 40%)" },
];

export function countByFilter(
  items: Array<{ pricing?: PricingEngineResult | null; supplierCost?: number }>,
): Record<HealthFilter, number> {
  const counts: Record<HealthFilter, number> = {
    all: items.length,
    below_floor: 0,
    below_45: 0,
    zero_cost: 0,
    large_negative_gap: 0,
    large_positive_outlier: 0,
    loss: 0,
  };

  for (const item of items) {
    const p = item.pricing;
    if (!p) continue;
    if ((item.supplierCost ?? 0) === 0) counts.zero_cost++;
    if (p.governance_flags.at_loss) counts.loss++;
    if (p.governance_flags.below_floor && !p.governance_flags.at_loss) counts.below_floor++;
    if (p.margin != null && p.margin < 0.45 && p.margin >= 0 && !p.governance_flags.below_floor) counts.below_45++;
    // Large negative gap: sell_price < strategic_price by > 20%
    if (p.strategic_price > 0 && p.full_cost > 0) {
      const gap = ((p.strategic_price - (p.margin != null ? p.full_cost / (1 - p.margin) : 0)) / p.strategic_price);
      if (gap > 0.2) counts.large_negative_gap++;
      if (gap < -0.3) counts.large_positive_outlier++;
    }
  }
  return counts;
}

export function matchesFilter(
  filter: HealthFilter,
  pricing: PricingEngineResult | null | undefined,
  supplierCost: number,
): boolean {
  if (filter === "all") return true;
  if (!pricing) return false;
  switch (filter) {
    case "zero_cost": return supplierCost === 0;
    case "loss": return pricing.governance_flags.at_loss;
    case "below_floor": return pricing.governance_flags.below_floor && !pricing.governance_flags.at_loss;
    case "below_45": return pricing.margin != null && pricing.margin < 0.45 && pricing.margin >= 0 && !pricing.governance_flags.below_floor;
    case "large_negative_gap": {
      if (!pricing.strategic_price || pricing.margin == null) return false;
      const sellPrice = pricing.full_cost / (1 - pricing.margin);
      return (pricing.strategic_price - sellPrice) / pricing.strategic_price > 0.2;
    }
    case "large_positive_outlier": {
      if (!pricing.strategic_price || pricing.margin == null) return false;
      const sellPrice = pricing.full_cost / (1 - pricing.margin);
      return (sellPrice - pricing.strategic_price) / pricing.strategic_price > 0.3;
    }
    default: return true;
  }
}

interface ImportReviewFiltersProps {
  active: HealthFilter;
  onChange: (f: HealthFilter) => void;
  counts: Record<HealthFilter, number>;
}

const ImportReviewFilters = ({ active, onChange, counts }: ImportReviewFiltersProps) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-xs font-medium mr-1" style={{ color: "hsl(215 15% 40%)" }}>Filter:</span>
    {FILTERS.map((f) => {
      const isActive = active === f.key;
      const count = counts[f.key];
      if (f.key !== "all" && count === 0) return null;
      return (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border"
          style={{
            background: isActive ? f.bg : "transparent",
            color: isActive ? f.fg : "hsl(215 15% 55%)",
            borderColor: isActive ? f.fg + "33" : "hsl(215 15% 85%)",
          }}
        >
          {f.label}
          {count > 0 && f.key !== "all" && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 border-0 font-semibold"
              style={{ background: f.bg, color: f.fg }}>
              {count}
            </Badge>
          )}
        </button>
      );
    })}
  </div>
);

export default ImportReviewFilters;
