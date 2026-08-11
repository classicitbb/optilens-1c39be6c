import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useInnovationsStoreLensCatalog } from "@/hooks/useInnovationsStoreLensCatalog";
import { usePricelistCatalogRowUpsert } from "@/hooks/usePricelistCatalogRowUpsert";

// Prices the real Innova SKU catalog (innovations_store_lenses) for one
// pricelist version — feeds the Stock Order Builder's account eligibility
// and per-line pricing (stock_lens_eligible_accounts view,
// _price_stock_order_items()). Deliberately separate component from
// ListCatalogTab: that component's Save button rebuilds and wipes
// catalog_type='stock' rows by row_type ('lens'/'addon'/'supply') — it has
// no knowledge of these row_type='stock_variant' rows, and this component
// never touches its rows either (see the scoped delete fix in
// usePricelistCatalogRows.ts). Row-level upserts only, via
// usePricelistCatalogRowUpsert, so the two editors can't stomp each other.
//
// Price is set once per lens family (one row per innovations_store_lenses.id),
// applied to every power/side under it — see FLAGGED ASSUMPTION 1 in
// 20260811000000_stock_order_pricing_and_outbox.sql.

interface PricedRow {
  item_id: string;
  bbd_price: number;
}

const buildRowKey = (innovationsLensId: string) => `stock_variant::${innovationsLensId}`;

const StockSkuPricingTab = ({ versionId }: { versionId: number | null }) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: families = [], isLoading: familiesLoading } = useInnovationsStoreLensCatalog();

  const { data: pricedRows = [], isLoading: pricesLoading } = useQuery<PricedRow[]>({
    queryKey: ["stock-variant-catalog-rows", versionId],
    enabled: versionId != null,
    queryFn: async () => {
      const { data, error } = await (supabase.from("pricelist_catalog_rows") as any)
        .select("item_id, bbd_price")
        .eq("pricelist_version_id", versionId)
        .eq("catalog_type", "stock")
        .eq("row_type", "stock_variant");
      if (error) throw error;
      return (data ?? []).filter((r: PricedRow) => r.item_id);
    },
  });

  const priceByFamilyId = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const row of pricedRows) map.set(row.item_id, row.bbd_price);
    return map;
  }, [pricedRows]);

  const { upsertRow, deleteRow } = usePricelistCatalogRowUpsert(versionId, "stock");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f) =>
      [f.name, f.material, f.manufacturer, f.mf_type, f.option_name].filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [families, search]);

  const pricedCount = pricedRows.filter((r) => r.bbd_price != null).length;

  const handleSave = (family: (typeof families)[number]) => {
    const raw = drafts[family.id];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    const price = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (!Number.isFinite(price) || (price as number) < 0)) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }
    if (!versionId) return;

    if (price === null) {
      deleteRow.mutate(buildRowKey(family.innovations_lens_id), {
        onSuccess: () => setDrafts((d) => { const next = { ...d }; delete next[family.id]; return next; }),
        onError: (e: any) => toast({ title: "Could not clear price", description: e.message, variant: "destructive" }),
      });
      return;
    }

    upsertRow.mutate(
      {
        row_key: buildRowKey(family.innovations_lens_id),
        row_type: "stock_variant",
        section: "Stock Order SKUs",
        display_description: family.name,
        bbd_price: price,
        item_id: family.id,
      },
      {
        onSuccess: () => setDrafts((d) => { const next = { ...d }; delete next[family.id]; return next; }),
        onError: (e: any) => toast({ title: "Could not save price", description: e.message, variant: "destructive" }),
      },
    );
  };

  if (!versionId) {
    return <p className="text-sm text-muted-foreground px-3 py-6">Select a pricelist version first.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Prices the real Innova SKU catalog (finished + semi-finished lenses synced from Innova) for the Stock Order
          Builder. One price per lens family, applied to every power and side. Accounts only appear in the Stock
          Order Builder once their assigned pricelist has at least one priced row here.
        </p>
        <Badge variant="secondary">{pricedCount} of {families.length} priced</Badge>
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

      {familiesLoading || pricesLoading ? (
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
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">State</th>
                <th className="w-40 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">BBD price</th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((family) => {
                const currentPrice = priceByFamilyId.get(family.id);
                const draft = drafts[family.id];
                const displayValue = draft !== undefined ? draft : (currentPrice != null ? String(currentPrice) : "");
                const dirty = draft !== undefined;
                return (
                  <tr key={family.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-medium text-foreground">{family.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{[family.material, family.mf_type].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[11px]">
                        {family.lens_state === "finished" ? "Finished" : family.lens_state === "semi_finished" ? "Semi-finished" : family.lens_state}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number" min={0} step="0.01"
                        className="h-8 text-right"
                        placeholder="Unpriced"
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
    </div>
  );
};

export default StockSkuPricingTab;
