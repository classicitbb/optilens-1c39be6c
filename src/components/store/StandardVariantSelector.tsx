import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductVariant } from "@/features/store/variants/types";

interface StandardVariantSelectorProps {
  variants: ProductVariant[];
  onAdd: (variant: ProductVariant) => Promise<void>;
}

export const StandardVariantSelector = ({ variants, onAdd }: StandardVariantSelectorProps) => {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const attributes = useMemo(() => {
    const map = new Map<string, Set<string>>();
    variants.forEach((variant) => {
      Object.entries(variant.attribute_values ?? {}).forEach(([key, value]) => {
        const normalized = String(value ?? "");
        if (!normalized) return;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)?.add(normalized);
      });
    });
    return Array.from(map.entries()).map(([key, values]) => ({ key, values: Array.from(values).sort() }));
  }, [variants]);

  const resolved = useMemo(() => variants.find((variant) =>
    Object.entries(selection).every(([key, value]) => String(variant.attribute_values?.[key] ?? "") === value)
  ), [selection, variants]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {attributes.map((attribute) => (
          <div key={attribute.key} className="space-y-1">
            <Label className="capitalize">{attribute.key.replaceAll("_", " ")}</Label>
            <Select
              value={selection[attribute.key] ?? ""}
              onValueChange={(value) => setSelection((prev) => ({ ...prev, [attribute.key]: value }))}
            >
              <SelectTrigger><SelectValue placeholder={`Select ${attribute.key}`} /></SelectTrigger>
              <SelectContent>
                {attribute.values.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <Button
        disabled={!resolved || isSaving || !resolved.is_active}
        onClick={async () => {
          if (!resolved) return;
          setIsSaving(true);
          await onAdd(resolved);
          setIsSaving(false);
        }}
      >
        {resolved ? `Add ${resolved.display_label || resolved.title}` : "Select options"}
      </Button>
    </div>
  );
};
