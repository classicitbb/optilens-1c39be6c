import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LensChatbot } from "@/components/LensChatbot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { getStableStoreProductCartId, useStoreProducts } from "@/hooks/useStoreProducts";
import { useBulkAddVariantsToCart, useProductVariantSettings, useProductVariants } from "@/hooks/useProductVariants";
import LensVariantGrid from "@/components/lenses/LensVariantGrid";
import { useToast } from "@/hooks/use-toast";
import { Expand, Lock, ShoppingCart } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { createAuthHref } from "@/lib/authFlow";

const SUPPLY_CATEGORY_LABELS: Record<string, string> = {
  lab: "Lab Supplies",
  optical: "Optical Supplies",
  accessories: "Eyewear Accessories",
};

const StoreProductPage = () => {
  const { productId, productType } = useParams<{ productId: string; productType: "lens" | "supply" | "addon" }>();
  const { data: products, isLoading } = useStoreProducts();
  const { addToCart, refetch } = useCartContext();
  const { toast } = useToast();
  const addVariantsMutation = useBulkAddVariantsToCart();
  const { data: variants = [] } = useProductVariants(productType as any, productId);
  const { data: variantSettings } = useProductVariantSettings(productType as any, productId);
  const { user } = useAuth();
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
      quantity: product.product_type === "lens" ? 2 : 1,
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
              <div className="mb-6 flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate("/store")}>Back to catalog</Button>
                <Badge variant="outline" className="capitalize">
                  {product.product_type === "supply" ? (SUPPLY_CATEGORY_LABELS[product.category] || product.category) : product.category}
                </Badge>
              </div>

              <Card variant="feature">
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-8 md:grid-cols-[380px_1fr]">
                  {/* Left column: image + description */}
                  <div className="space-y-3">
                    <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-sm text-muted-foreground">No image available</div>
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
                          <img src={product.image_url} alt={`${product.name} expanded`} className="max-h-[75vh] w-full rounded-md object-contain" />
                        </DialogContent>
                      </Dialog>
                    )}

                    {product.description && (
                      <p className="whitespace-normal break-words text-sm text-muted-foreground">{product.description}</p>
                    )}
                  </div>

                  {/* Right column: name, tags, price, cart */}
                  <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>

                    {product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="text-3xl font-bold text-foreground">
                        ${product.sell_price_usd.toFixed(2)}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          {product.product_type === "supply" ? `/${product.subcategory}` : "/pair"}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">USD</div>
                    </div>

                    {product.has_variants && !(product.product_type === "lens" && variants.length > 0) && (
                      <Card className="border-border/70 bg-muted/30">
                        <CardContent className="p-4 text-sm text-foreground">
                          This product requires variant selection before it can be added to the cart.
                        </CardContent>
                      </Card>
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
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <LensChatbot />
    </div>
  );
};

export default StoreProductPage;
