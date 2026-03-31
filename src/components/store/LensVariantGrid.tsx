import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductVariant } from "@/features/store/variants/types";

interface LensVariantGridProps {
  variants: ProductVariant[];
  onAddSelected: (entries: Array<{ variant: ProductVariant; quantity: number }>) => Promise<void>;
}

export const LensVariantGrid = ({ variants, onAddSelected }: LensVariantGridProps) => {
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { spheres, cylinders, variantByCell } = useMemo(() => {
    const s = Array.from(new Set(variants.map((v) => Number(v.attribute_values.sphere)).filter(Number.isFinite))).sort((a, b) => a - b);
    const c = Array.from(new Set(variants.map((v) => Number(v.attribute_values.cylinder)).filter(Number.isFinite))).sort((a, b) => a - b);
    const map = new Map<string, ProductVariant>();
    variants.forEach((v) => {
      map.set(`${v.attribute_values.sphere}|${v.attribute_values.cylinder}`, v);
    });
    return { spheres: s, cylinders: c, variantByCell: map };
  }, [variants]);

  const selectedCount = useMemo(() => Object.values(qtyMap).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0), [qtyMap]);

  const submit = async () => {
    const entries = Object.entries(qtyMap)
      .map(([variantId, qty]) => ({ variant: variants.find((v) => v.id === variantId), quantity: qty }))
      .filter((entry): entry is { variant: ProductVariant; quantity: number } => !!entry.variant && entry.quantity > 0);

    if (entries.length === 0) return;
    setIsSaving(true);
    await onAddSelected(entries);
    setIsSaving(false);
    setQtyMap({});
  };

  return (
    <div className="space-y-3">
      <div className="max-h-[420px] overflow-auto rounded-md border">
        <table className="min-w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-background">
            <tr>
              <th className="sticky left-0 z-20 bg-background px-2 py-2 text-left">Sphere \ Cylinder</th>
              {cylinders.map((cyl) => <th key={cyl} className="px-2 py-2 text-center">{cyl.toFixed(2)}</th>)}
            </tr>
          </thead>
          <tbody>
            {spheres.map((sphere) => (
              <tr key={sphere}>
                <td className="sticky left-0 bg-background px-2 py-2 font-medium">{sphere.toFixed(2)}</td>
                {cylinders.map((cyl) => {
                  const variant = variantByCell.get(`${sphere}|${cyl}`);
                  if (!variant) return <td key={cyl} className="bg-muted/40 px-2 py-2 text-center text-muted-foreground">—</td>;
                  const unavailable = !variant.is_active || ((variant.stock_qty ?? 0) <= 0 && !variant.allow_backorder);
                  return (
                    <td key={cyl} className={`px-1 py-1 ${unavailable ? "bg-muted/50" : ""}`}>
                      <Input
                        type="number"
                        min={0}
                        value={qtyMap[variant.id] ?? ""}
                        disabled={unavailable}
                        onChange={(event) => {
                          const next = Math.max(0, Number(event.target.value || 0));
                          setQtyMap((prev) => ({ ...prev, [variant.id]: next }));
                        }}
                        className="h-8 text-center"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setQtyMap({})}>Clear grid</Button>
        <Button onClick={submit} disabled={isSaving || selectedCount === 0}>{isSaving ? "Adding..." : `Add selected (${selectedCount})`}</Button>
      </div>
    </div>
  );
};
