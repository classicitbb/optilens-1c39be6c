import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

const money = (value: number) => `$${value.toFixed(2)}`;

const AssignedPricelistsSection = () => {
  const { identity } = usePortalIdentity();
  const assignedPricelistId = identity?.assignedPricelistId ?? null;
  const [pricesHidden, setPricesHidden] = useState(true);

  const { structure, isLoading: structureLoading } = useRxPricingStructure(assignedPricelistId);

  const { data: rows = [], isLoading: rowsLoading, isError } = useQuery<MatrixRow[]>({
    queryKey: ["portal-assigned-pricelist-matrix", assignedPricelistId],
    enabled: typeof assignedPricelistId === "number",
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_matrix");
      if (error) throw error;
      return (data ?? []) as MatrixRow[];
    },
  });

  const { data: updatedAt } = useQuery<string | null>({
    queryKey: ["portal-assigned-pricelist-updated-at", assignedPricelistId],
    enabled: typeof assignedPricelistId === "number",
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_assigned_pricelist_updated_at");
      if (error) throw error;
      return (data as string | null) ?? null;
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

  const isLoading = structureLoading || rowsLoading;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">RX Lens Prices</h2>
          <p className="text-sm text-muted-foreground">
            Your assigned wholesale pricing{updatedAt ? ` · updated ${new Date(updatedAt).toLocaleDateString()}` : ""}.
          </p>
        </div>
        {rows.length > 0 && (
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

      <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BadgeDollarSign className="h-5 w-5" />
            Assigned Pricelist
          </CardTitle>
          <CardDescription>Wholesale pricing, per pair, assigned to your approved customer account.</CardDescription>
        </CardHeader>
        <CardContent>
          {!assignedPricelistId ? (
            <p className="text-sm text-muted-foreground">No pricelist has been assigned yet.</p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">Your pricelist couldn't be loaded. Please try again shortly.</p>
          ) : groupings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your assigned pricelist doesn't have any prices published yet.</p>
          ) : (
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
        </CardContent>
      </Card>
    </section>
  );
};

export default AssignedPricelistsSection;
