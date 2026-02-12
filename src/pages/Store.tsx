import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Eye } from "lucide-react";
import { useState } from "react";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { LensChatbot } from "@/components/LensChatbot";
import { Link, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStoreProducts, StoreProduct } from "@/hooks/useStoreProducts";

const SUPPLY_CATEGORY_LABELS: Record<string, string> = {
  lab: "Lab Supplies",
  optical: "Optical Supplies",
  accessories: "Eyewear Accessories",
};

const ProductCard = ({ product, index }: { product: StoreProduct; index: number }) => {
  const { addToCart } = useCartContext();
  const { user } = useAuth();

  const handleAdd = () => {
    addToCart({
      id: Math.abs(product.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)), // stable numeric id from uuid
      name: product.name,
      price: product.sell_price,
    });
  };

  return (
    <Card
      variant="feature"
      className="opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardHeader>
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
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
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
      <CardFooter className="flex items-center justify-between">
        {user ? (
          <>
            <div className="text-2xl font-bold text-foreground">
              ${product.sell_price.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">
                {product.product_type === "supply" ? `/${product.subcategory}` : "/lens"}
              </span>
            </div>
            <Button variant="hero" size="sm" onClick={handleAdd}>
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          </>
        ) : (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Sign up to see prices</span>
            </div>
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">Sign Up</Link>
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

  const { data: products, isLoading } = useStoreProducts();

  const filtered = (products || []).filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "lenses" && p.product_type === "lens") ||
      (activeTab === "supplies" && p.product_type === "supply");

    const matchesCategory =
      !initialCategory ||
      p.category.toLowerCase() === initialCategory.toLowerCase();

    return matchesSearch && matchesTab && matchesCategory;
  });

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
              Browse our comprehensive selection of premium lenses and optical supplies.
              Quality products at wholesale prices.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
            <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-soft md:flex-row md:items-center">
              <TabsList>
                <TabsTrigger value="all">All Products</TabsTrigger>
                <TabsTrigger value="lenses">Lenses</TabsTrigger>
                <TabsTrigger value="supplies">Supplies</TabsTrigger>
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
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                <TabsContent value={activeTab}>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} />
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
