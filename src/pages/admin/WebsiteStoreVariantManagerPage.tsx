import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Layers, Trash2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import LensVariantGrid from "@/components/lenses/LensVariantGrid";
import {
  useArchiveProductVariant,
  useProductVariantSettings,
  useProductVariants,
  useSaveProductVariantSettings,
  useUpsertProductVariants,
  type ProductVariant,
  type StoreProductType,
  type VariantMode,
} from "@/hooks/useProductVariants";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useLenses } from "@/hooks/useLenses";
import { useInnovationsLensPowerRows, useInnovationsStoreLensCatalog, type InnovationsStoreLens } from "@/hooks/useInnovationsStoreLensCatalog";
import { buildImportedLensVariants } from "@/features/store-variants/innovationsVariantImport";

const LENS_TEMPLATE = `Diameter,Sph,Cyl,OPC,Eye\n80.00,4.00,1.00,0023409923,Left\n80.00,4.00,1.00,0024409930,Right`;

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

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]+/g, "");
const getValue = (row: Record<string, string>, aliases: string[]) => {
  const entries = Object.entries(row);
  const found = entries.find(([key]) => aliases.includes(normalizeHeader(key)));
  return found?.[1] ?? "";
};

const MODE_BY_PRODUCT: Record<StoreProductType, VariantMode[]> = {
  lens: ["none", "lens_grid"],
  supply: ["none", "standard_options", "generic_matrix"],
  addon: ["none", "service_config", "generic_matrix"],
};

const MODE_LABEL: Record<VariantMode, string> = {
  none: "None",
  lens_grid: "Lens grid",
  standard_options: "Standard options",
  service_config: "Service config",
  generic_matrix: "Generic matrix",
};

const pickerValues = (lenses: InnovationsStoreLens[], field: keyof InnovationsStoreLens) =>
  [...new Set(lenses.map((lens) => String(lens[field] ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const LensDimensionSelect = ({ label, value, values, onValueChange }: { label: string; value: string; values: string[]; onValueChange: (value: string) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Select value={value || "__all__"} onValueChange={(next) => onValueChange(next === "__all__" ? "" : next)}>
      <SelectTrigger><SelectValue placeholder={`Any ${label.toLowerCase()}`} /></SelectTrigger>
      <SelectContent><SelectItem value="__all__">Any {label}</SelectItem>{values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

const WebsiteStoreVariantManagerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { productType, productId } = useParams<{ productType: StoreProductType; productId: string }>();
  const [csvInput, setCsvInput] = useState("");
  const [manualLens, setManualLens] = useState({ sphere: "", cylinder: "", diameter: "", leftOpc: "", rightOpc: "", stock: "", price: "" });
  const [manualGeneric, setManualGeneric] = useState({ title: "", attrsJson: '{"size":"M"}', sku: "", opc: "", stock: "", price: "" });
  const [innovationsFilters, setInnovationsFilters] = useState<Record<string, string>>({});
  const [catalogLensId, setCatalogLensId] = useState("");
  const [importPreview, setImportPreview] = useState<Partial<ProductVariant>[]>([]);

  const { data: products = [] } = useStoreProducts();
  const { data: catalogLenses = [] } = useLenses();
  const { data: innovationsLenses = [] } = useInnovationsStoreLensCatalog();
  const matchingInnovationsLenses = useMemo(() => innovationsLenses.filter((lens) => Object.entries(innovationsFilters).every(([field, value]) => !value || String(lens[field as keyof InnovationsStoreLens] ?? "") === value)), [innovationsFilters, innovationsLenses]);
  const matchingInnovationsLensIds = matchingInnovationsLenses.length <= 20 ? matchingInnovationsLenses.map((lens) => lens.innovations_lens_id) : [];
  const { data: innovationsPowerRows = [] } = useInnovationsLensPowerRows(matchingInnovationsLensIds);
  const product = useMemo(() => products.find((item) => item.id === productId && item.product_type === productType), [productId, productType, products]);

  const { data: settings, refetch: refetchSettings } = useProductVariantSettings(productType, productId);
  const { data: variants = [], refetch: refetchVariants } = useProductVariants(productType, productId, { activeOnly: false });
  const saveSettingsMutation = useSaveProductVariantSettings(productType as StoreProductType, productId ?? "");
  const upsertVariantsMutation = useUpsertProductVariants(productType as StoreProductType, productId ?? "");
  const archiveVariantMutation = useArchiveProductVariant(productType as StoreProductType, productId ?? "");

  if (!productType || !productId) return null;

  const allowedModes = MODE_BY_PRODUCT[productType];
  const defaultMode: VariantMode = productType === "lens" ? "lens_grid" : productType === "supply" ? "standard_options" : "service_config";
  const currentMode = allowedModes.includes((settings?.variant_mode as VariantMode) ?? "none") ? (settings?.variant_mode as VariantMode) : defaultMode;
  const defaultChiral = product?.product_type === "lens" && product.tags.some((tag) => /progressive|bifocal/i.test(tag));
  const config = (settings?.config ?? {}) as Record<string, unknown>;
  const isChiral = Boolean(config.is_chiral ?? defaultChiral);
  const rowLabel = String(config.row_label ?? "Sphere");
  const columnLabel = String(config.column_label ?? "Cylinder");
  const eligibleCatalogLenses = catalogLenses.filter((lens) => lens.is_active && /semi.?finished|finished/i.test(lens.finishtype?.name ?? ""));

  const saveConfig = (partial: Record<string, unknown>) => {
    saveSettingsMutation.mutate({
      variant_mode: currentMode,
      sku_template: settings?.sku_template,
      opc_template: settings?.opc_template,
      config: { ...config, ...partial },
    });
  };

  const handleModeChange = async (nextMode: VariantMode) => {
    if (!allowedModes.includes(nextMode)) return;
    await saveSettingsMutation.mutateAsync({ variant_mode: nextMode, config: settings?.config ?? {} });
    await refetchSettings();
    toast({ title: "Variant mode updated", description: "Variant mode has been saved." });
  };

  const refreshVariants = async () => {
    await refetchVariants();
  };

  const handleImportLensCsv = async () => {
    const rows = parseCsv(csvInput);
    if (rows.length === 0) {
      toast({ title: "No rows", description: "Paste CSV data before importing.", variant: "destructive" });
      return;
    }

    const invalidRow = rows.find((row) =>
      !getValue(row, ["sph", "sphere", "base"]) ||
      !getValue(row, ["cyl", "cylinder", "add"]) ||
      !getValue(row, ["opc", "opccode"]),
    );
    if (invalidRow) {
      toast({ title: "Import validation failed", description: "Each row must include sph/base, cyl/add, and OPC.", variant: "destructive" });
      return;
    }

    const variantMap = new Map<string, any>();
    rows.forEach((row) => {
      const sphere = Number(getValue(row, ["sph", "sphere", "base"]) || 0);
      const cylinder = Number(getValue(row, ["cyl", "cylinder", "add"]) || 0);
      const diameter = Number(getValue(row, ["diameter", "dia"]) || 0);
      const eyeRaw = getValue(row, ["eye"]).toLowerCase();
      const eye = eyeRaw.startsWith("l") ? "left" : eyeRaw.startsWith("r") ? "right" : "";
      const opc = getValue(row, ["opc", "opccode"]);
      const key = `sphere:${sphere}|cylinder:${cylinder}|diameter:${diameter}`;

      const existing = variantMap.get(key) ?? {
        title: `${rowLabel.toUpperCase()} ${sphere.toFixed(2)} / ${columnLabel.toUpperCase()} ${cylinder.toFixed(2)}`,
        variant_key: key,
        sku: `LENS-${sphere.toFixed(2)}-${cylinder.toFixed(2)}-${diameter.toFixed(2)}`,
        opc_code: isChiral ? null : opc,
        attributes: { sphere, cylinder, diameter },
        metadata: { is_chiral: isChiral, opc_by_eye: {} as Record<string, string> },
        price: Number(getValue(row, ["price"]) || product?.sell_price || 0),
        stock_qty: Number(getValue(row, ["stockqty", "stock", "qty"]) || 0),
        is_active: getValue(row, ["active"]) !== "false",
        sort_order: variantMap.size,
      };

      if (isChiral && eye) {
        existing.metadata.opc_by_eye[eye] = opc;
      } else if (!isChiral && !existing.opc_code) {
        existing.opc_code = opc;
      }

      variantMap.set(key, existing);
    });

    await upsertVariantsMutation.mutateAsync(Array.from(variantMap.values()));
    await refreshVariants();
    toast({ title: "CSV imported", description: `${variantMap.size} variant row(s) loaded and previewed below.` });
    setCsvInput("");
  };

  const handleAddLensPower = async () => {
    const sphere = Number(manualLens.sphere || 0);
    const cylinder = Number(manualLens.cylinder || 0);
    const diameter = Number(manualLens.diameter || 0);
    const key = `sphere:${sphere}|cylinder:${cylinder}|diameter:${diameter}`;
    await upsertVariantsMutation.mutateAsync([{
      title: `${rowLabel.toUpperCase()} ${sphere.toFixed(2)} / ${columnLabel.toUpperCase()} ${cylinder.toFixed(2)}`,
      variant_key: key,
      sku: `LENS-${sphere.toFixed(2)}-${cylinder.toFixed(2)}-${diameter.toFixed(2)}`,
      opc_code: isChiral ? null : manualLens.leftOpc || null,
      attributes: { sphere, cylinder, diameter },
      metadata: { is_chiral: isChiral, opc_by_eye: { left: manualLens.leftOpc, right: manualLens.rightOpc } },
      price: Number(manualLens.price || product?.sell_price || 0),
      stock_qty: Number(manualLens.stock || 0),
      is_active: true,
      sort_order: variants.length,
    }]);
    await refreshVariants();
    setManualLens({ sphere: "", cylinder: "", diameter: "", leftOpc: "", rightOpc: "", stock: "", price: "" });
  };

  const handleAddGenericVariant = async () => {
    let attrs: Record<string, unknown> = {};
    try {
      attrs = JSON.parse(manualGeneric.attrsJson || "{}");
    } catch {
      toast({ title: "Invalid attributes JSON", description: "Use valid JSON in attributes.", variant: "destructive" });
      return;
    }

    await upsertVariantsMutation.mutateAsync([{
      title: manualGeneric.title || "Variant",
      variant_key: `${manualGeneric.title}:${JSON.stringify(attrs)}`,
      sku: manualGeneric.sku || null,
      opc_code: manualGeneric.opc || null,
      attributes: attrs as Record<string, string | number | boolean>,
      metadata: { mode: currentMode },
      price: Number(manualGeneric.price || 0),
      stock_qty: Number(manualGeneric.stock || 0),
      is_active: true,
      sort_order: variants.length,
    }]);
    await refreshVariants();
    setManualGeneric({ title: "", attrsJson: '{"size":"M"}', sku: "", opc: "", stock: "", price: "" });
  };

  const handleRemoveVariant = async (variantId: string) => {
    await archiveVariantMutation.mutateAsync(variantId);
    await refreshVariants();
  };

  const prepareInnovationsImport = () => {
    if (!matchingInnovationsLensIds.length) return;
    setImportPreview(buildImportedLensVariants(innovationsPowerRows, { isChiral, rowLabel, columnLabel, price: Number(product?.sell_price ?? 0) }));
  };
  const applyInnovationsImport = async () => {
    if (!importPreview.length) return;
    await upsertVariantsMutation.mutateAsync(importPreview);
    await refreshVariants();
    setImportPreview([]);
    toast({ title: "Variants applied", description: `${importPreview.length} reviewed grid record(s) saved.` });
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
            <Select value={currentMode} onValueChange={(value) => handleModeChange(value as VariantMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedModes.map((mode) => (
                  <SelectItem key={mode} value={mode}>{MODE_LABEL[mode]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SKU template</Label>
            <Input
              value={String(settings?.sku_template ?? "")}
              onChange={(event) => saveSettingsMutation.mutate({
                variant_mode: currentMode,
                sku_template: event.target.value,
                opc_template: settings?.opc_template,
                config: settings?.config,
              })}
              placeholder="{product_code}-{sphere}-{cylinder}-{diameter}"
            />
          </div>

          {currentMode === "lens_grid" && (
            <>
              <div className="space-y-2">
                <Label>Chiral (Left/Right pair)</Label>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch checked={isChiral} onCheckedChange={(checked) => saveConfig({ is_chiral: checked })} />
                  <span className="text-sm text-muted-foreground">One grid quantity equals one pair; cart splits into Left + Right lines.</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Power labels</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={rowLabel} onChange={(event) => saveConfig({ row_label: event.target.value })} placeholder="Sphere or Base" />
                  <Input value={columnLabel} onChange={(event) => saveConfig({ column_label: event.target.value })} placeholder="Cylinder or Add" />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {currentMode === "lens_grid" && (
        <Card>
          <CardHeader><CardTitle>Lens matching and Innovations import</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Match this website product in place. The product page remains the owner of its title and price; this page only stores matching and imports grid rows.</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {([['Material group', 'material_group'], ['Material', 'material'], ['MF type', 'mf_type'], ['Lens type', 'lens_type'], ['Lens option', 'option_name'], ['Manufacturer', 'manufacturer'], ['Finish / semi', 'finish_type']] as const).map(([label, field], index) => {
                const priorFields = [['material_group'], ['material_group', 'material'], ['material_group', 'material', 'mf_type'], ['material_group', 'material', 'mf_type', 'lens_type'], ['material_group', 'material', 'mf_type', 'lens_type', 'option_name'], ['material_group', 'material', 'mf_type', 'lens_type', 'option_name', 'manufacturer'], ['material_group', 'material', 'mf_type', 'lens_type', 'option_name', 'manufacturer', 'finish_type']][index];
                const scoped = innovationsLenses.filter((lens) => priorFields.slice(0, -1).every((prior) => !innovationsFilters[prior] || String(lens[prior as keyof InnovationsStoreLens] ?? '') === innovationsFilters[prior]));
                return <LensDimensionSelect key={field} label={label} value={innovationsFilters[field] ?? ''} values={pickerValues(scoped, field)} onValueChange={(value) => setInnovationsFilters((current) => ({ ...current, [field]: value }))} />;
              })}
              <div className="space-y-2"><Label>CV Web Lens Catalog price source</Label><Select value={catalogLensId || String(config.cv_web_lens_id ?? "")} onValueChange={(value) => { setCatalogLensId(value); saveConfig({ cv_web_lens_id: value }); }}><SelectTrigger><SelectValue placeholder="Choose semi-finished or finished catalog lens" /></SelectTrigger><SelectContent>{eligibleCatalogLenses.map((lens) => <SelectItem key={lens.id} value={lens.id}>{lens.name} — {Number(lens.sell_price).toFixed(2)}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <p className="text-sm text-muted-foreground">{matchingInnovationsLenses.length} matching Innovations lens configuration{matchingInnovationsLenses.length === 1 ? '' : 's'}{matchingInnovationsLenses.length > 20 ? ' — refine the filters to 20 or fewer before loading the range.' : ''}</p>
            <Button variant="outline" onClick={prepareInnovationsImport} disabled={!matchingInnovationsLensIds.length || !innovationsPowerRows.length}>Prepare variant-records preview</Button>
            {matchingInnovationsLensIds.length > 0 && innovationsPowerRows.length === 0 && <p className="text-sm text-muted-foreground">No power rows have been received from Lens Local for this match yet.</p>}
            {importPreview.length > 0 && <div className="rounded-md border p-3 space-y-3"><p className="text-sm font-medium">Reviewable import preview: {importPreview.length} grid record(s)</p><div className="text-xs text-muted-foreground">{importPreview.map((row) => `${row.title} (stock ${row.stock_qty})`).join("; ")}</div><Button onClick={applyInnovationsImport} disabled={upsertVariantsMutation.isPending}>Apply to saved grid records</Button></div>}
          </CardContent>
        </Card>
      )}

      {currentMode === "lens_grid" && (
        <Card>
          <CardHeader>
            <CardTitle>Lens CSV import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Paste rows using: Diameter, Sph/Base, Cyl/Add, OPC, Eye.</p>
            <Button variant="outline" onClick={() => {
              const blob = new Blob([LENS_TEMPLATE], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "lens-variant-template.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}>Download CSV template</Button>
            <Textarea rows={8} value={csvInput} onChange={(event) => setCsvInput(event.target.value)} placeholder={LENS_TEMPLATE} />
            <Button onClick={handleImportLensCsv} disabled={upsertVariantsMutation.isPending}>Import CSV</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{currentMode === "lens_grid" ? "Manual lens power entry" : "Manual variant entry"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentMode === "lens_grid" ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Input placeholder={rowLabel} value={manualLens.sphere} onChange={(event) => setManualLens((prev) => ({ ...prev, sphere: event.target.value }))} />
                <Input placeholder={columnLabel} value={manualLens.cylinder} onChange={(event) => setManualLens((prev) => ({ ...prev, cylinder: event.target.value }))} />
                <Input placeholder="Diameter" value={manualLens.diameter} onChange={(event) => setManualLens((prev) => ({ ...prev, diameter: event.target.value }))} />
                <Input placeholder="Stock qty" value={manualLens.stock} onChange={(event) => setManualLens((prev) => ({ ...prev, stock: event.target.value }))} />
                <Input placeholder="Price" value={manualLens.price} onChange={(event) => setManualLens((prev) => ({ ...prev, price: event.target.value }))} />
                <Input placeholder="Left OPC" value={manualLens.leftOpc} onChange={(event) => setManualLens((prev) => ({ ...prev, leftOpc: event.target.value }))} />
                <Input placeholder="Right OPC" value={manualLens.rightOpc} onChange={(event) => setManualLens((prev) => ({ ...prev, rightOpc: event.target.value }))} />
              </div>
              <Button onClick={handleAddLensPower}>Add power row</Button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Input placeholder="Variant title" value={manualGeneric.title} onChange={(event) => setManualGeneric((prev) => ({ ...prev, title: event.target.value }))} />
                <Input placeholder="SKU" value={manualGeneric.sku} onChange={(event) => setManualGeneric((prev) => ({ ...prev, sku: event.target.value }))} />
                <Input placeholder="OPC" value={manualGeneric.opc} onChange={(event) => setManualGeneric((prev) => ({ ...prev, opc: event.target.value }))} />
                <Input placeholder="Stock qty" value={manualGeneric.stock} onChange={(event) => setManualGeneric((prev) => ({ ...prev, stock: event.target.value }))} />
                <Input placeholder="Price" value={manualGeneric.price} onChange={(event) => setManualGeneric((prev) => ({ ...prev, price: event.target.value }))} />
              </div>
              <Textarea value={manualGeneric.attrsJson} onChange={(event) => setManualGeneric((prev) => ({ ...prev, attrsJson: event.target.value }))} />
              <Button onClick={handleAddGenericVariant}>Add variant</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variant records preview ({variants.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">OPC</th>
                  <th className="px-3 py-2 text-left">Price</th>
                  <th className="px-3 py-2 text-left">Stock</th>
                  <th className="px-3 py-2 text-left">Attributes</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant: ProductVariant) => (
                  <tr key={variant.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{variant.title}</td>
                    <td className="px-3 py-2">{variant.sku ?? "—"}</td>
                    <td className="px-3 py-2">{variant.opc_code ?? (variant.metadata?.opc_by_eye ? JSON.stringify((variant.metadata as any).opc_by_eye) : "—")}</td>
                    <td className="px-3 py-2">{Number(variant.price).toFixed(2)}</td>
                    <td className="px-3 py-2">{variant.stock_qty}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{JSON.stringify(variant.attributes)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleRemoveVariant(variant.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentMode === "lens_grid" && variants.filter((variant) => variant.is_active).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Lens grid preview</h3>
              <LensVariantGrid
                variants={variants.filter((variant) => variant.is_active)}
                isChiral={isChiral}
                rowLabel={rowLabel}
                columnLabel={columnLabel}
                readOnly
                onAddSelected={async () => undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteStoreVariantManagerPage;
