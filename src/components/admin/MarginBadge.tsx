import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MarginBadgeProps {
  marginPercent: number | null;
  cost?: number | null;
  sellPrice?: number | null;
  itemName?: string;
  className?: string;
  /** Show as inline bubble (no separate column) */
  inline?: boolean;
  /** Configurable margin floor percentage (default 20) */
  marginFloor?: number;
}

const getMarginColor = (m: number | null) => {
  if (m == null) return { bg: "hsl(215 15% 92%)", text: "hsl(215 15% 55%)" };
  if (m >= 30) return { bg: "hsl(142 40% 90%)", text: "hsl(142 60% 30%)" };
  if (m >= 20) return { bg: "hsl(38 80% 90%)", text: "hsl(38 80% 35%)" };
  return { bg: "hsl(0 60% 92%)", text: "hsl(0 60% 40%)" };
};

const MarginBadge = ({
  marginPercent,
  cost,
  sellPrice,
  itemName,
  className,
  inline = false,
  marginFloor = 20,
}: MarginBadgeProps) => {
  const colors = getMarginColor(marginPercent);
  const label = marginPercent != null ? `${marginPercent.toFixed(1)}%` : "—";

  const badge = (
    <span
      className={cn(
        "rounded-full px-1.5 py-0 cursor-pointer select-none whitespace-nowrap",
        inline ? "text-[9px]" : "text-[10px]",
        className
      )}
      style={{
        background: colors.bg,
        color: colors.text,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-56 p-3 text-xs space-y-2"
      >
        {itemName && (
          <p className="font-semibold text-foreground truncate">{itemName}</p>
        )}
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
          <span className="text-muted-foreground">Cost (BBD)</span>
          <span className="text-right font-medium">
            {cost != null ? `$${cost.toFixed(2)}` : "—"}
          </span>

          <span className="text-muted-foreground">Sell Price (BBD)</span>
          <span className="text-right font-medium">
            {sellPrice != null ? `$${sellPrice.toFixed(2)}` : "—"}
          </span>

          <span className="text-muted-foreground">Margin %</span>
          <span
            className="text-right font-semibold"
            style={{ color: colors.text }}
          >
            {label}
          </span>
        </div>

        {marginPercent != null && marginPercent < marginFloor && (
          <div
            className="flex items-center gap-1.5 rounded px-2 py-1.5 mt-1"
            style={{
              background: "hsl(0 60% 95%)",
              color: "hsl(0 60% 40%)",
              border: "1px solid hsl(0 60% 85%)",
            }}
          >
            <span className="text-[10px] font-medium">
              ⚠ Margin is below {marginFloor}% floor — review before saving
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default MarginBadge;
export { getMarginColor };
