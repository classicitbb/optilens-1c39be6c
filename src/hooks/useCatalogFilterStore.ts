import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LensFilter = "all" | "active" | "inactive" | "web" | "zero_cost" | "zero_sell" | "in_pricelist" | "liked" | "disliked" | "compare_tight" | "compare_loose" | "unique";
export type LensSortKey = "name" | "supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype" | "base_price" | "sell_price" | "sell_usd";
export type AddonSupplyFilter = "all" | "active" | "inactive" | "web";
export type AddonSortKey = "name" | "sku" | "category" | "price" | "cost" | "sort_order";
export type SupplySortKey = "name" | "sku" | "category" | "sell_price" | "base_price";
export type SortDir = "asc" | "desc";

export type LensColFilters = Record<"supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype", string[]>;
export type AddonColFilters = { supplier: string[]; category: string[] };
export type SupplyColFilters = { supplier: string[]; category: string[] };

interface LensState {
  filter: LensFilter;
  sortKey: LensSortKey;
  sortDir: SortDir;
  colFilters: LensColFilters;
  search: string;
}

interface AddonState {
  filter: AddonSupplyFilter;
  sortKey: AddonSortKey;
  sortDir: SortDir;
  colFilters: AddonColFilters;
  search: string;
}

interface SupplyState {
  filter: AddonSupplyFilter;
  sortKey: SupplySortKey;
  sortDir: SortDir;
  colFilters: SupplyColFilters;
  search: string;
}

export interface CatalogFilterStore {
  activeTab: "lenses" | "addons" | "supplies";
  setActiveTab: (t: "lenses" | "addons" | "supplies") => void;
  lens: LensState;
  setLens: (s: Partial<LensState>) => void;
  addon: AddonState;
  setAddon: (s: Partial<AddonState>) => void;
  supply: SupplyState;
  setSupply: (s: Partial<SupplyState>) => void;
  clearAll: () => void;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const KEY = "catalog_filter_store_v1";

const EMPTY_LENS_COL: LensColFilters = {
  supplier: [], brand: [], material: [], mftype: [], lenstype: [], option: [], finishtype: [],
};

const defaultLens = (): LensState => ({
  filter: "active", sortKey: "name", sortDir: "asc", colFilters: EMPTY_LENS_COL, search: "",
});

const defaultAddon = (): AddonState => ({
  filter: "active", sortKey: "name", sortDir: "asc", colFilters: { supplier: [], category: [] }, search: "",
});

const defaultSupply = (): SupplyState => ({
  filter: "active", sortKey: "name", sortDir: "asc", colFilters: { supplier: [], category: [] }, search: "",
});

interface Persisted {
  activeTab?: "lenses" | "addons" | "supplies";
  lens?: Partial<LensState>;
  addon?: Partial<AddonState>;
  supply?: Partial<SupplyState>;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch { /* ignore */ }
  return {};
}

function save(data: Persisted) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCatalogFilterStore(): CatalogFilterStore {
  const persisted = load();

  const [activeTab, setActiveTabState] = useState<"lenses" | "addons" | "supplies">(
    persisted.activeTab ?? "lenses"
  );

  const [lens, setLensState] = useState<LensState>({
    ...defaultLens(),
    ...persisted.lens,
    colFilters: { ...EMPTY_LENS_COL, ...(persisted.lens?.colFilters ?? {}) },
  });

  const [addon, setAddonState] = useState<AddonState>({
    ...defaultAddon(),
    ...persisted.addon,
    colFilters: { supplier: [], category: [], ...(persisted.addon?.colFilters ?? {}) },
  });

  const [supply, setSupplyState] = useState<SupplyState>({
    ...defaultSupply(),
    ...persisted.supply,
    colFilters: { supplier: [], category: [], ...(persisted.supply?.colFilters ?? {}) },
  });

  const persist = useCallback((patch: Persisted) => {
    save({ activeTab, lens, addon, supply, ...patch });
  }, [activeTab, lens, addon, supply]);

  const setActiveTab = useCallback((t: "lenses" | "addons" | "supplies") => {
    setActiveTabState(t);
    persist({ activeTab: t });
  }, [persist]);

  const setLens = useCallback((patch: Partial<LensState>) => {
    setLensState((prev) => {
      const next = { ...prev, ...patch };
      save({ activeTab, lens: next, addon, supply });
      return next;
    });
  }, [activeTab, addon, supply]);

  const setAddon = useCallback((patch: Partial<AddonState>) => {
    setAddonState((prev) => {
      const next = { ...prev, ...patch };
      save({ activeTab, lens, addon: next, supply });
      return next;
    });
  }, [activeTab, lens, supply]);

  const setSupply = useCallback((patch: Partial<SupplyState>) => {
    setSupplyState((prev) => {
      const next = { ...prev, ...patch };
      save({ activeTab, lens, addon, supply: next });
      return next;
    });
  }, [activeTab, lens, addon]);

  const clearAll = useCallback(() => {
    const fresh = { activeTab, lens: defaultLens(), addon: defaultAddon(), supply: defaultSupply() };
    setLensState(fresh.lens);
    setAddonState(fresh.addon);
    setSupplyState(fresh.supply);
    save(fresh);
  }, [activeTab]);

  return { activeTab, setActiveTab, lens, setLens, addon, setAddon, supply, setSupply, clearAll };
}
