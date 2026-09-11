import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Check, Link2, Link2Off } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useInnovationsStoreLensCatalog, type InnovationsStoreLens } from "@/hooks/useInnovationsStoreLensCatalog";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { usePricelistCatalogRowUpsert } from "@/hooks/usePricelistCatalogRowUpsert";
import { useFamilyLensMap } from "@/hooks/useFamilyLensMap";
import { LensPickerPopover, type PickedItem } from "@/components/admin/LensPickerPopover";

// Prices the real Innova SKU catalog (innovations_store_lenses) for one
// pricelist version, one row per lens family.
//
// A family is linked to the website lens it represents
// (innovations_family_lens_map, seeded from matching OPC codes). The price
// typed here is written against that lens as an ordinary
// catalog_type='stock', row_type='lens' row keyed `lens-<uuid>` — the exact
// row the WSPL Stock List tab maintains and the row every ordering surface
// reads through resolve_customer_price(). One price, one place.
//
// Row-level upserts only, via usePricelistCatalogRowUpsert, so this editor and
// the List Catalog editor can't stomp each other.

const buildRowKey = (lensId: string) => `lens-${lensId}`;

export const familyDisplayName = (family: InnovationsStoreLens) => {
  const raw = (family.name ?? "").trim();
  if (raw && !/^family[\s:]/i.test(raw)) return raw;
  // Innova sends most attributes as bare numeric codes; only keep the ones
  // that read as words so we never invent a product name.
  const parts = [family.material ?? family.material_group, family.mf_type, family.lens_type, family.option_name, family.finish_type]
    .map((v) => (v ?? "").trim())
    .filter((v, i, arr) => v.length > 0 && !/^\d+$/.test(v) && arr.indexOf(v) === i);
  if (!parts.length) return `Innova family ${family.innovations_lens_id}`;
  const name = parts.join(" · ");
  return family.manufacturer && !/^\d+$/.test(family.manufacturer) ? `${name} (${family.manufacturer})` : name;
};


interface StockSkuPricingTabProps {
  versionId: number | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

const StockSkuPricingTab = ({ versionId, onDirtyChange }: StockSkuPricingTabProps) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pickerFamily, setPickerFamily] = useState<InnovationsStoreLens | null>(null);

  const hasDrafts = Object.keys(drafts).length > 0;

  useEffect(() => {
    onDirtyChange?.(hasDrafts);
  }, [hasDrafts, onDirtyChange]);

  const { data: families = [], isLoading: familiesLoading } = useInnovationsStoreLensCatalog();
  const { linkByFamily, lensById, isLoading: linksLoading, setLink, clearLink } = useFamilyLensMap();
  const { data: stockRows = [], isLoading: pricesLoading } = usePricelistCatalogRows(versionId, "stock");
  const { upsertRow, deleteRow } = usePricelistCatalogRowUpsert(versionId, "stock");

  const rowByLensId = useMemo(() => {
    const map = new Map<string, (typeof stockRows)[number]>();
    for (const row of stockRows) {
      if (row.row_type === "lens" && row.item_id) map.set(row.item_id, row);
    }
    return map;
  }, [stockRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f) =>
      [familyDisplayName(f), f.name, f.material, f.manufacturer, f.mf_type, f.option_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [families, search]);

  const linkedCount = families.filter((f) => linkByFamily.has(f.innovations_lens_id)).length;
  const pricedCount = families.filter((f) => {
    const link = linkByFamily.get(f.innovations_lens_id);
    return !!link && (rowByLensId.get(link.lens_id)?.bbd_price ?? null) != null;
  }).length;

  const handleSave = (family: InnovationsStoreLens) => {
    const link = linkByFamily.get(family.innovations_lens_id);
    if (!link) {
      toast({ title: "Link a lens first", description: "This family isn't linked to a website lens yet.", variant: "destructive" });
      return;
    }
    const raw = drafts[family.id];
    if (raw === undefined || !versionId) return;
    const trimmed = raw.trim();
    const price = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (!Number.isFinite(price) || (price as number) < 0)) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }

    const clearDraft = () => setDrafts((d) => { const next = { ...d }; delete next[family.id]; return next; });
    const existing = rowByLensId.get(link.lens_id);

    if (price === null) {
      deleteRow.mutate(buildRowKey(link.lens_id), {
        onSuccess: () => { clearDraft(); toast({ title: "Price cleared" }); },
        onError: (e: any) => toast({ title: "Could not clear price", description: e.message, variant: "destructive" }),
      });
      return;
    }

    upsertRow.mutate(
      {
        row_key: buildRowKey(link.lens_id),
        row_type: "lens",
        section: existing?.section || family.mf_type || "Stock Lenses",
        display_description: existing?.display_description || lensById.get(link.lens_id)?.name || familyDisplayName(family),
        bbd_price: price,
        item_id: link.lens_id,
        sort_order: existing?.sort_order ?? 0,
      },
      {
        onSuccess: () => { clearDraft(); toast({ title: "Price saved", description: `${familyDisplayName(family)} — BBD ${price.toFixed(2)}` }); },
        onError: (e: any) => toast({ title: "Could not save price", description: e.message, variant: "destructive" }),
      },
    );
  };

  const handlePick = (item: PickedItem) => {
    if (!pickerFamily || item.type !== "lens") return;
    const family = pickerFamily;
    setLink.mutate(
      { innovationsLensId: family.innovations_lens_id, lensId: item.id },
      {
        onSuccess: () => toast({ title: "Lens linked", description: `${familyDisplayName(family)} → ${item.name}` }),
        onError: (e: any) => toast({ title: "Could not link lens", description: e.message, variant: "destructive" }),
      },
    );
    setPickerFamily(null);
  };

  if (!versionId) {
    return <p className="text-sm text-muted-foreground px-3 py-6">Select a pricelist version first.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-3xl">
          Prices the real Innova SKU catalog (finished + semi-finished lenses synced from Innova), one price per lens
          family. Each family is linked to the website lens it represents — the price you set here is stored against
          that lens on this pricelist, so it is what the customer sees on the store, the Rx order form, the stock order
          form, and when staff order on their behalf.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{linkedCount} of {families.length} linked</Badge>
          <Badge variant="secondary">{pricedCount} of {families.length} priced</Badge>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search product name, material, or manufacturer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {familiesLoading || pricesLoading || linksLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lens family</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Material / MF type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked website lens</th>
                <th className="w-40 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">BBD price</th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((family) => {
                const link = linkByFamily.get(family.innovations_lens_id);
                const linkedLens = link ? lensById.get(link.lens_id) : undefined;
                const currentPrice = link ? rowByLensId.get(link.lens_id)?.bbd_price ?? null : null;
                const draft = drafts[family.id];
                const displayValue = draft !== undefined ? draft : (currentPrice != null ? String(currentPrice) : "");
                const dirty = draft !== undefined;
                return (
                  <tr key={family.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{linkedLens?.name ?? familyDisplayName(family)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {family.lens_state === "finished" ? "Finished" : family.lens_state === "semi_finished" ? "Semi-finished" : family.lens_state}
                        {" · "}{family.innovations_lens_id}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{[family.material, family.mf_type].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2">
                      {link ? (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{linkedLens?.name ?? "Linked lens"}</span>
                          <Badge variant="outline" className="text-[10px]">{link.match_source === "auto_opc" ? "auto" : "manual"}</Badge>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPickerFamily(family)}>
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground"
                            aria-label="Remove link"
                            onClick={() => clearLink.mutate(family.innovations_lens_id)}
                          >
                            <Link2Off className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7" onClick={() => setPickerFamily(family)}>
                          <Link2 className="mr-1.5 h-3.5 w-3.5" /> Not linked — pick a lens
                        </Button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number" min={0} step="0.01"
                        className="h-8 text-right"
                        placeholder={link ? "Unpriced" : "Link a lens first"}
                        disabled={!link}
                        value={displayValue}
                        onChange={(e) => setDrafts((d) => ({ ...d, [family.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(family); }}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {dirty && (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50"
                          aria-label="Save price"
                          disabled={upsertRow.isPending || deleteRow.isPending}
                          onClick={() => handleSave(family)}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">No matching lens families.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <LensPickerPopover
        open={pickerFamily !== null}
        onOpenChange={(v) => { if (!v) setPickerFamily(null); }}
        onPick={handlePick}
        currentId={pickerFamily ? linkByFamily.get(pickerFamily.innovations_lens_id)?.lens_id ?? null : null}
        mode="lens-only"
        wsplOnly
      />
    </div>
  );
};

export default StockSkuPricingTab;
