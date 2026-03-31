import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layers } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useProductVariantSettings, useSaveProductVariantSettings, useUpsertProductVariants, type StoreProductType, type VariantMode } from "@/hooks/useProductVariants";
import { useStoreProducts } from "@/hooks/useStoreProducts";

const TEMPLATE = `product_id,sphere,cylinder,axis,add_power,diameter,sku,opc_code,price,stock_qty,active\nREPLACE_PRODUCT_UUID,-1.00,-0.50,,,65,LENS-100-050,OPC-100-050,75.00,12,true`;

const parseCsv = (raw: string) => {
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/).filter(Boolean);
  if (!headerLine) return [] as Record<string, string>[];
  const headers = headerLine.split(",").map((h) => h.trim());
  return lines.map((line) => {
    const values = line.split(",");
    return headers.reduce<Record<string, string>>((acc, key, index) => {
      acc[key] = (values[index] ?? "").trim();
      return acc;
    }, {});
  });
};

const WebsiteStoreVariantManagerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { productType, productId } = useParams<{ productType: StoreProductType; productId: string }>();
  const [csvInput, setCsvInput] = useState("");

  const { data: products = [] } = useStoreProducts();
  const product = useMemo(() => products.find((item) => item.id === productId && item.product_type === productType), [productId, productType, products]);

  const { data: settings } = useProductVariantSettings(productType, productId);
  const saveSettingsMutation = useSaveProductVariantSettings(productType as StoreProductType, productId ?? "");
  const upsertVariantsMutation = useUpsertProductVariants(productType as StoreProductType, productId ?? "");

  if (!productType || !productId) return null;

  const handleModeChange = async (nextMode: VariantMode) => {
    await saveSettingsMutation.mutateAsync({ variant_mode: nextMode, config: settings?.config ?? {} });
    toast({ title: "Variant mode updated", description: "Variant mode has been saved." });
  };

  const handleImport = async () => {
    const rows = parseCsv(csvInput);
    if (rows.length === 0) {
      toast({ title: "No rows", description: "Paste CSV data before importing.", variant: "destructive" });
      return;
    }

    const invalidRow = rows.find((row) => !row.sku || !row.price || !row.stock_qty);
    if (invalidRow) {
      toast({ title: "Import validation failed", description: "Every row must include sku, price, and stock_qty.", variant: "destructive" });
      return;
    }

    await upsertVariantsMutation.mutateAsync(
      rows.map((row, index) => ({
        title: `SPH ${row.sphere || "0.00"} / CYL ${row.cylinder || "0.00"}`,
        variant_key: `sphere:${row.sphere || "0.00"}|cylinder:${row.cylinder || "0.00"}|axis:${row.axis || ""}|add:${row.add_power || ""}|diameter:${row.diameter || ""}`,
        sku: row.sku,
        opc_code: row.opc_code || null,
        attributes: {
          sphere: Number(row.sphere || 0),
          cylinder: Number(row.cylinder || 0),
          axis: row.axis ? Number(row.axis) : null,
          add_power: row.add_power ? Number(row.add_power) : null,
          diameter: row.diameter ? Number(row.diameter) : null,
        },
        price: Number(row.price),
        stock_qty: Number(row.stock_qty),
        is_active: row.active !== "false",
        sort_order: index,
      })),
    );

    toast({ title: "CSV imported", description: `${rows.length} row(s) have been processed.` });
    setCsvInput("");
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader icon={Layers} title="Store Variants">
        <Button variant="outline" onClick={() => navigate("/admin/website/store")}>Back to store products</Button>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle>{product?.name ?? "Product"} variant mode</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Variant mode</Label>
            <Select value={settings?.variant_mode ?? "none"} onValueChange={(value) => handleModeChange(value as VariantMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="lens_grid">Lens grid</SelectItem>
                <SelectItem value="standard_options">Standard options</SelectItem>
                <SelectItem value="service_config">Service config</SelectItem>
                <SelectItem value="generic_matrix">Generic matrix</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SKU template</Label>
            <Input
              value={String(settings?.sku_template ?? "")}
              onChange={(event) => saveSettingsMutation.mutate({
                variant_mode: settings?.variant_mode ?? "none",
                sku_template: event.target.value,
                opc_template: settings?.opc_template,
                config: settings?.config,
              })}
              placeholder="{product_code}-{sphere}-{cylinder}-{diameter}"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lens CSV import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Paste lens CSV rows to create/update variants in bulk. Existing rows are matched using the generated variant key.</p>
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "lens-variant-template.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download CSV template
          </Button>
          <Textarea rows={10} value={csvInput} onChange={(event) => setCsvInput(event.target.value)} placeholder={TEMPLATE} />
          <Button onClick={handleImport} disabled={upsertVariantsMutation.isPending}>Import CSV</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteStoreVariantManagerPage;
