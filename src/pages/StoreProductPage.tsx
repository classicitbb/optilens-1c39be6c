import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getStableStoreProductCartId, useStoreProducts } from "@/hooks/useStoreProducts";
import { useTradePricing } from "@/hooks/useTradePricing";
import { useBulkAddVariantsToCart, useProductVariantSettings, useProductVariants } from "@/hooks/useProductVariants";
import LensVariantGrid from "@/components/lenses/LensVariantGrid";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Expand, Info, Layers, Lock, Settings, ShoppingCart } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { createAuthHref } from "@/lib/authFlow";
import StorageImage from "@/components/StorageImage";
import { getProductHubRoute } from "@/lib/productLinks";

const SUPPLY_CATEGORY_LABELS: Record<string, string> = {
  lab: "Lab Supplies",
  optical: "Optical Supplies",
  accessories: "Eyewear Accessories",
};

const StoreProductPage = () => {
  const { productId, productType } = useParams<{ productId: string; productType: "lens" | "supply" | "addon" }>();
  const { tradePricing, customerId: tradeCustomerId, isTradeCustomer } = useTradePricing();
  const { data: products, isLoading } = useStoreProducts(tradePricing, tradeCustomerId);
  const { addToCart, refetch } = useCartContext();
  const { toast } = useToast();
  const addVariantsMutation = useBulkAddVariantsToCart();
  const { data: variants = [] } = useProductVariants(productType as any, productId);
  const { data: variantSettings } = useProductVariantSettings(productType as any, productId);
  const { user } = useAuth();
  const { canEdit } = useUserRole();
  const navigate = useNavigate();

  if (!productId || (productType !== "lens" && productType !== "supply" && productType !== "addon")) {
    return <Navigate to="/store" replace />;
  }

  const product = (products || []).find((candidate) => candidate.id === productId && candidate.product_type === productType);
  const isChiralLens = product?.product_type === "lens"
    ? Boolean((variantSettings?.config as any)?.is_chiral) || product.tags.some((tag) => /progressive|bifocal/i.test(tag))
    : false;
  const rowLabel = String((variantSettings?.config as any)?.row_label ?? "Sphere");
  const columnLabel = String((variantSettings?.config as any)?.column_label ?? "Cylinder");


  const handleAddVariantSelection = async (items: { variantId: string; quantity: number }[]) => {
    const inserted = await addVariantsMutation.mutateAsync(items);
    await refetch();
    toast({
      title: "Variants added",
      description: `${inserted} variant line${inserted === 1 ? "" : "s"} added to cart.`,
    });
  };

  const handleAdd = () => {
    if (!product) return;

    if (product.has_variants) {
      // Variant configuration will be introduced on this page; avoid direct cart insertion until configured.
      return;
    }

    addToCart({
      id: getStableStoreProductCartId(product),
      name: product.name,
      price: product.sell_price_usd,
      productType: product.product_type,
      quantity: 1,
      priceUnit: product.product_type === "lens" ? "pair" : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !product ? (
            <Card variant="feature" className="mx-auto max-w-2xl">
              <CardContent className="space-y-4 p-8 text-center">
                <h1 className="text-2xl font-bold text-foreground">Product unavailable</h1>
                <p className="text-muted-foreground">This product is not available on the website.</p>
                <Button asChild>
                  <Link to="/store">Back to catalog</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mx-auto max-w-5xl">
              {/* Breadcrumb */}
              <nav className="mb-5 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
                <Link to="/store" className="hover:text-foreground transition-colors">Store</Link>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
                <span className="capitalize">
                  {product.product_type === "supply"
                    ? (SUPPLY_CATEGORY_LABELS[product.category] || product.category)
                    : product.category}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
                <span className="font-semibold text-foreground truncate max-w-[200px]">{product.name}</span>
              </nav>

              <div className="mb-4 flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate("/store")}>Back to catalog</Button>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <Button variant="outline" size="icon" asChild title="Open in Product Hub" aria-label="Open in Product Hub">
                      <Link to={getProductHubRoute(product.product_type, product.id)}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {product.product_type === "supply" ? (SUPPLY_CATEGORY_LABELS[product.category] || product.category) : product.category}
                  </Badge>
                  {product.subcategory && product.subcategory !== "service" && (
                    <Badge variant="secondary" className="text-xs">
                      {product.subcategory}
                    </Badge>
                  )}
                </div>
              </div>

              <Card variant="feature">
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-8 md:grid-cols-[380px_1fr]">
                  {/* Left column: image + description */}
                  <div className="space-y-3">
                    <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-muted/10 to-muted/40 shadow-inner">
                      {product.image_url ? (
                        <StorageImage src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                          <ShoppingCart className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                          No image available
                        </div>
                      )}
                    </div>
                    {product.image_url && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="secondary" className="w-full">
                            <Expand className="h-4 w-4" />
                            Expand image
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>{product.name}</DialogTitle>
                          </DialogHeader>
                          <StorageImage src={product.image_url} alt={`${product.name} expanded`} className="max-h-[75vh] w-full rounded-md object-contain" />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {/* Right column: name, tags, price, cart */}
                  <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-foreground leading-tight">{product.name}</h1>

                    {product.description && (
                      <p className="whitespace-normal break-words text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                    )}

                    {product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    {user ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-foreground">
                            ${product.sell_price_usd.toFixed(2)}
                          </span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {product.product_type === "supply" ? `/${product.subcategory}` : "/pair"}
                          </span>
                          <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">USD</span>
                        </div>
                        {isTradeCustomer && (
                          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-accent">Trade price</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        Sign in to view pricing
                      </div>
                    )}

                    {product.has_variants && !(product.product_type === "lens" && variants.length > 0) && (
                      <div className="flex items-start gap-3 rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Variant selection required</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">This product requires variant selection before it can be added to the cart.</p>
                        </div>
                      </div>
                    )}

                    {user ? (
                      <Button variant="hero" size="lg" onClick={handleAdd} disabled={product.has_variants}>
                        <ShoppingCart className="h-5 w-5" />
                        {product.has_variants ? "Configuration required" : "Add to Cart"}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card/60 p-4">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 text-sm text-muted-foreground">Sign in to add this product to your cart.</div>
                      <Button asChild>
                          <Link to={createAuthHref({ mode: "signin", audience: "professional", redirect: `/store/product/${product.product_type}/${product.id}` })}>Sign In</Link>
                      </Button>
                    </div>
                    )}
                  </div>
                  </div>

                  {product.has_variants && product.product_type === "lens" && variants.length > 0 && (
                    <div className="w-full space-y-3">
                      <div className="flex items-center gap-3">
                        <Layers className="h-4 w-4 text-secondary" aria-hidden="true" />
                        <h2 className="text-sm font-semibold text-foreground">Select lens powers</h2>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                      <Card className="w-full border-border/70 bg-muted/20">
                        <CardContent className="p-3">
                          <LensVariantGrid
                            variants={variants}
                            isChiral={isChiralLens}
                            rowLabel={rowLabel}
                            columnLabel={columnLabel}
                            onAddSelected={handleAddVariantSelection}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StoreProductPage;
