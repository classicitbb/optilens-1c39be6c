import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import Seo from "@/components/seo/Seo";
import {
  Sparkles,
  Shield,
  Glasses,
  Zap,
  Droplets,
  Eye,
  Phone,
  ShoppingCart,
  Package,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

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

const SIZES = [
  {
    label: "1 oz Bottle",
    detail: "Portable retail-ready size. Ideal for dispensing at point of sale or gifting to patients.",
    cta: "Order Individual Units",
    href: "https://www.dynamiclabs.net/products/1-0z-vizionize-ai%E2%84%A2-lens-cleaner",
    external: true,
  },
  {
    label: "Gallon Refill",
    detail: "High-volume refill for practices that want to fill their own spray bottles or dispense in bulk.",
    cta: "Order Gallon Refill",
    href: "https://www.dynamiclabs.net/products/vizionziw-lens-cleaner-refill-gallon",
    external: true,
  },
  {
    label: "2.5 Gallon Cubitainer",
    detail: "Large-format supply for high-volume dispensers, optical labs, and multi-location groups.",
    cta: "Contact for Bulk Pricing",
    href: "/#contact",
    external: false,
  },
];

const VizionizeCleanerPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="VIZIONIZE AI™ Lens Cleaner — Classic Visions"
        description="VIZIONIZE AI™ is the world's first AI-formulated lens cleaner with patent-pending scratch-resistant nanoparticles. Streak-free, safe for smart glasses, AR lenses, and all premium eyewear."
        canonicalPath="/vizionize-cleaner"
      />
      <Header />
      <main className="pb-20 pt-24">

        {/* ── Hero ── */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider">
              New Product
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
              Patent Pending
            </Badge>
          </div>
          <h1 className="mt-4 font-serif text-4xl font-bold text-foreground sm:text-5xl">
            VIZIONIZE AI™<br className="hidden sm:block" /> Lens Cleaner
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            The world's first AI-formulated eyeglass cleaner — engineered with scratch-resistant nanoparticles to
            clean deeper, protect smarter, and keep your lenses performing at their best.
          </p>
          <p className="mt-2 text-base font-medium text-accent">
            Smarter science. Superior protection. Perfect vision.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="hero" size="lg" asChild>
              <a
                href="https://www.dynamiclabs.net/products/1-0z-vizionize-ai%E2%84%A2-lens-cleaner"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Buy Now
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://www.dynamiclabs.net/collections/vizionize-ai-cleaners-cloths"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Package className="mr-2 h-5 w-5" />
                Order in Bulk
              </a>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link to="/#contact">
                <Phone className="mr-2 h-5 w-5" />
                Call Us
              </Link>
            </Button>
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
                <p className="font-serif text-xl font-semibold leading-snug">
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
            <p className="mt-1 text-muted-foreground">Individual retail bottles to high-volume cubitainers — we have the right option for your practice.</p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {SIZES.map((s) => (
                <Card key={s.label} className="border-border bg-background">
                  <CardContent className="flex flex-col gap-3 p-6">
                    <h3 className="text-lg font-bold text-foreground">{s.label}</h3>
                    <p className="flex-1 text-sm text-muted-foreground">{s.detail}</p>
                    <Button variant="secondary" className="mt-2 w-full" asChild>
                      {s.external ? (
                        <a href={s.href} target="_blank" rel="noopener noreferrer">
                          {s.cta} <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      ) : (
                        <Link to={s.href}>
                          {s.cta} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
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
                  Order individual bottles for your dispensary, buy in bulk for your practice, or call us to
                  discuss distributor and wholesale pricing.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
                <Button
                  variant="secondary"
                  asChild
                >
                  <a
                    href="https://www.dynamiclabs.net/products/1-0z-vizionize-ai%E2%84%A2-lens-cleaner"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Now
                  </a>
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
                  asChild
                >
                  <Link to="/#contact">
                    <Phone className="mr-2 h-4 w-4" />
                    Call Us
                  </Link>
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
