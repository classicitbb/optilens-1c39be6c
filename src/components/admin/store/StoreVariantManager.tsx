import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProductVariantConfig, useProductVariants, productVariantsQueryKey } from "@/features/store/variants/useProductVariants";
import type { ProductType, VariantMode } from "@/features/store/variants/types";

interface StoreVariantManagerProps {
  productType: ProductType;
  productId: string;
}

const VARIANT_MODES: VariantMode[] = ["none", "lens_grid", "standard_options", "service_config", "generic_matrix"];

export const StoreVariantManager = ({ productType, productId }: StoreVariantManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvText, setCsvText] = useState("");
  const { data: config, upsertConfig } = useProductVariantConfig(productType, productId);
  const { data: variants = [] } = useProductVariants(productType, productId);

  const mode = config?.variant_mode ?? "none";

  const bulkMutation = useMutation({
    mutationFn: async (patch: { price?: number; stock_qty?: number | null; is_active?: boolean }) => {
      const ids = variants.map((v) => v.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from("product_variants" as any).update(patch).in("id", ids);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productVariantsQueryKey(productType, productId) });
    },
  });

  const exportCsv = () => {
    const headers = ["product_type", "product_id", "sphere", "cylinder", "sku", "opc_code", "price", "stock_qty", "active"];
    const rows = variants.map((variant) => [
      variant.product_type,
      variant.product_id,
      variant.attribute_values.sphere ?? "",
      variant.attribute_values.cylinder ?? "",
      variant.sku ?? "",
      variant.opc_code ?? "",
      variant.price,
      variant.stock_qty ?? "",
      variant.is_active,
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `variants-${productType}-${productId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = async () => {
    const rows = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (rows.length < 2) return;
    const headers = rows[0].split(",").map((h) => h.trim());
    const payload = rows.slice(1).map((line) => {
      const values = line.split(",");
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
      const sphere = row.sphere || "";
      const cylinder = row.cylinder || "";
      const variant_key = `cylinder:${cylinder}|sphere:${sphere}`;
      return {
        product_type: productType,
        product_id: productId,
        variant_mode: mode,
        variant_key,
        title: row.title || `SPH ${sphere} / CYL ${cylinder}`,
        display_label: row.display_label || null,
        sku: row.sku || null,
        opc_code: row.opc_code || null,
        price: Number(row.price || 0),
        stock_qty: row.stock_qty === "" ? null : Number(row.stock_qty),
        is_active: row.active !== "false",
        attribute_values: { sphere, cylinder },
      };
    });

    const { error } = await supabase.from("product_variants" as any).upsert(payload, { onConflict: "product_type,product_id,variant_key" });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: productVariantsQueryKey(productType, productId) });
    toast({ title: `Imported ${payload.length} variants` });
    setCsvText("");
  };

  const lowStockCount = useMemo(() => variants.filter((v) => (v.stock_qty ?? 0) <= v.low_stock_threshold).length, [variants]);

  return (
    <div className="space-y-4 rounded border p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Variant mode</Label>
          <Select
            value={mode}
            onValueChange={(value) => upsertConfig.mutate({ variant_mode: value as VariantMode, attributes: config?.attributes ?? [], settings: config?.settings ?? {} })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{VARIANT_MODES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {variants.length} variants · {lowStockCount} low stock
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ is_active: true })}>Activate all</Button>
        <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ is_active: false })}>Deactivate all</Button>
        <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ stock_qty: 0 })}>Zero stock</Button>
        <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      {mode === "lens_grid" && (
        <div className="space-y-2">
          <Label>Lens CSV import</Label>
          <Textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder="sphere,cylinder,sku,opc_code,price,stock_qty,active" rows={5} />
          <Button size="sm" onClick={() => parseCsv().catch((error) => toast({ title: "CSV import failed", description: error.message, variant: "destructive" }))}>Preview + Import CSV</Button>
        </div>
      )}

      <div className="max-h-[260px] overflow-auto rounded border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background"><tr><th className="px-2 py-2 text-left">Label</th><th className="px-2 py-2 text-left">SKU</th><th className="px-2 py-2 text-left">OPC</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2 text-right">Stock</th></tr></thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id} className="border-t">
                <td className="px-2 py-2">{variant.display_label || variant.title}</td>
                <td className="px-2 py-2">{variant.sku || "—"}</td>
                <td className="px-2 py-2">{variant.opc_code || "—"}</td>
                <td className="px-2 py-2 text-right">${variant.price.toFixed(2)}</td>
                <td className="px-2 py-2 text-right">{variant.stock_qty ?? "∞"}</td>
              </tr>
            ))}
            {variants.length === 0 && <tr><td className="px-2 py-3 text-muted-foreground" colSpan={5}>No variants configured.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
