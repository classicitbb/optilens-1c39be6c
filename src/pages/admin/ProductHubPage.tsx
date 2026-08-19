import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses } from "@/hooks/useLenses";
import { useSupplies } from "@/hooks/useSupplies";
import { useAddons } from "@/hooks/useAddons";
import { useToast } from "@/hooks/use-toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Layers,
  Loader2,
  PackageSearch,
  Sparkles,
  Tags,
  Truck,
} from "lucide-react";
import {
  type ProductType,
  getCatalogEditRoute,
  getPricelistRoute,
  getStockOrderBuilderRoute,
  getStorefrontRoute,
  getStoreSettingsRoute,
} from "@/lib/productLinks";

const TABLE_BY_TYPE: Record<ProductType, "lenses" | "supplies" | "addons"> = {
  lens: "lenses",
  supply: "supplies",
  addon: "addons",
};

const TYPE_LABEL: Record<ProductType, string> = { lens: "Lens", supply: "Supply", addon: "Add-on" };

interface StoreOverrideRow {
  is_published: boolean | null;
  is_vat_taxable: boolean | null;
  quantity_label: string | null;
}

const StatusRow = ({
  icon: Icon,
  label,
  detail,
  state,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: typeof Layers;
  label: string;
  detail: string;
  state: "ok" | "warn" | "off";
  actionLabel: string;
  actionHref?: string | null;
  onAction?: () => void;
}) => (
  <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          <Badge variant={state === "ok" ? "default" : state === "warn" ? "destructive" : "secondary"}>
            {detail}
          </Badge>
        </div>
      </div>
    </div>
    {actionHref ? (
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <Link to={actionHref}>
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    ) : onAction ? (
      <Button size="sm" className="gap-1.5" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : (
      <span className="text-xs text-muted-foreground">{actionLabel}</span>
    )}
  </div>
);

const ProductHubPage = () => {
  const { productType, productId } = useParams<{ productType: ProductType; productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lenses = [], isLoading: lensesLoading } = useLenses();
  const { data: supplies = [], isLoading: suppliesLoading } = useSupplies();
  const { data: addons = [], isLoading: addonsLoading } = useAddons();

  const { data: overrideRow, isLoading: overrideLoading } = useQuery<StoreOverrideRow | null>({
    queryKey: ["store-product-override", productType, productId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("store_product_overrides") as any)
        .select("is_published, is_vat_taxable, quantity_label")
        .eq("product_type", productType)
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      return data as StoreOverrideRow | null;
    },
    enabled: !!productType && !!productId,
  });

  const catalogRow = useMemo(() => {
    if (productType === "lens") return lenses.find((l) => l.id === productId);
    if (productType === "supply") return supplies.find((s) => s.id === productId);
    if (productType === "addon") return addons.find((a) => a.id === productId);
    return undefined;
  }, [productType, productId, lenses, supplies, addons]);

  const isLoading = lensesLoading || suppliesLoading || addonsLoading || overrideLoading;

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!productType || !productId) return;
      const table = TABLE_BY_TYPE[productType];
      const { error } = await (supabase.from(table) as any)
        .update({ show_on_website: true, is_active: true })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lenses"] });
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
      queryClient.invalidateQueries({ queryKey: ["store-products"] });
      toast({
        title: "Published to store",
        description: `${catalogRow?.name ?? "This product"} is now visible on the website and available in the stock order form.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Publish failed", description: error?.message || "Unexpected error", variant: "destructive" });
    },
  });

  if (!productType || !productId || !(productType in TABLE_BY_TYPE)) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Unrecognized product link.</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => navigate("/admin/pricing/catalog")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to catalog
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!catalogRow) {
    return (
      <div className="p-6 space-y-3">
        <AdminPageHeader icon={PackageSearch} title="Product not found" />
        <p className="text-sm text-muted-foreground">
          No {TYPE_LABEL[productType].toLowerCase()} with id <span className="font-mono">{productId}</span> exists in
          the catalog. It may have been deleted.
        </p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/admin/pricing/catalog")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to catalog
        </Button>
      </div>
    );
  }

  const isActive = (catalogRow as any).is_active === true;
  const wsplEligible: boolean | null =
    productType === "lens"
      ? Boolean((catalogRow as any).show_in_ws_pricelist)
      : productType === "supply"
      ? Boolean((catalogRow as any).stk_wspl)
      : null;
  const storePublished = overrideRow?.is_published ?? (catalogRow as any).show_on_website === true;
  const stockOrderEligible = storePublished && isActive;
  const pricelistHref = getPricelistRoute(productType, productId);

  const needsPublishPush = wsplEligible === true && !storePublished;

  return (
    <div className="space-y-6 p-6 pb-16">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </div>

      <AdminPageHeader icon={PackageSearch} title={catalogRow.name}>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{TYPE_LABEL[productType]}</Badge>
          <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
        </div>
      </AdminPageHeader>

      {needsPublishPush && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">In the WSPL pricelist but not on the website yet</p>
                <p className="text-xs text-muted-foreground">
                  Publish to make it visible in the storefront and orderable in the stock order form.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Publish to store"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where this product lives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusRow
            icon={PackageSearch}
            label="Catalog"
            detail="In catalog"
            state="ok"
            actionLabel="Edit in catalog"
            actionHref={getCatalogEditRoute(productType, productId)}
          />

          <StatusRow
            icon={Tags}
            label="WSPL pricelist"
            detail={wsplEligible === null ? "Not applicable" : wsplEligible ? "In WSPL" : "Not in WSPL"}
            state={wsplEligible === null ? "off" : wsplEligible ? "ok" : "warn"}
            actionLabel={pricelistHref ? "Open pricelist row" : "No WSPL pricelist for add-ons"}
            actionHref={pricelistHref ?? undefined}
          />

          <StatusRow
            icon={Layers}
            label="Store"
            detail={storePublished ? "Published" : "Not on website"}
            state={storePublished ? "ok" : "warn"}
            actionLabel={storePublished ? "Edit store settings" : "Publish to store"}
            actionHref={storePublished ? getStoreSettingsRoute(productType, productId) : undefined}
            onAction={storePublished ? undefined : () => publishMutation.mutate()}
          />

          <StatusRow
            icon={Truck}
            label="Stock order form"
            detail={stockOrderEligible ? "Orderable" : "Not orderable"}
            state={stockOrderEligible ? "ok" : "warn"}
            actionLabel="Open stock order builder"
            actionHref={getStockOrderBuilderRoute(productType, productId)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {storePublished && (
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to={getStorefrontRoute(productType, productId)} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> View live product
            </Link>
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        "Orderable" mirrors the storefront publish + active flags — an individual customer's assigned pricelist can
        still exclude this item from their stock order form even when this shows orderable.
      </p>
    </div>
  );
};

export default ProductHubPage;
