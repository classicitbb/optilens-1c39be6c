import { useState, useEffect } from "react";
import { useMaterialUpgrades } from "@/hooks/useMaterialUpgrades";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Save, RefreshCw, Loader2 } from "lucide-react";

const BLUE = "hsl(215 65% 50%)";
const LABEL = "hsl(215 15% 40%)";

// Canonical material column order
const MATERIAL_COLS = ["1.50", "POLY", "Trivex", "1.60", "1.67", "1.74"];

// Map material label → price_matrix index key
const MATERIAL_TO_INDEX: Record<string, string> = {
  "1.50": "index_1_50",
  "POLY": "index_1_59",
  "Trivex": "index_1_53",
  "1.60": "index_1_60",
  "1.67": "index_1_67",
  "1.74": "index_1_74",
};

const MaterialUpgradesGrid = () => {
  const { data: upgrades, isLoading, saveMutation } = useMaterialUpgrades();
  const { data: matrixRows } = usePriceMatrix();
  const { toast } = useToast();

  const [localUpgrades, setLocalUpgrades] = useState(upgrades ?? []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (upgrades && !dirty) setLocalUpgrades(upgrades);
  }, [upgrades, dirty]);

  // Get unique upgrade names
  const upgradeNames = [...new Set((upgrades ?? []).map((u) => u.upgrade_name))].sort();

  // Build pivot: upgradeName → material → row
  const pivot = new Map<string, Map<string, typeof localUpgrades[0]>>();
  for (const row of localUpgrades) {
    if (!pivot.has(row.upgrade_name)) pivot.set(row.upgrade_name, new Map());
    pivot.get(row.upgrade_name)!.set(row.material, row);
  }

  // Compute average clear price for a material from price_matrix
  const avgClearPrice = (materialLabel: string): number => {
    const indexKey = MATERIAL_TO_INDEX[materialLabel];
    if (!indexKey || !matrixRows) return 0;
    const vals = matrixRows
      .map((r) => (r as any)[indexKey] as number | null)
      .filter((v): v is number => v !== null && v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const recalculateDeltas = () => {
    setLocalUpgrades((prev) =>
      prev.map((row) => {
        const avg = avgClearPrice(row.material);
        const delta =
          row.full_price_bbd !== null ? row.full_price_bbd - avg : row.delta_bbd;
        return { ...row, delta_bbd: delta !== null ? parseFloat(delta.toFixed(2)) : null };
      })
    );
    setDirty(true);
    toast({ title: "Deltas recalculated" });
  };

  const setCell = (id: number, field: "full_price_bbd" | "delta_bbd", val: string) => {
    const parsed = val === "" ? null : parseFloat(val);
    setLocalUpgrades((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: parsed } : r))
    );
    setDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localUpgrades, {
      onSuccess: () => {
        setDirty(false);
        toast({ title: "Material upgrades saved" });
      },
      onError: (e: any) =>
        toast({ title: "Save failed", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!upgrades || upgrades.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-8">
        No material upgrade rows found in database.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
            Material Upgrades
          </h3>
          <p className="text-xs mt-0.5" style={{ color: LABEL }}>
            Full price (BBD) and delta vs. clear base. Delta = Full Price − Avg Clear Price for that material.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={recalculateDeltas}
          >
            <RefreshCw className="h-3 w-3" />
            Recalculate All Deltas
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            style={{ background: BLUE, color: "white" }}
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="overflow-auto border border-border rounded-md">
        <table className="w-full text-xs border-collapse bg-background">
          <thead>
            <tr style={{ background: "hsl(215 15% 96%)" }} className="border-b border-border">
              <th
                rowSpan={2}
                className="px-3 py-2 text-left font-bold border-r border-border"
                style={{ minWidth: 160, color: "hsl(215 30% 15%)" }}
              >
                Upgrade
              </th>
              {MATERIAL_COLS.map((m) => (
                <th
                  key={m}
                  colSpan={2}
                  className="px-3 py-1.5 text-center font-bold border-r border-border last:border-r-0"
                  style={{ color: "hsl(215 30% 15%)" }}
                >
                  {m}
                </th>
              ))}
            </tr>
            <tr style={{ background: "hsl(215 15% 93%)" }} className="border-b border-border">
              {MATERIAL_COLS.map((m) => (
                <>
                  <th
                    key={`${m}-full`}
                    className="px-2 py-1 text-center font-medium border-r border-border"
                    style={{ color: LABEL, minWidth: 72, background: "hsl(215 60% 94%)" }}
                  >
                    Full $
                  </th>
                  <th
                    key={`${m}-delta`}
                    className="px-2 py-1 text-center font-medium border-r border-border last:border-r-0"
                    style={{ color: LABEL, minWidth: 72 }}
                  >
                    Δ
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {upgradeNames.map((name, ri) => {
              const materialMap = pivot.get(name);
              return (
                <tr
                  key={name}
                  className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}
                >
                  <td
                    className="px-3 py-1.5 font-semibold border-r border-border whitespace-nowrap"
                    style={{ color: "hsl(215 30% 15%)" }}
                  >
                    {name}
                  </td>
                  {MATERIAL_COLS.map((mat) => {
                    const row = materialMap?.get(mat);
                    if (!row) {
                      return (
                        <>
                          <td key={`${name}-${mat}-full`} className="border-r border-border text-center text-muted-foreground/40 py-1.5" style={{ background: "hsl(215 60% 97%)" }}>—</td>
                          <td key={`${name}-${mat}-delta`} className="border-r border-border last:border-r-0 text-center text-muted-foreground/40 py-1.5">—</td>
                        </>
                      );
                    }
                    return (
                      <>
                        <td key={`${name}-${mat}-full`} className="border-r border-border p-0" style={{ background: "hsl(215 60% 97%)" }}>
                          <input
                            type="number"
                            step="0.01"
                            value={row.full_price_bbd ?? ""}
                            placeholder="—"
                            onChange={(e) => setCell(row.id, "full_price_bbd", e.target.value)}
                            className="w-full px-2 py-1.5 text-left bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td key={`${name}-${mat}-delta`} className="border-r border-border last:border-r-0 p-0">
                          <input
                            type="number"
                            step="0.01"
                            value={row.delta_bbd ?? ""}
                            placeholder="—"
                            onChange={(e) => setCell(row.id, "delta_bbd", e.target.value)}
                            className="w-full px-2 py-1.5 text-left bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-emerald-700"
                          />
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px]" style={{ color: LABEL }}>
        Avg clear prices: {MATERIAL_COLS.map((m) => `${m}: $${avgClearPrice(m).toFixed(2)}`).join(" · ")}
      </p>

      {dirty && (
        <p className="text-xs" style={{ color: "hsl(38 92% 40%)" }}>
          Unsaved changes — click Save to persist.
        </p>
      )}
    </div>
  );
};

export default MaterialUpgradesGrid;
