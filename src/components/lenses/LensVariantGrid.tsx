import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProductVariant } from "@/hooks/useProductVariants";

interface LensVariantGridProps {
  variants: ProductVariant[];
  isChiral?: boolean;
  rowLabel?: string;
  columnLabel?: string;
  readOnly?: boolean;
  onAddSelected: (items: { variantId: string; quantity: number }[]) => Promise<void>;
}

const asNumber = (value: unknown) => Number(value ?? 0);

export const LensVariantGrid = ({
  variants,
  isChiral = false,
  rowLabel = "Sphere",
  columnLabel = "Cylinder",
  readOnly = false,
  onAddSelected,
}: LensVariantGridProps) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const spheres = useMemo(
    () => Array.from(new Set(variants.map((variant) => asNumber(variant.attributes?.sphere)).filter((value) => Number.isFinite(value)))).sort((a, b) => a - b),
    [variants],
  );

  const cylinders = useMemo(
    () => Array.from(new Set(variants.map((variant) => asNumber(variant.attributes?.cylinder)).filter((value) => Number.isFinite(value)))).sort((a, b) => a - b),
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
      <div className="overflow-auto rounded-lg border border-border">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="sticky left-0 z-20 border-b border-r bg-background px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                {rowLabel} \ {columnLabel}
              </th>
              {cylinders.map((cylinder) => (
                <th key={cylinder} className="border-b border-r px-1 py-1 text-center text-[10px] font-semibold min-w-[44px]">
                  {cylinder.toFixed(2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spheres.map((sphere) => (
              <tr key={sphere}>
                <th className="sticky left-0 z-10 border-r bg-background px-2 py-0.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                  {sphere.toFixed(2)}
                </th>
                {cylinders.map((cylinder) => {
                  const variant = variantByCell.get(`${sphere}:${cylinder}`);
                  const availableQty = (variant?.stock_qty ?? 0) - (variant?.reserved_qty ?? 0);
                  const noVariant = !variant || !variant.is_active;
                  const isOutOfStock = !noVariant && !variant.allow_backorder && availableQty <= 0;

                  if (noVariant) {
                    return (
                      <td key={`${sphere}:${cylinder}`} className="border-r border-t p-0.5 align-middle">
                        <div className="flex h-6 w-11 items-center justify-center text-[9px] text-muted-foreground/40">—</div>
                      </td>
                    );
                  }

                  return (
                    <td key={`${sphere}:${cylinder}`} className="border-r border-t p-0.5 align-middle">
                      {isOutOfStock ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative flex items-center">
                                <Input
                                  type="number"
                                  min={0}
                                  value={quantities[variant.id] ?? ""}
                                  onChange={(event) => {
                                    const next = Math.max(0, Number(event.target.value || 0));
                                    setQuantities((prev) => ({ ...prev, [variant.id]: next }));
                                  }}
                                  className="h-6 w-11 px-1 text-center text-[10px] ring-1 ring-amber-400/70"
                                  disabled={readOnly}
                                  aria-label={`${sphere.toFixed(2)} ${cylinder.toFixed(2)} quantity`}
                                />
                                <AlertTriangle className="absolute -right-1 -top-1 h-2.5 w-2.5 text-amber-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[180px] text-xs">
                              Out of stock — this order may not be fulfilled
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={quantities[variant.id] ?? ""}
                          onChange={(event) => {
                            const next = Math.max(0, Number(event.target.value || 0));
                            setQuantities((prev) => ({ ...prev, [variant.id]: next }));
                          }}
                          className="h-6 w-11 px-1 text-center text-[10px]"
                          disabled={readOnly}
                          aria-label={`${sphere.toFixed(2)} ${cylinder.toFixed(2)} quantity`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Selected quantity: {selectedCount}
          {isChiral ? " pairs (cart will split into Left + Right lines)" : ""}
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQuantities({})}>Clear grid</Button>
            <Button onClick={handleAdd} disabled={saving || selectedCount === 0}>
              {saving ? "Adding..." : "Add selected to cart"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LensVariantGrid;
