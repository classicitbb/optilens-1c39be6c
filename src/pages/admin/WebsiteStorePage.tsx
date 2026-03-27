import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Store, ExternalLink, Settings } from "lucide-react";
import { useLenses, type Lens, type LensFormData } from "@/hooks/useLenses";
import { useSupplies, type Supply, type SupplyFormData } from "@/hooks/useSupplies";
import { useAddons, type Addon, type AddonFormData } from "@/hooks/useAddons";
import { useToast } from "@/hooks/use-toast";

type ProductType = "lens" | "supply" | "addon";
type ProductRow = {
  id: string;
  type: ProductType;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  showOnWebsite: boolean;
  price: number;
};

type SortMode = "az" | "za" | "price-high";
type ProductFilter = "all" | "lenses" | "supplies" | "services";

const CATALOG_FILTER_KEY = "catalog_filter_store_v1";

const toProductRow = (lens: Lens): ProductRow => ({
  id: lens.id,
  type: "lens",
  name: lens.name,
  category: lens.lenstype?.name ?? "Lens",
  description: lens.notes ?? "",
  isActive: lens.is_active,
  showOnWebsite: lens.show_on_website,
  price: Number(lens.sell_price ?? 0),
});

const toSupplyProductRow = (supply: Supply): ProductRow => ({
  id: supply.id,
  type: "supply",
  name: supply.name,
  category: supply.category || "Supply",
  description: supply.description ?? "",
  isActive: supply.is_active,
  showOnWebsite: supply.show_on_website,
  price: Number(supply.sell_price ?? 0),
});

const toAddonProductRow = (addon: Addon): ProductRow => ({
  id: addon.id,
  type: "addon",
  name: addon.name,
  category: addon.category || "Service",
  description: addon.description ?? "",
  isActive: addon.is_active,
  showOnWebsite: addon.show_on_website,
  price: Number(addon.price ?? 0),
});

const sortProducts = (products: ProductRow[], sortMode: SortMode) => {
  const sorted = [...products];
  if (sortMode === "az") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === "za") {
    sorted.sort((a, b) => b.name.localeCompare(a.name));
  } else {
    sorted.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
  }
  return sorted;
};

const toCatalogTab = (type: ProductType): "lenses" | "supplies" | "addons" => {
  if (type === "lens") return "lenses";
  if (type === "supply") return "supplies";
  return "addons";
};

const toLensFormData = (lens: Lens, overrides: Partial<LensFormData> = {}): LensFormData => ({
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
  show_on_website: lens.show_on_website,
  notes: lens.notes,
  option: lens.lens_lens_options?.[0]
    ? {
        lens_option_id: lens.lens_lens_options[0].lens_option_id,
        extra_cost: lens.lens_lens_options[0].extra_cost,
      }
    : null,
  ...overrides,
});

const toSupplyFormData = (supply: Supply, overrides: Partial<SupplyFormData> = {}): SupplyFormData => ({
  name: supply.name,
  category: supply.category,
  description: supply.description,
  sku: supply.sku,
  base_price: supply.base_price,
  sell_price: supply.sell_price,
  unit: supply.unit,
  quantity_per_unit: supply.quantity_per_unit,
  is_active: supply.is_active,
  show_on_website: supply.show_on_website,
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
  ...overrides,
});

const toAddonFormData = (addon: Addon, overrides: Partial<AddonFormData> = {}): AddonFormData => ({
  name: addon.name,
  sku: addon.sku,
  category: addon.category,
  description: addon.description,
  cost: addon.cost,
  price: addon.price,
  is_auto: addon.is_auto,
  auto_rule: addon.auto_rule,
  is_active: addon.is_active,
  show_on_website: addon.show_on_website,
  sort_order: addon.sort_order,
  supplier_id: addon.supplier_id,
  ...overrides,
});

const WebsiteStorePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: lenses = [], isLoading: loadingLenses, updateMutation: lensUpdateMutation } = useLenses();
  const { data: supplies = [], isLoading: loadingSupplies, updateMutation: supplyUpdateMutation } = useSupplies();
  const { data: addons = [], isLoading: loadingAddons, updateMutation: addonUpdateMutation } = useAddons();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [editorOpen, setEditorOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<ProductRow | null>(null);

  const rows = useMemo(() => {
    const all = [...lenses.map(toProductRow), ...supplies.map(toSupplyProductRow), ...addons.map(toAddonProductRow)];

    const visible = all.filter((row) => {
      if (!row.showOnWebsite) return false;
      if (filter === "lenses" && row.type !== "lens") return false;
      if (filter === "supplies" && row.type !== "supply") return false;
      if (filter === "services" && row.type !== "addon") return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [row.name, row.category, row.description].some((field) => field.toLowerCase().includes(query));
    });

    return sortProducts(visible, sortMode);
  }, [lenses, supplies, addons, filter, search, sortMode]);

  const pickerRows = useMemo(() => {
    const all = [...lenses.map(toProductRow), ...supplies.map(toSupplyProductRow), ...addons.map(toAddonProductRow)];
    const query = search.trim().toLowerCase();
    return sortProducts(
      all.filter((row) => {
        if (!row.isActive || row.showOnWebsite) return false;
        if (filter === "lenses" && row.type !== "lens") return false;
        if (filter === "supplies" && row.type !== "supply") return false;
        if (filter === "services" && row.type !== "addon") return false;
        if (!query) return true;
        return [row.name, row.category, row.description].some((field) => field.toLowerCase().includes(query));
      }),
      sortMode,
    );
  }, [lenses, supplies, addons, filter, search, sortMode]);

  const isLoading = loadingLenses || loadingSupplies || loadingAddons;

  const openEditor = (row: ProductRow) => {
    setSelected(row);
    setEditorOpen(true);
  };

  const updateWebsiteFlag = (row: ProductRow, showOnWebsite: boolean) => {
    if (row.type === "lens") {
      const lens = lenses.find((item) => item.id === row.id);
      if (!lens) return;
      const form = toLensFormData(lens, { show_on_website: showOnWebsite });
      lensUpdateMutation.mutate(
        { id: lens.id, form },
        {
          onSuccess: () => toast({ title: showOnWebsite ? "Product added to website" : "Product removed from website" }),
          onError: (error: any) => toast({ title: "Error", description: error?.message || "Unable to save", variant: "destructive" }),
        },
      );
      return;
    }

    if (row.type === "supply") {
      const supply = supplies.find((item) => item.id === row.id);
      if (!supply) return;
      const form = toSupplyFormData(supply, { show_on_website: showOnWebsite });
      supplyUpdateMutation.mutate(
        { id: supply.id, form },
        {
          onSuccess: () => toast({ title: showOnWebsite ? "Product added to website" : "Product removed from website" }),
          onError: (error: any) => toast({ title: "Error", description: error?.message || "Unable to save", variant: "destructive" }),
        },
      );
      return;
    }

    const addon = addons.find((item) => item.id === row.id);
    if (!addon) return;
    const form = toAddonFormData(addon, { show_on_website: showOnWebsite });
    addonUpdateMutation.mutate(
      { id: addon.id, form },
      {
        onSuccess: () => toast({ title: showOnWebsite ? "Service added to website" : "Service removed from website" }),
        onError: (error: any) => toast({ title: "Error", description: error?.message || "Unable to save", variant: "destructive" }),
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

      if (tab === "lenses") {
        next.lens = { ...(parsed?.lens ?? {}), search: row.name };
      } else if (tab === "supplies") {
        next.supply = { ...(parsed?.supply ?? {}), search: row.name };
      } else {
        next.addon = { ...(parsed?.addon ?? {}), search: row.name };
      }

      localStorage.setItem(CATALOG_FILTER_KEY, JSON.stringify(next));
    } catch {
      // no-op fallback; route navigation still works
    }

    navigate("/admin/pricing/catalog");
  };

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
          <Input className="pl-8 h-8 text-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products and services" />
        </div>

        <Select value={filter} onValueChange={(value) => setFilter(value as ProductFilter)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="lenses">Lenses</SelectItem>
            <SelectItem value="supplies">Supplies</SelectItem>
            <SelectItem value="services">Services (Add-ons)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
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
                <th className="text-left font-medium px-3 py-2">Category</th>
                <th className="text-right font-medium px-3 py-2">Website Price</th>
                <th className="text-center font-medium px-3 py-2">Visible</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={6}>Loading products…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={6}>No website products match the current filters.</td>
                </tr>
              ) : rows.map((row) => (
                <tr key={`${row.type}:${row.id}`} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    {row.description && <div className="text-muted-foreground mt-0.5 truncate max-w-[380px]">{row.description}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{row.type === "addon" ? "service" : row.type}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                  <td className="px-3 py-2 text-right">${row.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-center">
                    <Switch checked={row.showOnWebsite} onCheckedChange={(checked) => updateWebsiteFlag(row, checked)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openEditor(row)}>
                        <Settings className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openInCatalogForPriceEdit(row)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Price
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Website Product</DialogTitle>
            <DialogDescription>
              Non-pricing fields can be edited here. Use the Price action to update catalog pricing.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="product-name">Name</Label>
                <Input id="product-name" value={selected.name} onChange={(event) => setSelected((prev) => (prev ? { ...prev, name: event.target.value } : prev))} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="product-category">Category</Label>
                <Input id="product-category" value={selected.category} onChange={(event) => setSelected((prev) => (prev ? { ...prev, category: event.target.value } : prev))} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="product-description">Description / Notes</Label>
                <Textarea id="product-description" value={selected.description} onChange={(event) => setSelected((prev) => (prev ? { ...prev, description: event.target.value } : prev))} />
              </div>

              <div className="flex items-center justify-between rounded border p-2">
                <span className="text-sm">Show on Website</span>
                <Switch checked={selected.showOnWebsite} onCheckedChange={(checked) => setSelected((prev) => (prev ? { ...prev, showOnWebsite: checked } : prev))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selected) return;

                if (selected.type === "lens") {
                  const lens = lenses.find((item) => item.id === selected.id);
                  if (!lens) return;
                  const form = toLensFormData(lens, {
                    name: selected.name,
                    notes: selected.description || null,
                    show_on_website: selected.showOnWebsite,
                  });
                  lensUpdateMutation.mutate(
                    { id: lens.id, form },
                    {
                      onSuccess: () => {
                        toast({ title: "Lens updated" });
                        setEditorOpen(false);
                      },
                      onError: (error: any) => toast({ title: "Error", description: error?.message || "Unable to save", variant: "destructive" }),
                    },
                  );
                  return;
                }

                if (selected.type === "supply") {
                  const supply = supplies.find((item) => item.id === selected.id);
                  if (!supply) return;
                  const form = toSupplyFormData(supply, {
                    name: selected.name,
                    category: selected.category,
                    description: selected.description,
                    show_on_website: selected.showOnWebsite,
                  });
                  supplyUpdateMutation.mutate(
                    { id: supply.id, form },
                    {
                      onSuccess: () => {
                        toast({ title: "Supply updated" });
                        setEditorOpen(false);
                      },
                      onError: (error: any) => toast({ title: "Error", description: error?.message || "Unable to save", variant: "destructive" }),
                    },
                  );
                  return;
                }

                const addon = addons.find((item) => item.id === selected.id);
                if (!addon) return;
                const form = toAddonFormData(addon, {
                  name: selected.name,
                  category: selected.category,
                  description: selected.description,
                  show_on_website: selected.showOnWebsite,
                });
                addonUpdateMutation.mutate(
                  { id: addon.id, form },
                  {
                    onSuccess: () => {
                      toast({ title: "Service updated" });
                      setEditorOpen(false);
                    },
                    onError: (error: any) => toast({ title: "Error", description: error?.message || "Unable to save", variant: "destructive" }),
                  },
                );
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Products to Website</DialogTitle>
            <DialogDescription>
              Select active catalog products and services to expose in the website store.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-auto rounded border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-right px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pickerRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={4}>No active products available to add.</td>
                  </tr>
                ) : pickerRows.map((row) => (
                  <tr key={`pick-${row.type}:${row.id}`} className="border-t">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.type === "addon" ? "service" : row.type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" className="h-7 text-[11px]" onClick={() => updateWebsiteFlag(row, true)}>Add</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebsiteStorePage;
