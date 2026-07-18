import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useRxPricingStructure } from "@/hooks/useRxPricingStructure";
import { MATERIAL_COLUMNS } from "@/hooks/useMatrixAllocations";
import { compareMaterialOrder } from "@/lib/sortOrder";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
}

interface AssignedPricelistDetails {
  name: string | null;
  updated_at: string | null;
}

interface PortalPricingCurrencySettings {
  baseCurrency: "BBD" | "USD";
  bbdToUsdRate: number;
}

const money = (value: number) => `$${value.toFixed(2)}`;
// Retain the established portal conversion while older databases await the
// currency-settings RPC migration. Once available, the active admin setting
// always supplies the rate instead.
const FALLBACK_BBD_TO_USD_RATE = 0.5;

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

const AssignedPricelistsSection = () => {
  const { identity } = usePortalIdentity();
  const assignedPricelistId = identity?.assignedPricelistId ?? null;
  const hasPricelist = typeof assignedPricelistId === "number";
  const [pricesHidden, setPricesHidden] = useState(true);
  const [showAlternateCurrency, setShowAlternateCurrency] = useState(false);

  const { data: pricingCurrency } = useQuery<PortalPricingCurrencySettings | null>({
    queryKey: ["portal-pricing-currency-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_pricing_currency_settings");
      if (error) throw error;

      const settings = Array.isArray(data) ? data[0] : data;
      if (!settings) return null;

      const rate = Number(settings.bbd_to_usd_rate);
      return {
        baseCurrency: settings.base_currency === "USD" ? "USD" : "BBD",
        bbdToUsdRate: Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_BBD_TO_USD_RATE,
      };
    },
    staleTime: 5 * 60_000,
  });

  const baseCurrency = pricingCurrency?.baseCurrency ?? "BBD";
  const alternateCurrency = baseCurrency === "BBD" ? "USD" : "BBD";
  const currency = showAlternateCurrency ? alternateCurrency : baseCurrency;
  const displayMoney = (bbd: number) => {
    const amount = Number(bbd);
    return money(currency === "USD" ? amount * (pricingCurrency?.bbdToUsdRate ?? FALLBACK_BBD_TO_USD_RATE) : amount);
  };

  const { structure, isLoading: structureLoading } = useRxPricingStructure(assignedPricelistId);

  const { data: rows = [], isLoading: rowsLoading, isError } = useQuery<MatrixRow[]>({
    queryKey: ["portal-assigned-pricelist-matrix", assignedPricelistId],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_matrix");
      if (error) throw error;
      return (data ?? []) as MatrixRow[];
    },
  });

  const { data: addonRows = [], isLoading: addonsLoading } = useQuery<CatalogRow[]>({
    queryKey: ["portal-assigned-pricelist-addons", assignedPricelistId],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_addons");
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const { data: stockRows = [], isLoading: stockLoading, isError: stockError } = useQuery<CatalogRow[]>({
    queryKey: ["portal-assigned-pricelist-catalog", "stock", assignedPricelistId],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_catalog", { p_catalog_type: "stock" });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const { data: supplyRows = [], isLoading: suppliesLoading, isError: suppliesError } = useQuery<CatalogRow[]>({
    queryKey: ["portal-assigned-pricelist-catalog", "buysell", assignedPricelistId],
    enabled: hasPricelist,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_catalog", { p_catalog_type: "buysell" });
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

      const { data: updatedAt } = await (supabase.rpc as any)("portal_assigned_pricelist_updated_at");
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
  const suppliesBySection = useMemo(() => groupBySection(supplyRows), [supplyRows]);

  const rxLoading = structureLoading || rowsLoading || addonsLoading;
  const assignedPricelistName = pricelistDetails?.name?.trim() || null;
  const updatedAt = pricelistDetails?.updated_at ?? null;
  const hasAnyPrices = rows.length > 0 || addonRows.length > 0 || stockRows.length > 0 || supplyRows.length > 0;

  const accordionTriggerClass =
    "rounded-md px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all hover:no-underline hover:brightness-110 data-[state=open]:rounded-b-none [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-white";

  const countBadge = (count: number, noun: string) => (
    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal">
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
              <AccordionTrigger className={accordionTriggerClass} style={{ background: "#1e4db7" }}>
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
                      {sectionRows.map((row, index) => (
                        <tr key={`${section}-${index}`} className="border-b last:border-b-0">
                          <td className="px-4 py-2 font-medium text-foreground">{row.display_description}</td>
                          <td className="px-3 py-2 text-right font-semibold text-foreground">
                            <span className={cn(pricesHidden && "select-none blur-sm")}>{displayMoney(row.bbd_price)}</span>
                          </td>
                        </tr>
                      ))}
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
            <TabsTrigger value="stock">Stock Lenses</TabsTrigger>
            <TabsTrigger value="supplies">Supplies</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-xs font-medium", showAlternateCurrency ? "text-muted-foreground" : "text-primary")}>{baseCurrency}</span>
              <Switch
                checked={showAlternateCurrency}
                onCheckedChange={setShowAlternateCurrency}
                aria-label={`Show prices in ${alternateCurrency}`}
              />
              <span className={cn("text-xs font-medium", showAlternateCurrency ? "text-primary" : "text-muted-foreground")}>{alternateCurrency}</span>
            </div>
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
                      <AccordionTrigger className={accordionTriggerClass} style={{ background: "#1e4db7" }}>
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
                                    return (
                                      <td key={column.key} className="px-3 py-2 text-right font-semibold text-foreground">
                                        {price != null ? (
                                          <span className={cn(pricesHidden && "select-none blur-sm")}>{displayMoney(price)}</span>
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
    </section>
  );
};

export default AssignedPricelistsSection;
