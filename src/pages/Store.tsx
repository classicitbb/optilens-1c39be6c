import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, LayoutGrid, List, Lock, Settings, Plus, Minus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useStoreProducts,
  StoreProduct,
  getStableStoreProductCartId,
  getStoreProductRoute,
} from "@/hooks/useStoreProducts";
import { useTradePricing } from "@/hooks/useTradePricing";
import { getProductHubRoute } from "@/lib/productLinks";
import { createAuthHref } from "@/lib/authFlow";
import StoreProductImage from "@/components/StoreProductImage";
import QuantityInput from "@/components/cart/QuantityInput";

const SUPPLY_CATEGORY_LABELS: Record<string, string> = {
  lab: "Lab Supplies",
  optical: "Optical Supplies",
  accessories: "Eyewear Accessories",
};

type ProductLayout = "grid" | "list";
type SortMode = "name" | "price_low_high" | "price_high_low";

const ProductCard = ({
  product,
  layout,
  isTradeCustomer,
}: {
  product: StoreProduct;
  layout: ProductLayout;
  isTradeCustomer: boolean;
}) => {
  const { items, addToCart, updateQuantity, removeFromCart } = useCartContext();
  const { user } = useAuth();
  const { canEdit } = useUserRole();
  const navigate = useNavigate();

  const cartId = getStableStoreProductCartId(product);
  const cartLines = items.filter((i) => i.product_id === cartId && i.product_type === product.product_type);
  const inCartQty = cartLines.reduce((sum, i) => sum + i.quantity, 0);
  // Simple products with a single cart line get an inline stepper; variant products just show a count.
  const stepperLine = !product.has_variants && cartLines.length === 1 ? cartLines[0] : null;

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
      quantity: 1,
      priceUnit: product.product_type === "lens" ? "pair" : undefined,
    });
  };

  const list = layout === "list";
  const category = product.product_type === "supply" ? SUPPLY_CATEGORY_LABELS[product.category] || product.category : product.category;
  const priceUnit = product.product_type === "lens" ? "pair" : product.product_type === "addon" ? "service" : "unit";
  const manageButton = (size: 8 | 11) => (
    <Button variant="outline" size="icon" className={`shrink-0 ${size === 8 ? "h-8 w-8" : "h-11 w-11"}`} asChild>
      <Link to={getProductHubRoute(product.product_type, product.id)} aria-label={`Manage ${product.name}`}><Settings className="h-4 w-4" /></Link>
    </Button>
  );
  const actions = user ? <>
    <div className={`flex ${list ? "flex-col-reverse items-start gap-0.5" : "mb-4 items-end justify-between gap-3"}`}>
      <p className={`font-semibold tabular-nums text-foreground ${list ? "text-xl" : "text-2xl"}`}>${product.sell_price_usd.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">USD / {priceUnit}</span></p>
      {isTradeCustomer && <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Trade price</span>}
    </div>
    <div className={`flex gap-2 ${list ? "sm:w-56 lg:w-full" : "border-t border-border/60 pt-4"}`}>
      {stepperLine ? (
        <div className="flex min-h-11 flex-1 items-center justify-between rounded-lg border-2 border-accent bg-accent/10 px-1" role="group" aria-label={`${product.name} quantity in cart`}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={stepperLine.quantity <= 1 ? `Remove ${product.name} from cart` : `Decrease quantity of ${product.name}`}
            onClick={() => (stepperLine.quantity <= 1 ? removeFromCart(stepperLine.id) : updateQuantity(stepperLine.id, stepperLine.quantity - 1))}
          >
            {stepperLine.quantity <= 1 ? <Trash2 className="h-4 w-4" aria-hidden="true" /> : <Minus className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <QuantityInput quantity={stepperLine.quantity} onCommit={(q) => updateQuantity(stepperLine.id, q)} aria-label={`Quantity of ${product.name} in cart`} />
            <span className="font-normal text-muted-foreground">in cart</span>
          </span>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Increase quantity of ${product.name}`} onClick={() => updateQuantity(stepperLine.id, stepperLine.quantity + 1)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button variant="hero" className="min-h-11 flex-1" onClick={handleAdd} aria-label={`${product.has_variants ? "Choose options for" : "Add to cart:"} ${product.name}${inCartQty > 0 ? ` (${inCartQty} in cart)` : ""}`}>
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />{product.has_variants ? "Choose options" : "Add to cart"}
          {inCartQty > 0 && <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold tabular-nums">{inCartQty} in cart</span>}
        </Button>
      )}
      {canEdit && !list && manageButton(11)}
    </div>
  </> : <div className={list ? "space-y-3 sm:flex sm:w-full sm:items-center sm:justify-between sm:gap-3 sm:space-y-0 lg:block lg:space-y-3" : "space-y-3 border-t border-border/60 pt-4"}>
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Sign in for pricing</p>
    <Button variant="outline" className={`min-h-11 w-full ${list ? "sm:w-56 lg:w-full" : ""}`} asChild><Link to={createAuthHref({ mode: "signin", audience: "professional", intent: "products", redirect: getStoreProductRoute(product) })}>Sign in to order</Link></Button>
  </div>;

  return (
    <Card className={`group overflow-hidden border-border/70 bg-card shadow-sm transition-shadow hover:shadow-lg ${list ? "grid sm:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)_15rem]" : "flex h-full flex-col"}`}>
      <Link to={getStoreProductRoute(product)} className={`block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary ${list ? "sm:self-start" : ""}`} aria-label={`View ${product.name}`}>
        <StoreProductImage imageUrl={product.image_url} name={product.name} productType={product.product_type} category={product.category} className="aspect-[3/2] w-full" showCaption={!list} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium capitalize text-secondary">{category}</span>
          {product.has_variants && <span className="rounded-full border border-border px-2 py-0.5">Choose options</span>}
          {list && canEdit && <span className="ml-auto">{manageButton(8)}</span>}
        </div>
        <h3 className="text-lg font-semibold leading-snug text-foreground">
          <Link to={getStoreProductRoute(product)} className="rounded-sm hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">{product.name}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>)}
        </div>
        {!list && <div className="mt-auto pt-5">{actions}</div>}
      </div>
      {list && <div className="flex flex-col justify-center gap-3 border-t border-border/60 p-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-1 lg:flex-col lg:items-stretch lg:justify-center lg:border-l lg:border-t-0">{actions}</div>}
    </Card>
  );
};

const Store = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";
  const initialCategory = searchParams.get("category") || "";
  const [searchTerm, setSearchTerm] = useState(initialCategory ? "" : "");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [layout, setLayout] = useState<ProductLayout>("grid");

  const { tradePricing, customerId: tradeCustomerId, isTradeCustomer } = useTradePricing();
  const { data: products, isLoading, isError, refetch } = useStoreProducts(tradePricing, tradeCustomerId);

  const tabOf = (p: StoreProduct) => (p.product_type === "lens" ? "lenses" : p.product_type === "supply" ? "supplies" : "services");

  const searched = useMemo(() => {
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

    return (products || []).filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        !categorySlug ||
        (aliasedType
          ? p.product_type === aliasedType
          : p.category.toLowerCase() === categorySlug ||
            p.subcategory.toLowerCase() === categorySlug ||
            p.tags.some((t) => t.toLowerCase() === categorySlug));

      return matchesSearch && matchesCategory;
    });
  }, [initialCategory, products, searchTerm]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: searched.length, lenses: 0, supplies: 0, services: 0 };
    searched.forEach((p) => { counts[tabOf(p)] += 1; });
    return counts;
  }, [searched]);

  const filtered = useMemo(() => {
    const result = activeTab === "all" ? searched : searched.filter((p) => tabOf(p) === activeTab);
    return [...result].sort((a, b) =>
      sortMode === "name" ? a.name.localeCompare(b.name) : sortMode === "price_low_high" ? a.sell_price_usd - b.sell_price_usd : b.sell_price_usd - a.sell_price_usd,
    );
  }, [activeTab, searched, sortMode]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    if (tab !== "all") params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Wholesale Lens & Optical Supply Catalog | Classic Visions"
        description="Browse Classic Visions' wholesale catalog of prescription lenses, coatings, lab supplies and optical accessories for eye care professionals in Barbados and the Caribbean."
        canonicalPath="/store"
      />
      <Header />

      <main id="main-content" className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-6 rounded-2xl border border-border/60 bg-card p-6 sm:p-9 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Classic Visions · Wholesale catalog</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Lenses, supplies and lab services</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">Stock lenses, optical supplies and lab services for eye care professionals. Pick a category or search by product name.</p>
            </div>
            <Button variant="outline" className="min-h-11 shrink-0" asChild><Link to="/cart"><ShoppingCart className="h-4 w-4" aria-hidden="true" />View your cart</Link></Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
            <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-soft">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <TabsList className="h-auto flex-wrap justify-start">
                  {([["all", "All Products"], ["lenses", "Lenses"], ["supplies", "Supplies"], ["services", "Services"]] as const).map(([value, label]) => (
                    <TabsTrigger key={value} value={value}>
                      {label}
                      {!isLoading && <span className="ml-1.5 tabular-nums text-muted-foreground">{tabCounts[value]}</span>}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search lenses, supplies or services…"
                    aria-label="Search products"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 pl-10 text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <select aria-label="Sort products" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
                    <option value="name">Name: A–Z</option><option value="price_low_high">Price: low to high</option><option value="price_high_low">Price: high to low</option>
                  </select>

                  <div className="inline-flex items-center rounded-md border bg-background p-1">
                    <Button
                      type="button"
                      variant={layout === "grid" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setLayout("grid")}
                      aria-label="Grid view"
                      aria-pressed={layout === "grid"}
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
                      aria-pressed={layout === "list"}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <span className="sr-only" aria-live="polite">{isLoading ? "Loading products…" : `${filtered.length} products`}</span>
            <div className="flex justify-end py-2 empty:hidden">
              {(searchTerm || initialCategory) && <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); handleTabChange(activeTab); }}>Clear filters</Button>}
            </div>
            {isError ? <div role="alert" className="rounded-xl border border-border p-8 text-center"><p>Products could not be loaded. Please try again.</p><Button className="mt-4" onClick={() => void refetch()}>Try again</Button></div> : isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                <TabsContent value={activeTab} className="mt-6">
                  <h2 className="sr-only">Product listings</h2>
                  <div className={layout === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {filtered.map((product) => (
                      <ProductCard
                        key={`${product.product_type}:${product.id}`}
                        product={product}
                        layout={layout}
                        isTradeCustomer={isTradeCustomer}
                      />
                    ))}
                  </div>
                  {filtered.length === 0 && (
                    <div className="py-16 text-center">
                      <p className="text-lg font-medium text-foreground">No products match your search.</p><p className="mt-2 text-sm text-muted-foreground">Try a product name or choose another category.</p><Button variant="outline" className="mt-5" onClick={() => { setSearchTerm(""); handleTabChange("all"); }}>Show all products</Button>
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Store;
