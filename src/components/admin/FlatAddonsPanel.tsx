import { useState } from "react";
import { useAddons } from "@/hooks/useAddons";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const LABEL = "hsl(215 15% 40%)";

interface FlatAddonsPanelProps {
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
}

const FlatAddonsPanel = ({ selected, onSelectionChange }: FlatAddonsPanelProps) => {
  const { data: addons, isLoading } = useAddons();

  const activeAddons = (addons ?? []).filter((a) => a.is_active);
  const categories = [...new Set(activeAddons.map((a) => a.category))].sort();

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onSelectionChange(selected.filter((s) => s !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  const total = activeAddons
    .filter((a) => selected.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-16">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
            Flat Add-ons
          </h3>
          <p className="text-xs mt-0.5" style={{ color: LABEL }}>
            Select add-ons to bundle. Each adds a flat price to any lens.
          </p>
        </div>
        {selected.length > 0 && (
          <div className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "hsl(215 60% 94%)", color: "hsl(215 65% 40%)" }}>
            Selected total: ${total.toFixed(2)} BBD
          </div>
        )}
      </div>

      {categories.map((cat) => {
        const items = activeAddons.filter((a) => a.category === cat);
        return (
          <div key={cat}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LABEL }}>
              {cat}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {items.map((addon) => {
                const checked = selected.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-colors select-none"
                    style={{
                      borderColor: checked ? "hsl(215 65% 50%)" : "hsl(215 15% 85%)",
                      background: checked ? "hsl(215 60% 97%)" : "transparent",
                    }}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(addon.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium truncate" style={{ color: "hsl(215 30% 15%)" }}>
                        {addon.name}
                      </span>
                      <span className="block text-[10px]" style={{ color: LABEL }}>
                        ${addon.price.toFixed(2)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {activeAddons.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6">
          No active add-ons found.
        </div>
      )}
    </div>
  );
};

export default FlatAddonsPanel;
