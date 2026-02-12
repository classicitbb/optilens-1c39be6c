import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Filter, Search, Eye } from "lucide-react";
import { useState } from "react";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { LensChatbot } from "@/components/LensChatbot";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
const lensProducts = [
  {
    id: 1,
    name: "CR-39 Single Vision",
    category: "finished",
    material: "CR-39",
    type: "Single Vision",
    price: 12.50,
    description: "Standard finished single vision lens with excellent optical clarity.",
    features: ["1.50 index", "UV protection", "Scratch-resistant"],
  },
  {
    id: 2,
    name: "Polycarbonate Single Vision",
    category: "finished",
    material: "Polycarbonate",
    type: "Single Vision",
    price: 18.00,
    description: "Impact-resistant finished lens ideal for safety applications.",
    features: ["1.59 index", "Impact resistant", "UV protection"],
  },
  {
    id: 3,
    name: "High-Index 1.67 SV",
    category: "surfaced",
    material: "High-Index",
    type: "Single Vision",
    price: 45.00,
    description: "Thin and lightweight surfaced lens for higher prescriptions.",
    features: ["1.67 index", "Aspheric design", "AR coating ready"],
  },
  {
    id: 4,
    name: "Progressive Digital FreeForm",
    category: "surfaced",
    material: "CR-39",
    type: "Progressive",
    price: 85.00,
    description: "Premium digital progressive with wide reading zone.",
    features: ["FreeForm technology", "Custom corridors", "HD optics"],
  },
  {
    id: 5,
    name: "Bifocal FT-28",
    category: "finished",
    material: "CR-39",
    type: "Bifocal",
    price: 22.00,
    description: "Classic flat-top bifocal with 28mm segment.",
    features: ["28mm segment", "Clear demarcation", "Easy adaptation"],
  },
  {
    id: 6,
    name: "Photochromic SV",
    category: "surfaced",
    material: "Polycarbonate",
    type: "Single Vision",
    price: 55.00,
    description: "Light-adaptive lens that darkens in sunlight.",
    features: ["Transitions technology", "UV protection", "All conditions"],
  },
];

const Store = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { addToCart } = useCartContext();
  const { user } = useAuth();

  const filteredProducts = lensProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesType = typeFilter === "all" || product.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleAddToCart = (product: typeof lensProducts[0]) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Page Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">Lens Catalog</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Browse our comprehensive selection of premium prescription lenses. 
              Quality optics at wholesale prices.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex flex-col gap-4 rounded-xl bg-card p-4 shadow-soft md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search lenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="surfaced">Surfaced</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <Eye className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Single Vision">Single Vision</SelectItem>
                  <SelectItem value="Bifocal">Bifocal</SelectItem>
                  <SelectItem value="Progressive">Progressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id} 
                variant="feature"
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium capitalize text-accent">
                      {product.category}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {product.type}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-1 w-1 rounded-full bg-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  {user ? (
                    <>
                      <div className="text-2xl font-bold text-foreground">
                        ${product.price.toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">/lens</span>
                      </div>
                      <Button variant="hero" size="sm" onClick={() => handleAddToCart(product)}>
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
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <LensChatbot />
    </div>
  );
};

export default Store;
