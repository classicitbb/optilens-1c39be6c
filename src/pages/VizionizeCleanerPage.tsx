import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VizionizeHeroBackground from "@/components/VizionizeHeroBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { Link, useNavigate } from "react-router";
import Seo from "@/components/seo/Seo";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createAuthHref } from "@/lib/authFlow";
import {
  Sparkles,
  Shield,
  Glasses,
  Zap,
  Droplets,
  Eye,
  MessageSquare,
  ShoppingCart,
  Package,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// Stable product ID matching the supplier SKU
const VIZIONIZE_CART_PRODUCT = {
  id: 2817200,
  name: "VIZIONIZE AI™ Lens Cleaner (1 oz)",
  price: 1.54,
  productType: "supply" as const,
  quantity: 1,
};

const CONTACT_PRELOAD_MSG =
  "Hi, I'm interested in ordering the VIZIONIZE AI™ Lens Cleaner. Please send me information about pricing and availability.";

const FEATURES = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Streak-Free Clarity",
    text: "Leaves zero residue behind — just pure, uninterrupted vision every single time.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Scratch-Resistant Formula",
    text: "Patent-pending nanoparticles actively protect lenses from daily micro-abrasion as you clean.",
  },
  {
    icon: <Glasses className="h-5 w-5" />,
    title: "Safe for AR & Smart Lenses",
    text: "Engineered specifically for AR-coated lenses, smart glasses, and premium specialty eyewear.",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Sensor-Friendly Cleaning",
    text: "Safe for lenses with embedded sensors and electronics — no interference, no damage.",
  },
  {
    icon: <Droplets className="h-5 w-5" />,
    title: "Removes Oils & Contaminants",
    text: "Lifts fingerprints, skin oils, dust, and environmental residue without harsh solvents.",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Works on All Eyewear",
    text: "From everyday prescription frames to luxury and sports optics — one formula handles everything.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: <Shield className="h-6 w-6" />,
    name: "AI-Driven Chemistry",
    description:
      "The formula was developed using AI-assisted chemistry modelling to optimise cleaning performance while preserving sensitive optical coatings.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    name: "Nanoparticle Technology",
    description:
      "Scratch-resistant nanoparticles suspended in the solution deposit a micro-thin protective layer during each clean, building long-term resilience.",
  },
  {
    icon: <Droplets className="h-6 w-6" />,
    name: "Surfactant Lift Action",
    description:
      "Advanced surfactants break the bond between oils, fingerprints, and the lens surface so contaminants lift away cleanly without smearing.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    name: "Electronics-Safe pH Balance",
    description:
      "Carefully balanced pH ensures the solution is non-corrosive to lens electronics, coatings, and frame materials.",
  },
];

const COMPATIBLE_WITH = [
  "Smart glasses & AR-enabled frames",
  "Anti-reflective coated lenses",
  "Blue-light filter lenses",
  "Photochromic lenses",
  "Polarised lenses",
  "High-index lenses",
  "Luxury & premium eyewear",
  "Standard prescription glasses",
  "Reading glasses",
  "Sports & safety eyewear",
];

const VizionizeCleanerPage = () => {
  const { addToCart } = useCartContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  /** If not signed in, send the user to sign-up and return here after. */
  const handleAddToCart = async () => {
    if (!user) {
      navigate(
        createAuthHref({ mode: "signup", redirect: "/vizionize-cleaner" })
      );
      return;
    }
    await addToCart(VIZIONIZE_CART_PRODUCT);
    toast({
      title: "Added to cart",
      description: "VIZIONIZE AI™ Lens Cleaner (1 oz) is in your cart.",
      action: (
        <ToastAction altText="View cart" asChild>
          <Link to="/checkout">View Cart</Link>
        </ToastAction>
      ),
    });
  };

  const handleContactUs = () => {
    const params = new URLSearchParams({ msg: CONTACT_PRELOAD_MSG });
    navigate(`/?${params.toString()}#contact`);
    setTimeout(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="VIZIONIZE AI™ Lens Cleaner — Classic Visions"
        description="VIZIONIZE AI™ is the world's first AI-formulated lens cleaner with patent-pending scratch-resistant nanoparticles. Streak-free, safe for smart glasses, AR lenses, and all premium eyewear."
        canonicalPath="/vizionize-cleaner"
      />
      <Header />
      <main className="pb-20 pt-24">

        {/* ── Hero (with animated background) ── */}
        <section className="relative overflow-hidden bg-primary py-16 lg:py-24">
          {/* Animated backdrop — matrix rain + cubes + robots */}
          <VizionizeHeroBackground />

          {/* Foreground content */}
          <div className="relative z-10 container mx-auto max-w-6xl px-4 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Text */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-accent text-accent-foreground text-xs font-semibold uppercase tracking-wider">
                    New Product
                  </Badge>
                  <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground text-xs font-semibold uppercase tracking-wider">
                    Patent Pending
                  </Badge>
                </div>
                <h1 className="mt-4 text-4xl font-bold text-primary-foreground sm:text-5xl">
                  VIZIONIZE AI™<br className="hidden sm:block" /> Lens Cleaner
                </h1>
                <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
                  The world's first AI-formulated eyeglass cleaner — engineered with scratch-resistant nanoparticles to
                  clean deeper, protect smarter, and keep your lenses performing at their best.
                </p>
                <p className="mt-2 text-base font-medium text-accent">
                  Smarter science. Superior protection. Perfect vision.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="hero" size="lg" onClick={handleAddToCart}>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Buy Now
                  </Button>
                  <Button
                    size="lg"
                    className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                    variant="outline"
                    asChild
                  >
                    <a
                      href="https://www.dynamiclabs.net/collections/vizionize-ai-cleaners-cloths"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Package className="mr-2 h-5 w-5" />
                      Order in Bulk
                    </a>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={handleContactUs}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Contact Us
                  </Button>
                </div>
              </div>

              {/* Product image */}
              <div className="flex items-center justify-center lg:justify-end">
                <div className="relative flex h-80 w-80 items-center justify-center rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 shadow-soft backdrop-blur-sm">
                  <img
                    src="https://dynamiclabs.net/cdn/shop/files/1oznewnew.png"
                    alt="VIZIONIZE AI™ 1 oz Lens Cleaner bottle"
                    className="max-h-64 w-auto object-contain drop-shadow-2xl"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Features ── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Advanced Protection. Superior Performance.</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            VIZIONIZE AI™ goes beyond traditional cleaning — it defends your lenses every time you use it.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">What Makes It Different</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Decades of lens cleaners relied on the same basic chemistry. VIZIONIZE AI™ was built from scratch
              using AI-assisted formulation — purpose-built for modern, high-performance eyewear.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((item) => (
                <Card key={item.name} className="border-border bg-background">
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {item.icon}
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compatible With ── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground">One Formula. Every Lens.</h2>
              <p className="mt-2 text-muted-foreground">
                Whether you're cleaning everyday readers or the latest smart glasses, VIZIONIZE AI™ is safe and
                effective across the full spectrum of modern eyewear.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {COMPATIBLE_WITH.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Card className="border-border bg-primary text-primary-foreground">
              <CardContent className="flex flex-col gap-4 p-8">
                <p className="text-xl font-semibold leading-snug">
                  "Lens cleaners have remained virtually unchanged for decades — until now."
                </p>
                <p className="text-sm text-primary-foreground/80">
                  VIZIONIZE AI™ is the first and only lens cleaner created using AI-driven chemistry. Its
                  patent-pending formula protects delicate coatings, embedded electronics, and all modern lens
                  technologies.
                </p>
                <div className="mt-2 flex flex-col gap-1 text-sm font-medium text-primary-foreground/90">
                  <span>✦ &nbsp;First AI-formulated lens cleaner</span>
                  <span>✦ &nbsp;Patent-pending scratch-resistant technology</span>
                  <span>✦ &nbsp;Designed for next-generation smart eyewear</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Available Sizes ── */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">Available Sizes</h2>
            <p className="mt-1 text-muted-foreground">
              Individual retail bottles to high-volume cubitainers — we have the right option for your practice.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {/* 1 oz — add to cart */}
              <Card className="border-border bg-background">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex h-20 items-center justify-center">
                    <img
                      src="https://dynamiclabs.net/cdn/shop/files/1oznewnew.png"
                      alt="1 oz VIZIONIZE AI bottle"
                      className="max-h-20 w-auto object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">1 oz Bottle</h3>
                  <p className="flex-1 text-sm text-muted-foreground">
                    Portable retail-ready size. Ideal for dispensing at point of sale or gifting to patients.
                  </p>
                  <Button variant="secondary" className="mt-2 w-full" onClick={handleAddToCart}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>

              {/* Gallon — go to product page */}
              <Card className="border-border bg-background">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex h-20 items-center justify-center">
                    <img
                      src="https://eyeglasssupplystore.com/cdn/shop/files/vizionizeaigallonnewfinal_2.png"
                      alt="Gallon VIZIONIZE AI refill"
                      className="max-h-20 w-auto object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Gallon Refill</h3>
                  <p className="flex-1 text-sm text-muted-foreground">
                    High-volume refill for practices that want to fill their own spray bottles or dispense in bulk.
                  </p>
                  <Button variant="secondary" className="mt-2 w-full" asChild>
                    <a
                      href="https://www.dynamiclabs.net/products/vizionziw-lens-cleaner-refill-gallon"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Order Gallon Refill <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* 2.5 Gallon — contact us */}
              <Card className="border-border bg-background">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex h-20 items-center justify-center rounded-lg bg-muted/60">
                    <Package className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">2.5 Gallon Cubitainer</h3>
                  <p className="flex-1 text-sm text-muted-foreground">
                    Large-format supply for high-volume dispensers, optical labs, and multi-location groups.
                  </p>
                  <Button variant="secondary" className="mt-2 w-full" onClick={handleContactUs}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact for Bulk Pricing
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold">Ready to Defend Your Lens?</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Order individual bottles for your dispensary, buy in bulk for your practice, or contact us to
                  discuss distributor and wholesale pricing.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
                <Button variant="secondary" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy Now
                </Button>
                <Button
                  variant="outline"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <a
                    href="https://www.dynamiclabs.net/collections/vizionize-ai-cleaners-cloths"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Order in Bulk
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={handleContactUs}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default VizionizeCleanerPage;
