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
  if (m == null) return { bg: "bg-muted", text: "text-muted-foreground" };
  if (m >= 30) return { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400" };
  if (m >= 20) return { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400" };
  return { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-400" };
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
        "px-1.5 py-0 cursor-pointer select-none whitespace-nowrap font-semibold",
        colors.bg,
        colors.text,
        inline ? "text-[9px]" : "text-[10px]",
        className
      )}
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
          <span className={cn("text-right font-semibold", colors.text)}>
            {label}
          </span>
        </div>

        {marginPercent != null && marginPercent < marginFloor && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 mt-1 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
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
