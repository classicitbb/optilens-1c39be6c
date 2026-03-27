import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Eye, ImagePlus, Plus, Search, Settings, Store, Trash2 } from "lucide-react";
import { useLenses, type Lens } from "@/hooks/useLenses";
import { useSupplies, type Supply } from "@/hooks/useSupplies";
import { useAddons, type Addon } from "@/hooks/useAddons";
import LensFormDialog from "@/components/admin/LensFormDialog";
import SupplyFormDialog from "@/components/admin/SupplyFormDialog";
import AddonFormDialog from "@/components/admin/AddonFormDialog";
import { usePricingSheets } from "@/hooks/usePricingSheets";
import { useAddonPricingSheets } from "@/hooks/useAddonPricingSheets";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type ProductType = "lens" | "supply" | "addon";
type ProductFilter = "all" | "lenses" | "supplies" | "services";
type SortMode = "az" | "za" | "price-high";

const CATALOG_FILTER_KEY = "catalog_filter_store_v1";
const PRODUCT_IMAGE_BUCKET = "product-images";
const DEFAULT_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='600' height='600' fill='white'/><rect x='30' y='30' width='540' height='540' fill='none' stroke='#e5e7eb' stroke-width='2'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20' fill='#9ca3af'>No image</text></svg>`)}`;

interface ProductMedia {
  id: string;
  product_type: ProductType;
  product_id: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

interface ProductOverride {
  id: string;
  product_type: ProductType;
  product_id: string;
  is_vat_taxable: boolean;
  quantity_label: string | null;
  website_badges: string[] | null;
}

interface ProductRow {
  id: string;
  type: ProductType;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  showOnWebsite: boolean;
  isActive: boolean;
  priceBbd: number;
  priceUsd: number;
  tags: string[];
  imageUrl: string;
  quantityLabel: string;
  isVatTaxable: boolean;
}

const sortProducts = (items: ProductRow[], sortMode: SortMode) => {
  const sorted = [...items];
  if (sortMode === "az") sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (sortMode === "za") sorted.sort((a, b) => b.name.localeCompare(a.name));
  if (sortMode === "price-high") sorted.sort((a, b) => b.priceBbd - a.priceBbd || a.name.localeCompare(b.name));
  return sorted;
};

const toCatalogTab = (type: ProductType): "lenses" | "supplies" | "addons" => {
  if (type === "lens") return "lenses";
  if (type === "supply") return "supplies";
  return "addons";
};

const WebsiteStorePage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: lenses = [], isLoading: loadingLenses, updateMutation: updateLensMutation } = useLenses();
  const { data: supplies = [], isLoading: loadingSupplies, updateMutation: updateSupplyMutation } = useSupplies();
  const { data: addons = [], isLoading: loadingAddons, updateMutation: updateAddonMutation } = useAddons();
  const { data: pricingSheets = [] } = usePricingSheets();
  const { data: addonPricingSheets = [] } = useAddonPricingSheets(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [lensEditorOpen, setLensEditorOpen] = useState(false);
  const [supplyEditorOpen, setSupplyEditorOpen] = useState(false);
  const [addonEditorOpen, setAddonEditorOpen] = useState(false);

  const { data: pricingSettings } = useQuery({
    queryKey: ["pricing-settings-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("fx_rates, fx_risk_buffer")
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const usdFxRate = useMemo(() => {
    const fxRates = (pricingSettings?.fx_rates ?? {}) as Record<string, number>;
    const base = fxRates.USD ?? 1;
    return base * (1 + (pricingSettings?.fx_risk_buffer ?? 0));
  }, [pricingSettings]);

  const { data: mediaRows = [] } = useQuery({
    queryKey: ["store-product-media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_product_media" as any)
        .select("id, product_type, product_id, image_url, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) return [] as ProductMedia[];
      return (data ?? []) as unknown as ProductMedia[];
    },
  });

  const { data: productOverrides = [] } = useQuery({
    queryKey: ["store-product-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_product_overrides" as any)
        .select("id, product_type, product_id, is_vat_taxable, quantity_label, website_badges");

      if (error) return [] as ProductOverride[];
      return (data ?? []) as ProductOverride[];
    },
  });

  const mediaMap = useMemo(() => {
    const map = new Map<string, ProductMedia[]>();
    for (const row of mediaRows) {
      const key = `${row.product_type}:${row.product_id}`;
      const existing = map.get(key) ?? [];
      existing.push(row);
      map.set(key, existing.sort((a, b) => a.sort_order - b.sort_order));
    }
    return map;
  }, [mediaRows]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, ProductOverride>();
    for (const row of productOverrides) map.set(`${row.product_type}:${row.product_id}`, row);
    return map;
  }, [productOverrides]);

  const allProducts = useMemo<ProductRow[]>(() => {
    const normalizeUsd = (bbd: number) => (usdFxRate > 0 ? bbd / usdFxRate : bbd);

    const lensRows = lenses.map((lens) => {
      const key = `lens:${lens.id}`;
      const media = mediaMap.get(key) ?? [];
      const override = overrideMap.get(key);
      return {
        id: lens.id,
        type: "lens" as const,
        name: lens.name,
        category: lens.lenstype?.name ?? "Lens",
        subcategory: lens.material?.name ?? "",
        description: lens.notes ?? "",
        showOnWebsite: lens.show_on_website,
        isActive: lens.is_active,
        priceBbd: Number(lens.sell_price ?? 0),
        priceUsd: normalizeUsd(Number(lens.sell_price ?? 0)),
        tags: [lens.mftype?.name, lens.material?.name, lens.lenstype?.name, ...(override?.website_badges ?? [])].filter(Boolean) as string[],
        imageUrl: media[0]?.image_url ?? DEFAULT_IMAGE,
        quantityLabel: override?.quantity_label ?? "pair",
        isVatTaxable: Boolean(override?.is_vat_taxable),
      };
    });

    const supplyRows = supplies.map((supply) => {
      const key = `supply:${supply.id}`;
      const media = mediaMap.get(key) ?? [];
      const override = overrideMap.get(key);
      return {
        id: supply.id,
        type: "supply" as const,
        name: supply.name,
        category: supply.category || "Supply",
        subcategory: `${supply.quantity_per_unit} ${supply.unit}`.trim(),
        description: supply.description ?? "",
        showOnWebsite: supply.show_on_website,
        isActive: supply.is_active,
        priceBbd: Number(supply.sell_price ?? 0),
        priceUsd: normalizeUsd(Number(supply.sell_price ?? 0)),
        tags: [supply.category, supply.unit, ...(override?.website_badges ?? [])].filter(Boolean) as string[],
        imageUrl: media[0]?.image_url ?? supply.image_url ?? DEFAULT_IMAGE,
        quantityLabel: override?.quantity_label ?? `${supply.quantity_per_unit} ${supply.unit}`.trim(),
        isVatTaxable: Boolean(override?.is_vat_taxable),
      };
    });

    const addonRows = addons.map((addon) => {
      const key = `addon:${addon.id}`;
      const media = mediaMap.get(key) ?? [];
      const override = overrideMap.get(key);
      return {
        id: addon.id,
        type: "addon" as const,
        name: addon.name,
        category: addon.category || "Service",
        subcategory: "service",
        description: addon.description ?? "",
        showOnWebsite: addon.show_on_website,
        isActive: addon.is_active,
        priceBbd: Number(addon.price ?? 0),
        priceUsd: normalizeUsd(Number(addon.price ?? 0)),
        tags: [addon.category, ...(override?.website_badges ?? [])].filter(Boolean) as string[],
        imageUrl: media[0]?.image_url ?? DEFAULT_IMAGE,
        quantityLabel: override?.quantity_label ?? "service",
        isVatTaxable: Boolean(override?.is_vat_taxable),
      };
    });

    return [...lensRows, ...supplyRows, ...addonRows];
  }, [addons, lenses, mediaMap, overrideMap, supplies, usdFxRate]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = allProducts.filter((row) => {
      if (!row.showOnWebsite) return false;
      if (filter === "lenses" && row.type !== "lens") return false;
      if (filter === "supplies" && row.type !== "supply") return false;
      if (filter === "services" && row.type !== "addon") return false;
      if (!query) return true;
      return [row.name, row.category, row.description, row.tags.join(" ")].some((field) => field.toLowerCase().includes(query));
    });
    return sortProducts(filtered, sortMode);
  }, [allProducts, filter, search, sortMode]);

  const pickerRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const candidates = allProducts.filter((row) => {
      if (!row.isActive || row.showOnWebsite) return false;
      if (filter === "lenses" && row.type !== "lens") return false;
      if (filter === "supplies" && row.type !== "supply") return false;
      if (filter === "services" && row.type !== "addon") return false;
      if (!query) return true;
      return [row.name, row.category, row.description].some((field) => field.toLowerCase().includes(query));
    });
    return sortProducts(candidates, sortMode);
  }, [allProducts, filter, search, sortMode]);

  const isLoading = loadingLenses || loadingSupplies || loadingAddons;

  const updateVisibility = (row: ProductRow, showOnWebsite: boolean) => {
    if (row.type === "lens") {
      const lens = lenses.find((item) => item.id === row.id);
      if (!lens) return;
      updateLensMutation.mutate(
        {
          id: lens.id,
          form: {
            name: lens.name,
            supplier_id: lens.supplier_id,
            brand_id: lens.brand_id,
            material_id: lens.material_id,
            mftype_id: lens.mftype_id,
            lenstype_id: lens.lenstype_id,
            finishtype_id: lens.finishtype_id,
            index_value: lens.index_value,
            base_price: lens.base_price,
            sell_price: lens.sell_price,
            sph_min: lens.sph_min,
            sph_max: lens.sph_max,
            cyl_min: lens.cyl_min,
            cyl_max: lens.cyl_max,
            add_min: lens.add_min,
            add_max: lens.add_max,
            is_active: lens.is_active,
            show_in_pricelist: lens.show_in_pricelist,
            full_lab: lens.full_lab,
            show_in_ws_pricelist: lens.show_in_ws_pricelist,
            show_on_website: showOnWebsite,
            notes: lens.notes,
            option: lens.lens_lens_options[0] ? { lens_option_id: lens.lens_lens_options[0].lens_option_id, extra_cost: lens.lens_lens_options[0].extra_cost } : null,
          },
        },
        {
          onSuccess: () => toast({ title: showOnWebsite ? "Product published to website" : "Product removed from website" }),
          onError: (error: any) => toast({ title: "Unable to update", description: error?.message || "Unexpected error", variant: "destructive" }),
        },
      );
      return;
    }

    if (row.type === "supply") {
      const supply = supplies.find((item) => item.id === row.id);
      if (!supply) return;
      updateSupplyMutation.mutate(
        {
          id: supply.id,
          form: {
            name: supply.name,
            category: supply.category,
            description: supply.description,
            sku: supply.sku,
            base_price: supply.base_price,
            sell_price: supply.sell_price,
            unit: supply.unit,
            quantity_per_unit: supply.quantity_per_unit,
            is_active: supply.is_active,
            show_on_website: showOnWebsite,
            image_url: supply.image_url,
            notes: supply.notes,
            supplier_id: supply.supplier_id,
            brand_id: supply.brand_id,
            preferred: supply.preferred,
            stocked: supply.stocked,
            show_in_pricelist: supply.show_in_pricelist,
            bin: supply.bin,
            detail: supply.detail,
            currency: supply.currency,
            bb_item: supply.bb_item,
            duty_added: supply.duty_added,
            vat_paid: supply.vat_paid,
            labour_added: supply.labour_added,
            stk_wspl: supply.stk_wspl,
          },
        },
        {
          onSuccess: () => toast({ title: showOnWebsite ? "Product published to website" : "Product removed from website" }),
          onError: (error: any) => toast({ title: "Unable to update", description: error?.message || "Unexpected error", variant: "destructive" }),
        },
      );
      return;
    }

    const addon = addons.find((item) => item.id === row.id);
    if (!addon) return;

    updateAddonMutation.mutate(
      {
        id: addon.id,
        form: {
          name: addon.name,
          sku: addon.sku,
          category: addon.category,
          description: addon.description,
          cost: addon.cost,
          price: addon.price,
          is_auto: addon.is_auto,
          auto_rule: addon.auto_rule,
          is_active: addon.is_active,
          show_on_website: showOnWebsite,
          sort_order: addon.sort_order,
          supplier_id: addon.supplier_id,
        },
      },
      {
        onSuccess: () => toast({ title: showOnWebsite ? "Service published to website" : "Service removed from website" }),
        onError: (error: any) => toast({ title: "Unable to update", description: error?.message || "Unexpected error", variant: "destructive" }),
      },
    );
  };

  const openInCatalogForPriceEdit = (row: ProductRow) => {
    const tab = toCatalogTab(row.type);
    try {
      const raw = localStorage.getItem(CATALOG_FILTER_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const next = {
        ...parsed,
        activeTab: tab,
      };
      if (tab === "lenses") next.lens = { ...(parsed?.lens ?? {}), search: row.name };
      if (tab === "supplies") next.supply = { ...(parsed?.supply ?? {}), search: row.name };
      if (tab === "addons") next.addon = { ...(parsed?.addon ?? {}), search: row.name };
      localStorage.setItem(CATALOG_FILTER_KEY, JSON.stringify(next));
    } catch {
      // noop
    }
    navigate("/admin/pricing/catalog");
  };

  const openEditor = (row: ProductRow) => {
    setSelected(row);
    setEditorOpen(true);
  };

  const selectedMedia = useMemo(() => {
    if (!selected) return [] as ProductMedia[];
    return mediaMap.get(`${selected.type}:${selected.id}`) ?? [];
  }, [mediaMap, selected]);

  const persistOverride = async (patch: Partial<ProductOverride>) => {
    if (!selected) return;
    const existing = overrideMap.get(`${selected.type}:${selected.id}`);
    const payload = {
      product_type: selected.type,
      product_id: selected.id,
      is_vat_taxable: existing?.is_vat_taxable ?? false,
      quantity_label: existing?.quantity_label ?? selected.quantityLabel,
      website_badges: existing?.website_badges ?? selected.tags,
      ...patch,
    };

    if (existing?.id) {
      const { error } = await supabase.from("store_product_overrides" as any).update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("store_product_overrides" as any).insert(payload as any);
      if (error) throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ["store-product-overrides"] });
  };

  const moveMedia = async (media: ProductMedia, direction: "up" | "down") => {
    const list = selectedMedia;
    const index = list.findIndex((item) => item.id === media.id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const target = list[swapIndex];

    await supabase.from("store_product_media" as any).update({ sort_order: target.sort_order } as any).eq("id", media.id);
    await supabase.from("store_product_media" as any).update({ sort_order: media.sort_order } as any).eq("id", target.id);
    await queryClient.invalidateQueries({ queryKey: ["store-product-media"] });
  };

  const removeMedia = async (media: ProductMedia) => {
    await supabase.from("store_product_media" as any).update({ is_active: false } as any).eq("id", media.id);
    await queryClient.invalidateQueries({ queryKey: ["store-product-media"] });
  };

  const uploadMedia = async (files: FileList | null) => {
    if (!selected || !files || files.length === 0) return;
    const currentCount = selectedMedia.length;
    const remaining = Math.max(0, 4 - currentCount);
    if (remaining <= 0) {
      toast({ title: "Image limit reached", description: "Each product can have up to 4 images.", variant: "destructive" });
      return;
    }

    const uploads = Array.from(files).slice(0, remaining);
    for (const [offset, file] of uploads.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `products/${selected.type}/${selected.id}/${Date.now()}_${offset}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, { upsert: true });
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);

      await supabase.from("store_product_media" as any).insert({
        product_type: selected.type,
        product_id: selected.id,
        image_url: urlData.publicUrl,
        sort_order: currentCount + offset,
        is_active: true,
      } as any);
    }

    await queryClient.invalidateQueries({ queryKey: ["store-product-media"] });
  };

  const selectedLens = selected?.type === "lens" ? lenses.find((item) => item.id === selected.id) ?? null : null;
  const selectedSupply = selected?.type === "supply" ? supplies.find((item) => item.id === selected.id) ?? null : null;
  const selectedAddon = selected?.type === "addon" ? addons.find((item) => item.id === selected.id) ?? null : null;

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <AdminPageHeader icon={Store} title="Website Store Products" />
        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setPickerOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Product to Website
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product, category, tag" />
        </div>

        <Select value={filter} onValueChange={(value) => setFilter(value as ProductFilter)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="lenses">Lenses</SelectItem>
            <SelectItem value="supplies">Supplies</SelectItem>
            <SelectItem value="services">Services (Add-ons)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="az">A to Z</SelectItem>
            <SelectItem value="za">Z to A</SelectItem>
            <SelectItem value="price-high">Price High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-hidden flex-1 min-h-0">
        <div className="h-full overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="text-left font-medium px-3 py-2">Product</th>
                <th className="text-left font-medium px-3 py-2">Type</th>
                <th className="text-left font-medium px-3 py-2">Category / Qty</th>
                <th className="text-right font-medium px-3 py-2">Price (BBD / USD)</th>
                <th className="text-center font-medium px-3 py-2">VAT</th>
                <th className="text-center font-medium px-3 py-2">Visible</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-3 py-3 text-muted-foreground" colSpan={7}>Loading products…</td></tr>
              ) : visibleRows.length === 0 ? (
                <tr><td className="px-3 py-3 text-muted-foreground" colSpan={7}>No website products match the selected filters.</td></tr>
              ) : visibleRows.map((row) => (
                <tr key={`${row.type}:${row.id}`} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <img src={row.imageUrl} alt={`${row.name} preview`} className="h-10 w-10 rounded border object-cover bg-white" />
                      <div>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-muted-foreground">{row.description || "No description"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2"><Badge variant="outline">{row.type === "addon" ? "service" : row.type}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">{row.category} · {row.quantityLabel}</td>
                  <td className="px-3 py-2 text-right">
                    <div>${row.priceBbd.toFixed(2)} BBD</div>
                    <div className="text-muted-foreground">${row.priceUsd.toFixed(2)} USD</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={row.isVatTaxable ? "default" : "secondary"}>{row.isVatTaxable ? "Taxable" : "No VAT"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch checked={row.showOnWebsite} onCheckedChange={(checked) => updateVisibility(row, checked)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openEditor(row)}>
                        <Settings className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {(row.type === "lens" || row.type === "supply") && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                          <Link to={`/store/product/${row.type}/${row.id}`} target="_blank" rel="noreferrer">
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Store Product Editor</DialogTitle>
            <DialogDescription>
              Edit full catalog fields, website media, taxability, and review all website-visible product variables.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 rounded border p-3">
                <img src={selected.imageUrl} alt={`${selected.name} preview`} className="h-[120px] w-[120px] rounded border object-cover bg-white" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selected.type === "addon" ? "service" : selected.type}</Badge>
                    <Badge variant="secondary">{selected.category}</Badge>
                    <Badge variant={selected.isVatTaxable ? "default" : "secondary"}>{selected.isVatTaxable ? "VAT taxable" : "No VAT"}</Badge>
                  </div>
                  <div className="font-semibold">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">{selected.description || "No description"}</div>
                  <div className="text-xs">{selected.subcategory ? `Sold as: ${selected.quantityLabel} (${selected.subcategory})` : `Sold as: ${selected.quantityLabel}`}</div>
                  <div className="text-xs">{selected.priceBbd.toFixed(2)} BBD · {selected.priceUsd.toFixed(2)} USD</div>
                  {selected.tags.length > 0 && <div className="flex flex-wrap gap-1">{selected.tags.map((tag) => <Badge variant="outline" key={tag}>{tag}</Badge>)}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded border p-3">
                <div className="space-y-2">
                  <Label>VAT taxability (website checkout)</Label>
                  <div className="flex items-center justify-between rounded border p-2">
                    <span className="text-sm">Charge VAT for this product</span>
                    <Switch
                      checked={selected.isVatTaxable}
                      onCheckedChange={async (checked) => {
                        try {
                          await persistOverride({ is_vat_taxable: checked });
                          setSelected((prev) => (prev ? { ...prev, isVatTaxable: checked } : prev));
                          toast({ title: "VAT setting updated" });
                        } catch (error: any) {
                          toast({ title: "Unable to update VAT", description: error?.message || "Unexpected error", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty-label">Website quantity label</Label>
                  <Input
                    id="qty-label"
                    value={selected.quantityLabel}
                    onChange={(event) => setSelected((prev) => (prev ? { ...prev, quantityLabel: event.target.value } : prev))}
                    onBlur={async () => {
                      try {
                        await persistOverride({ quantity_label: selected.quantityLabel });
                      } catch (error: any) {
                        toast({ title: "Unable to save quantity label", description: error?.message || "Unexpected error", variant: "destructive" });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setMediaOpen(true)}>
                  <ImagePlus className="h-4 w-4 mr-1" /> Manage Images
                </Button>
                <Button variant="outline" onClick={() => openInCatalogForPriceEdit(selected)}>Edit price in Catalog</Button>
                <Button variant="outline" onClick={() => {
                  if (selected.type === "lens") setLensEditorOpen(true);
                  if (selected.type === "supply") setSupplyEditorOpen(true);
                  if (selected.type === "addon") setAddonEditorOpen(true);
                }}>
                  Open Full Field Editor
                </Button>
                {(selected.type === "lens" || selected.type === "supply") && (
                  <Button variant="outline" asChild>
                    <Link to={`/store/product/${selected.type}/${selected.id}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4 mr-1" /> View Live Product</Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mediaOpen} onOpenChange={setMediaOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Product Image Bucket</DialogTitle>
            <DialogDescription>Upload up to 4 images. Reorder images to control website presentation.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input type="file" accept="image/*" multiple onChange={(event) => uploadMedia(event.target.files)} />
            <p className="text-xs text-muted-foreground">Images: {selectedMedia.length}/4</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedMedia.length === 0 ? (
                <div className="rounded border p-4 text-xs text-muted-foreground">No images uploaded. A default white placeholder will be used.</div>
              ) : selectedMedia.map((media, index) => (
                <div key={media.id} className="rounded border p-2 space-y-2">
                  <img src={media.image_url} alt={`Product image ${index + 1}`} className="h-36 w-full rounded object-cover" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Position {index + 1}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveMedia(media, "up")} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveMedia(media, "down")} disabled={index === selectedMedia.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => removeMedia(media)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Products to Website</DialogTitle>
            <DialogDescription>Add active products/services to website visibility.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-auto rounded border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted"><tr><th className="text-left px-3 py-2">Product</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Category</th><th className="text-right px-3 py-2">Action</th></tr></thead>
              <tbody>
                {pickerRows.length === 0 ? <tr><td className="px-3 py-3 text-muted-foreground" colSpan={4}>No active products available to add.</td></tr> : pickerRows.map((row) => (
                  <tr key={`${row.type}:${row.id}`} className="border-t">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.type === "addon" ? "service" : row.type}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 text-right"><Button size="sm" className="h-7 text-[11px]" onClick={() => updateVisibility(row, true)}>Add</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <LensFormDialog
        open={lensEditorOpen}
        onOpenChange={setLensEditorOpen}
        lens={selectedLens}
        lenses={lenses}
        isPending={updateLensMutation.isPending}
        onSubmit={(form) => {
          if (!selectedLens) return;
          updateLensMutation.mutate({ id: selectedLens.id, form }, { onSuccess: () => toast({ title: "Lens updated" }) });
        }}
      />

      <SupplyFormDialog
        open={supplyEditorOpen}
        onOpenChange={setSupplyEditorOpen}
        supply={selectedSupply}
        supplies={supplies}
        isPending={updateSupplyMutation.isPending}
        onSubmit={(form) => {
          if (!selectedSupply) return;
          updateSupplyMutation.mutate({ id: selectedSupply.id, form }, { onSuccess: () => toast({ title: "Supply updated" }) });
        }}
      />

      <AddonFormDialog
        open={addonEditorOpen}
        onOpenChange={setAddonEditorOpen}
        addon={selectedAddon}
        addons={addons}
        pricingSheets={pricingSheets}
        addonPricingSheets={addonPricingSheets.filter((sheet) => sheet.addon_id === selectedAddon?.id)}
        isPending={updateAddonMutation.isPending}
        onSubmit={(form) => {
          if (!selectedAddon) return;
          updateAddonMutation.mutate({ id: selectedAddon.id, form }, { onSuccess: () => toast({ title: "Service updated" }) });
        }}
      />
    </div>
  );
};

export default WebsiteStorePage;
