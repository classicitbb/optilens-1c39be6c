import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const money = (value: number) => `$${value.toFixed(2)}`;

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

  const renderSectionTables = (sections: Map<string, CatalogRow[]>) => (
    <div className="space-y-4">
      {[...sections.entries()].map(([section, sectionRows]) => (
        <div key={section} className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#1e4db7" }}>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-white">{section}</th>
                <th className="w-32 px-3 py-2 text-right font-bold uppercase tracking-wide text-white">Price</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.map((row, index) => (
                <tr key={`${section}-${index}`} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium text-foreground">{row.display_description}</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">
                    <span className={cn(pricesHidden && "select-none blur-sm")}>{money(Number(row.bbd_price))}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

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
          renderSectionTables(sections)
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
      </header>

      <Tabs defaultValue="rx" className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="rx">RX Lens Prices + Add-ons</TabsTrigger>
          <TabsTrigger value="stock">Stock Lenses</TabsTrigger>
          <TabsTrigger value="supplies">Supplies</TabsTrigger>
        </TabsList>

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
                <Accordion type="multiple" defaultValue={[groupings[0].grouping.key]} className="w-full">
                  {groupings.map(({ grouping, visibleCols, activeCategories }) => (
                    <AccordionItem key={grouping.id} value={grouping.key}>
                      <AccordionTrigger className="text-base font-semibold uppercase tracking-wide">
                        {grouping.name}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr style={{ background: "#1e4db7" }}>
                                <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-white">Lens Design</th>
                                {visibleCols.map((column) => (
                                  <th key={column.key} className="px-3 py-2 text-center font-bold uppercase tracking-wide text-white">
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
                                          <span className={cn(pricesHidden && "select-none blur-sm")}>{money(price)}</span>
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
                    {renderSectionTables(addonsBySection)}
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
