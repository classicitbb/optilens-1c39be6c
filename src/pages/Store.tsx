import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Eye, Expand, ArrowDownUp, LayoutGrid, List } from "lucide-react";
import { useMemo, useState } from "react";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { LensChatbot } from "@/components/LensChatbot";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStoreProducts, StoreProduct, getStableStoreProductCartId, getStoreProductRoute } from "@/hooks/useStoreProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAuthHref } from "@/lib/authFlow";
import StorageImage from "@/components/StorageImage";

const SUPPLY_CATEGORY_LABELS: Record<string, string> = {
  lab: "Lab Supplies",
  optical: "Optical Supplies",
  accessories: "Eyewear Accessories",
};

type ProductLayout = "grid" | "list";
type SortMode = "price_low_high" | "price_high_low";

const ProductCard = ({ product, index, layout }: { product: StoreProduct; index: number; layout: ProductLayout }) => {
  const { addToCart } = useCartContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAdd = () => {
    if (product.has_variants) {
      navigate(getStoreProductRoute(product));
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

  if (layout === "list") {
    return (
      <Card
        variant="feature"
        className="opacity-0 animate-fade-in"
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium capitalize text-accent">
                {product.product_type === "supply" ? (SUPPLY_CATEGORY_LABELS[product.category] || product.category) : product.category}
              </span>
              {product.subcategory ? (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{product.subcategory}</span>
              ) : null}
              {product.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground">{tag}</span>
              ))}
            </div>
            <h3 className="text-lg font-semibold leading-snug text-foreground">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </div>
          {user ? (
            <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[240px]">
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-2xl font-bold text-foreground">
                  ${product.sell_price_usd.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">{product.product_type === "supply" ? "/unit" : "/pair"}</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">USD</span>
              </div>
              <div className="flex gap-2">
                <Button variant="hero" size="sm" className="flex-1" onClick={handleAdd}>
                  <ShoppingCart className="h-4 w-4" />
                  {product.has_variants ? "Configure" : "Add to Cart"}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={getStoreProductRoute(product)}>
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-3 md:w-auto md:min-w-[260px]">
              <div className="text-2xl font-bold text-foreground">
                ${product.sell_price_usd.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">{product.product_type === "supply" ? "/unit" : "/pair"}</span>
              </div>
              <Button variant="hero" size="sm" asChild>
                <Link to={createAuthHref({ mode: "signup", audience: "professional", intent: "products", redirect: "/store" })}>Create Trade Account</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="feature" className="opacity-0 animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
      <CardHeader className="gap-4 pb-2">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium capitalize text-accent">
            {product.product_type === "supply" ? (SUPPLY_CATEGORY_LABELS[product.category] || product.category) : product.category}
          </span>
          {product.subcategory && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {product.subcategory}
            </span>
          )}
        </div>
        <div className="grid grid-cols-[1fr_92px] gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg leading-snug break-words">{product.name}</CardTitle>
            <CardDescription className="whitespace-normal break-words">{product.description}</CardDescription>
          </div>
          <div className="relative h-[92px] w-[92px] overflow-hidden rounded-md border border-border/50 bg-muted/30">
            {product.image_url ? (
              <StorageImage src={product.image_url} alt={`${product.name} thumbnail`} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No image</div>
            )}
            {product.image_url && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-1 right-1 h-6 w-6"
                    aria-label={`Expand image for ${product.name}`}
                  >
                    <Expand className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                  </DialogHeader>
                  <StorageImage src={product.image_url} alt={`${product.name} large preview`} className="max-h-[70vh] w-full rounded-md object-contain" />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="h-1 w-1 rounded-full bg-accent" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        {user ? (
          <>
            <div className="text-2xl font-bold text-foreground">
              ${product.sell_price_usd.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">
                {product.product_type === "supply" ? "/unit" : "/pair"}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">USD</span>
            <Button variant="hero" size="sm" onClick={handleAdd}>
              <ShoppingCart className="h-4 w-4" />
              {product.has_variants ? "Configure" : "Add to Cart"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={getStoreProductRoute(product)}>
                <Eye className="h-4 w-4" />
                View
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex w-full items-center justify-between">
            <div className="text-2xl font-bold text-foreground">
              ${product.sell_price_usd.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">
                {product.product_type === "supply" ? "/unit" : "/pair"}
              </span>
            </div>
            <Button variant="hero" size="sm" asChild>
              <Link to={createAuthHref({ mode: "signup", audience: "professional", intent: "products", redirect: "/store" })}>Create Trade Account</Link>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

const Store = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";
  const initialCategory = searchParams.get("category") || "";
  const [searchTerm, setSearchTerm] = useState(initialCategory ? "" : "");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sortMode, setSortMode] = useState<SortMode>("price_low_high");
  const [layout, setLayout] = useState<ProductLayout>("grid");

  const { data: products, isLoading } = useStoreProducts();

  const filtered = useMemo(() => {
    const categorySlug = initialCategory.toLowerCase();
    // Map landing-page collection slugs to product_type so we never render an empty store.
    const categoryToProductType: Record<string, StoreProduct["product_type"]> = {
      surfaced: "lens",
      finished: "lens",
      lab: "supply",
      optical: "supply",
      accessories: "supply",
      services: "addon",
    };
    const aliasedType = categoryToProductType[categorySlug];

    const result = (products || []).filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "lenses" && p.product_type === "lens") ||
        (activeTab === "supplies" && p.product_type === "supply") ||
        (activeTab === "services" && p.product_type === "addon");

      const matchesCategory =
        !categorySlug ||
        (aliasedType ? p.product_type === aliasedType : (
          p.category.toLowerCase() === categorySlug ||
          p.subcategory.toLowerCase() === categorySlug ||
          p.tags.some((t) => t.toLowerCase() === categorySlug)
        ));

      return matchesSearch && matchesTab && matchesCategory;
    });

    return [...result].sort((a, b) => (
      sortMode === "price_low_high"
        ? a.sell_price_usd - b.sell_price_usd
        : b.sell_price_usd - a.sell_price_usd
    ));
  }, [activeTab, initialCategory, products, searchTerm, sortMode]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    if (tab !== "all") params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">Product Catalog</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Browse premium lenses, optical supplies, and service packages in one storefront.
              Configure variants, then place your order for admin review and fulfilment.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
            <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-soft">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <TabsList>
                <TabsTrigger value="all">All Products</TabsTrigger>
                <TabsTrigger value="lenses">Lenses</TabsTrigger>
                <TabsTrigger value="supplies">Supplies</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="inline-flex items-center rounded-md border bg-background p-1">
                    <Button
                      type="button"
                      variant={sortMode === "price_low_high" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setSortMode("price_low_high")}
                      aria-label="Sort by price low to high"
                    >
                      <ArrowDownUp className="h-3.5 w-3.5" />
                      Price ↑
                    </Button>
                    <Button
                      type="button"
                      variant={sortMode === "price_high_low" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setSortMode("price_high_low")}
                      aria-label="Sort by price high to low"
                    >
                      <ArrowDownUp className="h-3.5 w-3.5" />
                      Price ↓
                    </Button>
                  </div>

                  <div className="inline-flex items-center rounded-md border bg-background p-1">
                    <Button
                      type="button"
                      variant={layout === "grid" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setLayout("grid")}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={layout === "list" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setLayout("list")}
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                <TabsContent value={activeTab}>
                  <div className={layout === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {filtered.map((product, index) => (
                      <ProductCard key={`${product.product_type}:${product.id}`} product={product} index={index} layout={layout} />
                    ))}
                  </div>
                  {filtered.length === 0 && (
                    <div className="py-16 text-center">
                      <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </main>

      <Footer />
      <LensChatbot />
    </div>
  );
};

export default Store;
