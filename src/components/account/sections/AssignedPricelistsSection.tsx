import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, Download, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useRxPricingStructure } from "@/hooks/useRxPricingStructure";
import { MATERIAL_COLUMNS } from "@/hooks/useMatrixAllocations";
import { useUserPriceOverrides } from "@/hooks/useUserPriceOverrides";
import { useUserCurrencyPreference } from "@/hooks/useUserCurrencyPreference";
import { useCartContext } from "@/contexts/CartContext";
import { getStableStoreProductCartId } from "@/hooks/useStoreProducts";
import { compareMaterialOrder } from "@/lib/sortOrder";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import PriceOverrideCell from "@/components/account/PriceOverrideCell";

interface MatrixRow {
  category: string;
  material_index: string;
  treatment_type: string;
  allocated_price_bbd: number;
}

interface CatalogRow {
  section: string | null;
  display_description: string;
  row_type: string;
  bbd_price: number;
  sort_order: number;
  row_key: string;
  catalog_type: string;
  item_id: string | null;
}

interface AssignedPricelistDetails {
  name: string | null;
  updated_at: string | null;
}

interface PortalCurrencyOption {
  currencyCode: string;
  bbdPerUnit: number;
  isDefault: boolean;
}

const buildCatalogRowKey = (row: Pick<CatalogRow, "catalog_type" | "row_key">) => `catalog:${row.catalog_type}:${row.row_key}`;
const buildMatrixRowKey = (groupingKey: string, categoryKey: string, columnKey: string) =>
  `matrix:${groupingKey}:${categoryKey}:${columnKey}`;

const money = (value: number) => `$${value.toFixed(2)}`;

const escapeCsvCell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
const toCsv = (rows: string[][]) => rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");

const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Used only if the currency-settings RPC hasn't returned anything yet (or a
// user's saved preference names a currency the admin has since removed) —
// falls back to treating the stored value as already-displayable BBD.
const FALLBACK_CURRENCY = "BBD";

const groupBySection = (rows: CatalogRow[]) => {
  const map = new Map<string, CatalogRow[]>();
  [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((row) => {
      const section = row.section?.trim() || "Other";
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(row);
    });
  return map;
};

const isLabSupplyRow = (row: CatalogRow) => {
  const section = row.section?.trim().toLowerCase() ?? "";
  return section === "lab" || section === "lab supplies";
};

const AssignedPricelistsSection = () => {
  const { identity } = usePortalIdentity();
  const assignedPricelistId = identity?.assignedPricelistId ?? null;
  const hasPricelist = typeof assignedPricelistId === "number";
  const [pricesHidden, setPricesHidden] = useState(true);
  const { overrides, setOverride, clearOverride } = useUserPriceOverrides();
  const { preferredCurrency, setPreference: setCurrencyPreference } = useUserCurrencyPreference();
  const { addToCart } = useCartContext();
  const navigate = useNavigate();

  const { data: currencyOptions = [] } = useQuery<PortalCurrencyOption[]>({
    queryKey: ["portal-pricing-currency-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_pricing_currency_settings");
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((row) => ({
          currencyCode: String(row.currency_code),
          bbdPerUnit: Number(row.bbd_per_unit),
          isDefault: !!row.is_default,
        }))
        .filter((option) => Number.isFinite(option.bbdPerUnit) && option.bbdPerUnit > 0);
    },
    staleTime: 5 * 60_000,
  });

  const currencyByCode = useMemo(() => new Map(currencyOptions.map((option) => [option.currencyCode, option])), [currencyOptions]);
  const defaultCurrency = currencyOptions.find((option) => option.isDefault)?.currencyCode ?? currencyOptions[0]?.currencyCode ?? FALLBACK_CURRENCY;
  const currency = preferredCurrency && currencyByCode.has(preferredCurrency) ? preferredCurrency : defaultCurrency;
  const displayMoney = (bbd: number) => {
    const amount = Number(bbd);
    const rate = currencyByCode.get(currency)?.bbdPerUnit;
    return money(rate ? amount / rate : amount);
  };

  // Stock lenses & supplies -> straight into the store cart, priced at the
  // customer's own wholesale rate (not the currently-toggled display
  // currency — cart_items has no currency column, so it must stay in the
  // same BBD terms as every other cart entry).
  const addCatalogRowToCart = (row: CatalogRow) => {
    if (!row.item_id) return;
    const productType = row.row_type as "lens" | "supply" | "addon";
    addToCart({
      id: getStableStoreProductCartId({ id: row.item_id, product_type: productType }),
      name: row.display_description,
      price: row.bbd_price,
      productType,
      priceUnit: productType === "lens" ? "pair" : undefined,
    });
  };

  // RX lens designs & add-ons -> no structured Rx-cart exists today, so this
  // hands off to the existing free-text Quote Requests form instead of
  // inventing new schema for a hover button.
  const addToRxQuoteRequest = (description: string, bbdPrice: number) => {
    navigate("/profile/quotes", {
      state: { prefillNote: `${description} — wholesale BBD $${bbdPrice.toFixed(2)}. Please quote pricing and lead time.` },
    });
  };

  const { structure, isLoading: structureLoading } = useRxPricingStructure(assignedPricelistId);

  const { data: canAccessLabPricing = false } = useQuery<boolean>({
    queryKey: ["portal-can-access-lab-pricing", identity?.crmCustomerId ?? null],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("can_access_customer_lab_pricing", {
        p_customer_id: identity?.crmCustomerId ?? null,
      });
      if (error) throw error;
      return data === true;
    },
    // This authorization can change while the portal is already open when an
    // administrator updates the CRM contact's tags. Recheck on return instead
    // of preserving a denied decision for five minutes.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const { data: rows = [], isLoading: rowsLoading, isError } = useQuery<MatrixRow[]>({
    queryKey: ["portal-assigned-pricelist-matrix", assignedPricelistId, identity?.crmCustomerId ?? null],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_matrix", {
        p_customer_id: identity?.crmCustomerId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as MatrixRow[];
    },
  });

  const { data: addonRows = [], isLoading: addonsLoading } = useQuery<CatalogRow[]>({
    queryKey: ["portal-assigned-pricelist-addons", assignedPricelistId, identity?.crmCustomerId ?? null],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_addons", {
        p_customer_id: identity?.crmCustomerId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const { data: stockRows = [], isLoading: stockLoading, isError: stockError } = useQuery<CatalogRow[]>({
    queryKey: ["portal-assigned-pricelist-catalog", "stock", assignedPricelistId, identity?.crmCustomerId ?? null],
    enabled: hasPricelist && canAccessLabPricing,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_catalog", {
        p_catalog_type: "stock",
        p_customer_id: identity?.crmCustomerId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const { data: supplyRows = [], isLoading: suppliesLoading, isError: suppliesError } = useQuery<CatalogRow[]>({
    queryKey: ["portal-assigned-pricelist-catalog", "buysell", assignedPricelistId, identity?.crmCustomerId ?? null],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_catalog", {
        p_catalog_type: "buysell",
        p_customer_id: identity?.crmCustomerId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const { data: pricelistDetails } = useQuery<AssignedPricelistDetails | null>({
    queryKey: ["portal-assigned-pricelist-details", assignedPricelistId, identity?.crmCustomerId ?? null],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_details", {
        p_customer_id: identity?.crmCustomerId ?? null,
      });
      if (!error) {
        const detail = Array.isArray(data) ? data[0] : data;
        return detail ? {
          name: typeof detail.name === "string" ? detail.name : null,
          updated_at: typeof detail.updated_at === "string" ? detail.updated_at : null,
        } : null;
      }

      const { data: version } = await (supabase.from("pricelist_versions") as any)
        .select("name,updated_at")
        .eq("id", assignedPricelistId)
        .maybeSingle();
      if (version) {
        return {
          name: typeof version.name === "string" ? version.name : null,
          updated_at: typeof version.updated_at === "string" ? version.updated_at : null,
        };
      }

      const { data: updatedAt } = await (supabase.rpc as any)("portal_assigned_pricelist_updated_at", {
        p_customer_id: identity?.crmCustomerId ?? null,
      });
      return { name: null, updated_at: (updatedAt as string | null) ?? null };
    },
  });

  const priceByKey = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => map.set(`${row.treatment_type}::${row.category}::${row.material_index}`, row.allocated_price_bbd));
    return map;
  }, [rows]);

  const groupings = useMemo(() => {
    return structure
      .map((grouping) => {
        const visibleCols = MATERIAL_COLUMNS.filter((column) =>
          grouping.categories.some((category) => priceByKey.has(`${grouping.key}::${category.key}::${column.key}`))
        ).slice().sort((a, b) => compareMaterialOrder(a.key, b.key));

        const activeCategories = grouping.categories.filter((category) =>
          visibleCols.some((column) => priceByKey.has(`${grouping.key}::${category.key}::${column.key}`))
        );

        return { grouping, visibleCols, activeCategories };
      })
      .filter((entry) => entry.activeCategories.length > 0);
  }, [structure, priceByKey]);

  const addonsBySection = useMemo(() => groupBySection(addonRows), [addonRows]);
  const stockBySection = useMemo(() => groupBySection(stockRows), [stockRows]);
  // The RPC is authoritative. Keep the same presentation rule here as a
  // defense in depth while a response is cached or a deployment is rolling
  // out, so a Lab section never flashes into view for an untagged user.
  const visibleSupplyRows = useMemo(
    () => canAccessLabPricing ? supplyRows : supplyRows.filter((row) => !isLabSupplyRow(row)),
    [canAccessLabPricing, supplyRows],
  );
  const suppliesBySection = useMemo(() => groupBySection(visibleSupplyRows), [visibleSupplyRows]);

  const rxLoading = structureLoading || rowsLoading || addonsLoading;
  const assignedPricelistName = pricelistDetails?.name?.trim() || null;
  const updatedAt = pricelistDetails?.updated_at ?? null;
  const hasAnyPrices = rows.length > 0 || addonRows.length > 0 || stockRows.length > 0 || visibleSupplyRows.length > 0;

  const { user } = useAuth();
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvPassword, setCsvPassword] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvVerifying, setCsvVerifying] = useState(false);

  // Flat, long-format export (Section/Group/Item/Material/Price) rather than
  // mirroring the on-screen grid exactly — lens groupings each have a
  // different set of active material columns, so a single wide table would
  // need a union of every column across every grouping, padded with blanks.
  const buildPricelistCsv = () => {
    const csvRows: string[][] = [["Section", "Group", "Item", "Material/Index", `Price (${currency})`]];

    groupings.forEach(({ grouping, visibleCols, activeCategories }) => {
      activeCategories.forEach((category) => {
        visibleCols.forEach((column) => {
          const price = priceByKey.get(`${grouping.key}::${category.key}::${column.key}`);
          if (price != null) {
            csvRows.push(["RX Lens Prices", grouping.name, category.name, column.key, displayMoney(price).replace(/^\$/, "")]);
          }
        });
      });
    });

    const addCatalogSection = (label: string, sections: Map<string, CatalogRow[]>) => {
      sections.forEach((sectionRows, sectionName) => {
        sectionRows.forEach((row) => {
          csvRows.push([label, sectionName, row.display_description, "", displayMoney(row.bbd_price).replace(/^\$/, "")]);
        });
      });
    };
    addCatalogSection("Add-ons, Extras & Coatings", addonsBySection);
    if (canAccessLabPricing) addCatalogSection("Stock Lenses", stockBySection);
    addCatalogSection("Supplies", suppliesBySection);

    return toCsv(csvRows);
  };

  const handleConfirmCsvExport = async () => {
    if (!user?.email) return;
    setCsvVerifying(true);
    setCsvError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: csvPassword });
    setCsvVerifying(false);
    if (error) {
      setCsvError("That password wasn't correct. Please try again.");
      return;
    }
    downloadCsv(buildPricelistCsv(), `pricelist-${assignedPricelistName ?? "export"}.csv`.replace(/\s+/g, "-"));
    setCsvDialogOpen(false);
    setCsvPassword("");
  };

  const accordionTriggerClass =
    "rounded-md bg-muted-foreground px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all hover:no-underline hover:brightness-110 data-[state=open]:rounded-b-none [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-white";

  const countBadge = (count: number, noun: string) => (
    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-white">
      {count} {noun}{count === 1 ? "" : "s"}
    </span>
  );

  const renderAccordionSections = (sections: Map<string, CatalogRow[]>) => {
    const sectionKeys = [...sections.keys()];
    return (
      <Accordion type="multiple" defaultValue={sectionKeys.slice(0, 1)} className="w-full space-y-2">
        {sectionKeys.map((section) => {
          const sectionRows = sections.get(section) ?? [];
          return (
            <AccordionItem key={section} value={section} className="border-b-0">
              <AccordionTrigger className={accordionTriggerClass}>
                <span className="flex items-center gap-2">
                  {section}
                  {countBadge(sectionRows.length, "item")}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="overflow-x-auto rounded-b-md border border-t-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                        <th className="w-32 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">{currency} Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((row, index) => {
                        const rowKey = buildCatalogRowKey(row);
                        const rowAction =
                          row.row_type === "lens" || row.row_type === "supply"
                            ? { type: "cart" as const, onClick: () => addCatalogRowToCart(row) }
                            : { type: "rx" as const, onClick: () => addToRxQuoteRequest(row.display_description, row.bbd_price) };
                        const isCartRow = rowAction.type === "cart";
                        return (
                          <tr
                            key={`${section}-${index}`}
                            className={cn(
                              "group border-b last:border-b-0",
                              isCartRow && "cursor-pointer hover:bg-muted/50",
                            )}
                            onClick={isCartRow ? rowAction.onClick : undefined}
                          >
                            <td className="px-4 py-2 font-medium text-foreground">{row.display_description}</td>
                            <td className="px-3 py-2 text-right font-semibold text-foreground">
                              <PriceOverrideCell
                                wholesaleDisplay={displayMoney(row.bbd_price)}
                                pricesHidden={pricesHidden}
                                override={overrides.get(rowKey)}
                                onSave={(price) => setOverride.mutate({ rowKey, price, currencyCode: currency })}
                                onClear={() => clearOverride.mutate(rowKey)}
                                isSaving={setOverride.isPending}
                                action={rowAction}
                                useRowHoverGroup
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  const renderCatalogTab = (
    title: string,
    description: string,
    sections: Map<string, CatalogRow[]>,
    loading: boolean,
    errored: boolean,
    emptyMessage: string,
  ) => (
    <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BadgeDollarSign className="h-5 w-5" />
          <span>{title}{assignedPricelistName ? ` - ${assignedPricelistName}` : ""}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPricelist ? (
          <p className="text-sm text-muted-foreground">No pricelist has been assigned yet.</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : errored ? (
          <p className="text-sm text-destructive">Your pricelist couldn't be loaded. Please try again shortly.</p>
        ) : sections.size === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          renderAccordionSections(sections)
        )}
      </CardContent>
    </Card>
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Pricelists</h2>
          <p className="text-sm text-muted-foreground">
            Your assigned wholesale pricing{updatedAt ? ` · updated ${new Date(updatedAt).toLocaleDateString()}` : ""}.
          </p>
        </div>
      </header>

      <Tabs defaultValue="rx" className="w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="rx">RX Lens Prices + Add-ons</TabsTrigger>
            {canAccessLabPricing && <TabsTrigger value="stock">Stock Lenses</TabsTrigger>}
            <TabsTrigger value="supplies">Supplies</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-4">
            <Select value={currency} onValueChange={(code) => setCurrencyPreference.mutate(code)}>
              <SelectTrigger className="h-8 w-24 text-xs font-medium" aria-label="Display currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((option) => (
                  <SelectItem key={option.currencyCode} value={option.currencyCode}>
                    {option.currencyCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasAnyPrices && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setCsvDialogOpen(true)}>
                <Download className="h-4 w-4" />
                Save to CSV
              </Button>
            )}
            {hasAnyPrices && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setPricesHidden((current) => !current)}
              >
                {pricesHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {pricesHidden ? "Show prices" : "Hide prices"}
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="rx">
          <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BadgeDollarSign className="h-5 w-5" />
                <span>RX Lens Prices + Add-ons{assignedPricelistName ? ` - ${assignedPricelistName}` : ""}</span>
              </CardTitle>
              <CardDescription>Wholesale pricing, per pair, assigned to your approved customer account.</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasPricelist ? (
                <p className="text-sm text-muted-foreground">No pricelist has been assigned yet.</p>
              ) : rxLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isError ? (
                <p className="text-sm text-destructive">Your pricelist couldn't be loaded. Please try again shortly.</p>
              ) : groupings.length === 0 && addonsBySection.size === 0 ? (
                <p className="text-sm text-muted-foreground">Your assigned pricelist doesn't have any prices published yet.</p>
              ) : (
                <div className="space-y-6">
                {groupings.length > 0 && (
                <Accordion type="multiple" defaultValue={[groupings[0].grouping.key]} className="w-full space-y-2">
                  {groupings.map(({ grouping, visibleCols, activeCategories }) => (
                    <AccordionItem key={grouping.id} value={grouping.key} className="border-b-0">
                      <AccordionTrigger className={accordionTriggerClass}>
                        <span className="flex items-center gap-2">
                          {grouping.name}
                          {countBadge(activeCategories.length, "design")}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="overflow-x-auto rounded-b-md border border-t-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lens Design</th>
                                {visibleCols.map((column) => (
                                  <th key={column.key} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {column.key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {activeCategories.map((category) => (
                                <tr key={category.id} className="border-b last:border-b-0">
                                  <td className="px-4 py-2 font-medium text-foreground">{category.name}</td>
                                  {visibleCols.map((column) => {
                                    const price = priceByKey.get(`${grouping.key}::${category.key}::${column.key}`);
                                    const rowKey = buildMatrixRowKey(grouping.key, category.key, column.key);
                                    return (
                                      <td key={column.key} className="px-3 py-2 text-center font-semibold text-foreground">
                                        {price != null ? (
                                          <PriceOverrideCell
                                            wholesaleDisplay={displayMoney(price)}
                                            pricesHidden={pricesHidden}
                                            override={overrides.get(rowKey)}
                                            onSave={(p) => setOverride.mutate({ rowKey, price: p, currencyCode: currency })}
                                            onClear={() => clearOverride.mutate(rowKey)}
                                            isSaving={setOverride.isPending}
                                            centered
                                            action={{
                                              type: "rx",
                                              onClick: () => addToRxQuoteRequest(`${grouping.name} — ${category.name}, index ${column.key}`, price),
                                            }}
                                          />
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                )}

                {addonsBySection.size > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold uppercase tracking-wide text-foreground">
                      Add-ons, Extras &amp; Coatings
                    </h3>
                    {renderAccordionSections(addonsBySection)}
                  </div>
                )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canAccessLabPricing && (
          <TabsContent value="stock">
            {renderCatalogTab(
              "Stock Lenses",
              "Semi-finished stock lens wholesale pricing, grouped by MF type.",
              stockBySection,
              stockLoading,
              stockError,
              "Your assigned pricelist doesn't have any stock lens prices published yet.",
            )}
          </TabsContent>
        )}

        <TabsContent value="supplies">
          {renderCatalogTab(
            "Supplies",
            "Supplies catalog wholesale pricing, grouped by supply type.",
            suppliesBySection,
            suppliesLoading,
            suppliesError,
            "Your assigned pricelist doesn't have any supply prices published yet.",
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={csvDialogOpen}
        onOpenChange={(open) => {
          setCsvDialogOpen(open);
          if (!open) {
            setCsvPassword("");
            setCsvError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your password to export</DialogTitle>
            <DialogDescription>
              This downloads your full assigned pricelist as a CSV file. Re-enter your password to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="csv-export-password">Password</Label>
            <Input
              id="csv-export-password"
              type="password"
              value={csvPassword}
              onChange={(event) => setCsvPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && csvPassword && !csvVerifying) void handleConfirmCsvExport();
              }}
              disabled={csvVerifying}
              autoFocus
            />
            {csvError && <p className="text-sm text-destructive">{csvError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialogOpen(false)} disabled={csvVerifying}>
              Cancel
            </Button>
            <Button onClick={() => void handleConfirmCsvExport()} disabled={!csvPassword || csvVerifying}>
              {csvVerifying ? "Verifying…" : "Confirm & download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AssignedPricelistsSection;
