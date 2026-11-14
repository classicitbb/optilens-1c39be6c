import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/hooks/useProductVariants";

interface LensVariantGridProps {
  variants: ProductVariant[];
  isChiral?: boolean;
  rowLabel?: string;
  columnLabel?: string;
  readOnly?: boolean;
  /** Override the cart wording when embedding this grid in another order workflow. */
  addButtonLabel?: string;
  onAddSelected: (items: { variantId: string; quantity: number }[]) => Promise<void>;
}

const asNumber = (value: unknown) => Number(value ?? 0);

const QuantityCell = ({
  value,
  label,
  readOnly,
  outOfStock,
  onChange,
}: {
  value: number | undefined;
  label: string;
  readOnly: boolean;
  outOfStock: boolean;
  onChange: (next: number) => void;
}) => (
  <div
    className={cn(
      "group relative h-7 w-full min-w-0",
      outOfStock && "shadow-[inset_0_0_0_1px_rgb(245_158_11),inset_0_0_8px_1px_rgb(245_158_11/0.55)]",
    )}
  >
    {outOfStock && <AlertTriangle className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-amber-500" aria-hidden="true" />}
    <Input
      type="number"
      min={0}
      value={value ?? ""}
      onChange={(event) => onChange(Math.max(0, Number(event.target.value || 0)))}
      onDoubleClick={() => !readOnly && onChange((value ?? 0) + 1)}
      className={cn(
        "h-full rounded-none border-0 bg-transparent pr-5 text-[10px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        outOfStock ? "pl-6" : "pl-2",
      )}
      disabled={readOnly}
      aria-label={label}
    />
    {!readOnly && (
      <div className="absolute inset-y-0 right-0 hidden w-4 flex-col border-l border-border/60 bg-background group-focus-within:flex group-hover:flex">
        <button type="button" tabIndex={-1} aria-label="Increase quantity" onClick={() => onChange((value ?? 0) + 1)} className="flex flex-1 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground">
          <ChevronUp className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
        <button type="button" tabIndex={-1} aria-label="Decrease quantity" onClick={() => onChange(Math.max(0, (value ?? 0) - 1))} className="flex flex-1 items-center justify-center border-t border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
      </div>
    )}
  </div>
);

export const LensVariantGrid = ({
  variants,
  isChiral = false,
  rowLabel = "Sphere",
  columnLabel = "Cylinder",
  readOnly = false,
  addButtonLabel,
  onAddSelected,
}: LensVariantGridProps) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const spheres = useMemo(
    () => Array.from(new Set(variants.map((variant) => asNumber(variant.attributes?.sphere)).filter((value) => Number.isFinite(value)))).sort((a, b) => b - a),
    [variants],
  );

  const cylinders = useMemo(
    () => Array.from(new Set(variants.map((variant) => asNumber(variant.attributes?.cylinder)).filter((value) => Number.isFinite(value)))).sort((a, b) => b - a),
    [variants],
  );

  const variantByCell = useMemo(() => {
    const map = new Map<string, ProductVariant>();
    variants.forEach((variant) => {
      const sphere = asNumber(variant.attributes?.sphere);
      const cylinder = asNumber(variant.attributes?.cylinder);
      map.set(`${sphere}:${cylinder}`, variant);
    });
    return map;
  }, [variants]);

  const selectedCount = Object.values(quantities).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);

  const handleAdd = async () => {
    const payload = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));

    if (payload.length === 0) return;
    setSaving(true);
    try {
      await onAddSelected(payload);
      setQuantities({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="sticky left-0 z-20 w-[104px] border-b border-r bg-muted/50 px-2 py-1.5 text-left text-[10px] font-semibold leading-tight text-muted-foreground">
                {rowLabel} \ {columnLabel}
              </th>
              {cylinders.map((cylinder) => (
                <th key={cylinder} className="border-b border-r bg-muted/30 px-1 py-1.5 text-center text-[10px] font-semibold text-foreground">
                  {cylinder.toFixed(2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spheres.map((sphere) => (
              <tr key={sphere}>
              <th className="sticky left-0 z-10 border-r bg-muted/30 px-2 py-0.5 text-left text-[10px] font-semibold text-foreground whitespace-nowrap">
                  {sphere.toFixed(2)}
                </th>
                {cylinders.map((cylinder) => {
                  const variant = variantByCell.get(`${sphere}:${cylinder}`);
                  const availableQty = (variant?.stock_qty ?? 0) - (variant?.reserved_qty ?? 0);
                  const noVariant = !variant || !variant.is_active;
                  const isOutOfStock = !noVariant && !variant.allow_backorder && availableQty <= 0;

                  if (noVariant) {
                    return (
                      <td key={`${sphere}:${cylinder}`} className="border-r border-t p-0 align-middle">
                        <div className="flex h-7 w-full items-center justify-center text-[9px] text-muted-foreground/40">—</div>
                      </td>
                    );
                  }

                  const cell = (
                    <QuantityCell
                      value={quantities[variant.id]}
                      label={`${sphere.toFixed(2)} ${cylinder.toFixed(2)} quantity`}
                      readOnly={readOnly}
                      outOfStock={isOutOfStock}
                      onChange={(next) => setQuantities((prev) => ({ ...prev, [variant.id]: next }))}
                    />
                  );

                  return (
                    <td key={`${sphere}:${cylinder}`} className={cn(
                      "border-r border-t p-0 align-middle transition-colors",
                      (quantities[variant.id] ?? 0) > 0 && "bg-secondary/10",
                    )}>
                      {isOutOfStock ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild><div>{cell}</div></TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[180px] text-xs">
                              Out of stock — this order may not be fulfilled
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{selectedCount}</span>
          {" "}{selectedCount === 1 ? "item" : "items"} selected
          {isChiral ? " (cart will split into Left + Right lines)" : ""}
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuantities({})} disabled={selectedCount === 0}>
              Clear grid
            </Button>
            <Button variant="hero" size="sm" onClick={handleAdd} disabled={saving || selectedCount === 0} className="gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? "Adding…" : addButtonLabel ?? `Add ${selectedCount > 0 ? selectedCount : ""} to cart`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LensVariantGrid;
