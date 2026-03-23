import { useMemo, useState, useCallback } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Plus, X, Save, Loader2 } from "lucide-react";
import { useAddons } from "@/hooks/useAddons";
import { usePricelistCatalogRows, PricelistCatalogRow } from "@/hooks/usePricelistCatalogRows";
import { usePricelistCatalogRowUpsert } from "@/hooks/usePricelistCatalogRowUpsert";
import { useToast } from "@/hooks/use-toast";

interface Props {
  versionId: number;
  showUSD: boolean;
  fxRate: number;
}

interface AddonRow {
  key: string;
  section: string;
  description: string;
  bbd: number;
  usd: number;
  addonId: string;
}

const RxAddonsExtrasEditor = ({ versionId, showUSD, fxRate }: Props) => {
  const { data: allAddons = [] } = useAddons();
  const { data: savedRows = [], saveRows } = usePricelistCatalogRows(versionId, "rx");
  const upsertRow = usePricelistCatalogRowUpsert(versionId, "rx");
  const { toast } = useToast();
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());

  const activeAddons = useMemo(
    () => allAddons.filter((a) => a.is_active),
    [allAddons]
  );

  // Existing addon rows from catalog
  const existingAddonRows = useMemo(
    () => savedRows.filter((r) => r.row_type === "addon" || r.row_type === "treatment"),
    [savedRows]
  );

  // Default addon rows from the addons table (if not already saved)
  const defaultAddonRows = useMemo<Map<string, AddonRow[]>>(() => {
    const map = new Map<string, AddonRow[]>();
    const cats = [...new Set(activeAddons.map((a) => a.category))].sort();
    for (const cat of cats) {
      const items = activeAddons.filter((a) => a.category === cat);
      if (!items.length) continue;
      map.set(
        cat,
        items.map((a) => ({
          key: `addon-${a.id}`,
          section: cat,
          description: a.name + (a.description ? ` — ${a.description}` : ""),
          bbd: a.price,
          usd: a.price * fxRate,
          addonId: a.id,
        }))
      );
    }
    return map;
  }, [activeAddons, fxRate]);

  // Merge saved addon rows with defaults
  const effectiveRows = useMemo<Map<string, AddonRow[]>>(() => {
    const savedAddonKeys = new Set(existingAddonRows.map((r) => r.row_key));
    const hasSaved = existingAddonRows.length > 0;

    if (hasSaved) {
      // Build from saved rows
      const map = new Map<string, AddonRow[]>();
      existingAddonRows.forEach((r) => {
        if (removedKeys.has(r.row_key)) return;
        const section = r.section || "Other";
        if (!map.has(section)) map.set(section, []);
        map.get(section)!.push({
          key: r.row_key,
          section,
          description: r.display_description,
          bbd: r.bbd_price ?? 0,
          usd: (r.bbd_price ?? 0) * fxRate,
          addonId: r.item_id ?? "",
        });
      });
      return map;
    }

    // Use defaults
    const map = new Map<string, AddonRow[]>();
    for (const [section, rows] of defaultAddonRows) {
      map.set(
        section,
        rows.filter((r) => !removedKeys.has(r.key))
      );
    }
    return map;
  }, [existingAddonRows, defaultAddonRows, removedKeys, fxRate]);

  const totalRows = useMemo(
    () => [...effectiveRows.values()].reduce((sum, rows) => sum + rows.length, 0),
    [effectiveRows]
  );

  const handleAddAddon = useCallback(
    async (addon: (typeof activeAddons)[number]) => {
      const rowKey = `addon-${addon.id}`;
      // Remove from removed set if it was previously removed
      setRemovedKeys((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });

      try {
        await upsertRow.upsertRow.mutateAsync({
          row_key: rowKey,
          row_type: "addon",
          section: addon.category,
          display_description: addon.name + (addon.description ? ` — ${addon.description}` : ""),
          bbd_price: addon.price,
          item_id: addon.id,
          sort_order: savedRows.length,
        });
        toast({ title: "Add-on added", description: `${addon.name} added to catalog.` });
      } catch (e: any) {
        toast({ title: "Unable to add", description: e.message, variant: "destructive" });
      }
    },
    [upsertRow, savedRows, toast]
  );

  const handleRemove = useCallback(
    (rowKey: string) => {
      setRemovedKeys((prev) => new Set(prev).add(rowKey));
    },
    []
  );

  const handleSave = useCallback(async () => {
    // Keep existing non-addon rows, replace addon rows with effective ones
    const nonAddonRows = savedRows.filter(
      (r) => r.row_type !== "addon" && r.row_type !== "treatment"
    );
    const addonCatalogRows: Omit<PricelistCatalogRow, "id">[] = [];
    let sortOrder = nonAddonRows.length;
    for (const [section, rows] of effectiveRows) {
      for (const row of rows) {
        addonCatalogRows.push({
          pricelist_version_id: versionId,
          catalog_type: "rx",
          row_key: row.key,
          row_type: "addon",
          section,
          display_description: row.description,
          bbd_price: row.bbd,
          item_id: row.addonId || null,
          sort_order: sortOrder++,
        });
      }
    }
    try {
      await saveRows.mutateAsync([
        ...nonAddonRows.map(({ id, ...rest }) => rest),
        ...addonCatalogRows,
      ]);
      setRemovedKeys(new Set());
      toast({ title: "Add-ons saved", description: `${addonCatalogRows.length} add-on row(s) saved.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  }, [savedRows, effectiveRows, versionId, saveRows, toast]);

  // Addons not yet in the effective rows
  const availableAddons = useMemo(() => {
    const usedKeys = new Set<string>();
    for (const rows of effectiveRows.values()) {
      rows.forEach((r) => usedKeys.add(r.key));
    }
    return activeAddons.filter((a) => !usedKeys.has(`addon-${a.id}`));
  }, [activeAddons, effectiveRows]);

  const currency = showUSD ? "USD" : "BBD";
  const isDirty = removedKeys.size > 0;

  if (totalRows === 0 && availableAddons.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Add-ons &amp; Extras</h3>
          <p className="text-xs text-muted-foreground">
            Manage treatment add-ons and extras included in this pricelist version.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saveRows.isPending}>
              {saveRows.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save Add-ons
            </Button>
          )}
        </div>
      </div>

      {totalRows > 0 ? (
        <Accordion type="multiple" defaultValue={[...effectiveRows.keys()]} className="space-y-0">
          {[...effectiveRows.entries()].map(([section, rows]) => (
            <AccordionItem key={section} value={section} className="border-b-0">
              <AccordionTrigger className="px-4 py-2 text-xs font-bold uppercase tracking-wider hover:no-underline"
                style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
                {section} ({rows.length})
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border" style={{ background: "hsl(var(--muted))" }}>
                      <th className="px-4 py-1.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-1.5 text-right font-medium text-muted-foreground w-28">{currency} Price</th>
                      <th className="px-2 py-1.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-2 text-foreground">{row.description}</td>
                        <td className="px-4 py-2 text-right font-mono text-foreground">
                          ${(showUSD ? row.usd : row.bbd).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => handleRemove(row.key)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove from pricelist"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-6">
          No add-ons included yet. Use the button below to add add-ons to this pricelist.
        </p>
      )}

      {availableAddons.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Available add-ons:</p>
          <div className="flex flex-wrap gap-1.5">
            {availableAddons.map((addon) => (
              <Button
                key={addon.id}
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={() => handleAddAddon(addon)}
              >
                <Plus className="h-3 w-3" />
                {addon.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RxAddonsExtrasEditor;
