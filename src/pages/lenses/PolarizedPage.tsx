import Header from "@/components/Header";
import Footer from "@/components/Footer";
import polarizedGlareDemo from "@/assets/polarized-glare-demo.svg";
import polarizedFilterAxis from "@/assets/polarized-filter-axis.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ArrowUp,
  Car,
  CheckCircle2,
  Fish,
  GlassWater,
  Layers3,
  Mountain,
  Shield,
  Sun,
  Waves,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SECTIONS = [
  { id: "what-they-are", label: "What They Are", icon: <Sun className="h-4 w-4" /> },
  { id: "how-they-work", label: "How They Work", icon: <Layers3 className="h-4 w-4" /> },
  { id: "best-for", label: "Best For", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "limits", label: "Limits", icon: <XCircle className="h-4 w-4" /> },
  { id: "compare-options", label: "Compare Options", icon: <Shield className="h-4 w-4" /> },
  { id: "faqs", label: "FAQs", icon: <GlassWater className="h-4 w-4" /> },
];

const GLARE_FACTS = [
  {
    title: "Reflected light becomes strongly horizontal",
    body:
      "When sunlight bounces off flat surfaces like roads, water, hoods, and sand, a large share of that reflected light vibrates in a horizontal direction. That is the harsh glare you notice outdoors.",
  },
  {
    title: "A polarized film is aligned like a selective gate",
    body:
      "Inside the lens, the polarizing layer is oriented vertically. It allows more useful vertical light through while blocking much of the horizontally oriented reflected glare.",
  },
  {
    title: "The goal is comfort and contrast, not darkness alone",
    body:
      "A good polarized lens is not just about making everything darker. It reduces distracting glare so edges, textures, road markings, and water surfaces feel cleaner and easier to read.",
  },
];

const USE_CASES = [
  {
    icon: Car,
    title: "Driving",
    body: "Cuts intense road glare, reflections off the bonnet/hood, and bright afternoon light fatigue during long outdoor commutes.",
  },
  {
    icon: Waves,
    title: "Boating & beach",
    body: "Improves comfort near reflective water and bright sand, where ordinary tints can still leave distracting surface glare behind.",
  },
  {
    icon: Fish,
    title: "Fishing & watersports",
    body: "Helps reduce surface reflection so you can better judge movement, texture, and contrast around the waterline.",
  },
  {
    icon: Mountain,
    title: "Everyday outdoor wear",
    body: "Excellent for people who simply spend a lot of time in bright sun and want more relaxed vision than a non-polarized sun tint can deliver.",
  },
];

const LIMITATIONS = [
  "Not ideal for every dashboard, aircraft instrument display, or LCD/LED screen angle because polarization can interact with digital displays.",
  "Usually not the right answer if you want one pair that goes from fully clear indoors to sun protection outdoors — that is where photochromic options may fit better.",
  "Not a substitute for the right prescription or lens design. If your main issue is near work, night driving, or computer fatigue, solve the underlying optical task first.",
  "Does not replace UV protection — quality polarized sun lenses should still deliver full UV blocking as a separate baseline feature.",
];

const COMPARISON = [
  {
    title: "Polarized",
    bestFor: "High-glare outdoor environments",
    strength: "Best reflective glare control",
    tradeoff: "Tinted sunwear, not a clear indoor lens",
    to: "/lenses/polarized",
  },
  {
    title: "Photochromic",
    bestFor: "One-pair indoor/outdoor convenience",
    strength: "Adapts to changing light",
    tradeoff: "Glare control varies and is not the same as a dedicated polarized sun lens",
    to: "/photochromic",
  },
  {
    title: "UV-only sun lens",
    bestFor: "Basic sun protection",
    strength: "Blocks UV and reduces brightness",
    tradeoff: "Can still leave reflected glare from roads, water, and sand",
    to: "/coatings/uv-shield",
  },
];

const FAQS = [
  {
    q: "Are polarized lenses better than ordinary sunglasses?",
    a: "For reflective outdoor glare, usually yes. Both can reduce brightness, but polarized lenses are specifically designed to cut a large share of reflected glare from flat outdoor surfaces.",
  },
  {
    q: "Do polarized lenses make everything darker?",
    a: "They reduce brightness, but the bigger benefit is cleaner contrast and less visual noise. Good polarized lenses feel calmer rather than simply dimmer.",
  },
  {
    q: "Can I wear polarized lenses for driving?",
    a: "Yes — driving is one of the most common and useful applications. They are especially helpful in bright daytime conditions, though some digital dashboard displays may appear different at certain angles.",
  },
  {
    q: "Should I choose polarized or photochromic lenses?",
    a: "Choose polarized when glare is your top problem and you want a dedicated outdoor solution. Choose photochromic when convenience across indoor and outdoor settings matters more than maximum reflected-glare control.",
  },
];

const PolarizedPage = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Lifestyle Lenses</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Polarized Lenses — How They Work and When They Matter Most
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                Polarized lenses are built for bright, reflective conditions. They do more than darken sunlight — they cut the harsh reflected glare that bounces off roads, water, windshields, and sand so outdoor vision feels calmer, sharper, and less fatiguing.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/#contact">Ask About Polarized Options</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/photochromic">
                    Compare With Photochromic <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Primary benefit", value: "Reflective glare control" },
                  { label: "Best environments", value: "Roads, water, sand, bright sun" },
                  { label: "Positioning", value: "Dedicated outdoor lens solution" },
                ].map((item) => (
                  <Card key={item.label} className="border-border/80 bg-card/70">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden border-accent/20 bg-slate-950 shadow-2xl shadow-accent/10">
              <img
                src={polarizedGlareDemo}
                alt="Illustration showing a polarized lens reducing reflected water glare"
                className="h-full w-full object-cover"
              />
            </Card>
          </div>
        </section>

        <nav className="container mx-auto mt-8 max-w-6xl px-4 lg:px-8" aria-label="Polarized lens page sections">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jump to section</p>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {section.icon}
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <div className="container mx-auto max-w-6xl space-y-20 px-4 pt-12 lg:px-8">
          <section id="what-they-are" className="scroll-mt-32">
            <SectionHeading badge="Foundation" title="What polarized lenses actually are" />
            <p className="mt-4 max-w-4xl leading-relaxed text-muted-foreground">
              A polarized lens is a sun lens that contains a special filter layer. That layer is designed to reduce a large share of horizontally oriented reflected light — the kind of light that produces the worst outdoor glare. This makes polarized lenses different from ordinary tinted sunglasses, which reduce brightness but do not target reflected glare in the same way.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {GLARE_FACTS.map((fact) => (
                <Card key={fact.title} className="border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground">{fact.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{fact.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="how-they-work" className="scroll-mt-32">
            <SectionHeading badge="Mechanism" title="How polarization works" />
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <Card className="overflow-hidden border-border bg-gradient-to-br from-sky-50 via-background to-sky-100/70">
                <img
                  src={polarizedFilterAxis}
                  alt="Diagram showing a vertical polarization axis allowing useful light through while blocking horizontal glare"
                  className="w-full object-cover"
                />
              </Card>
              <div className="space-y-4">
                <Card className="border-accent/20 bg-accent/5">
                  <CardContent className="p-5">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Simple explanation</Badge>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Think of a polarized lens as a carefully aligned blind or gate. It is tuned to let more useful light pass while knocking down the light waves that create the most annoying reflected glare outdoors.
                    </p>
                  </CardContent>
                </Card>
                <ul className="space-y-3">
                  {[
                    "Sunlight reflects off flat surfaces and becomes more strongly horizontally polarized.",
                    "A polarized lens uses a vertically aligned filter to block much of that horizontal glare.",
                    "Your result is usually less squinting, stronger contrast, and more relaxed vision in bright outdoor conditions.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section id="best-for" className="scroll-mt-32">
            <SectionHeading badge="Use Cases" title="Who polarized lenses are best for" />
            <p className="mt-4 max-w-4xl leading-relaxed text-muted-foreground">
              Polarized lenses are strongest when the environment itself creates glare. That makes them especially useful in bright coastal, tropical, and road-heavy settings where reflected light becomes a daily comfort problem.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {USE_CASES.map((item) => (
                <Card key={item.title} className="h-full border-border">
                  <CardContent className="p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                      <item.icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-6 border-border bg-muted/30">
              <CardContent className="p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Commercially smart recommendation:</strong> if someone says, “My eyes are fine indoors, but I hate daytime glare when driving or near water,” polarized should move near the top of the shortlist. If they want one pair for all conditions, compare it honestly against photochromic instead of overselling one feature to do every job.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="limits" className="scroll-mt-32">
            <SectionHeading badge="Tradeoffs" title="When polarized lenses are not the best fit" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {LIMITATIONS.map((item) => (
                <Card key={item} className="border-border">
                  <CardContent className="flex items-start gap-3 p-5">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="compare-options" className="scroll-mt-32">
            <SectionHeading badge="Comparison" title="Polarized vs other light-management options" />
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {COMPARISON.map((item) => (
                <Card key={item.title} className={`border-border ${item.title === "Polarized" ? "ring-1 ring-accent/30" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      {item.title === "Polarized" && <Badge variant="secondary">Best for glare</Badge>}
                    </div>
                    <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
                      <div>
                        <dt className="font-medium text-foreground">Best for</dt>
                        <dd>{item.bestFor}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Strength</dt>
                        <dd>{item.strength}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Tradeoff</dt>
                        <dd>{item.tradeoff}</dd>
                      </div>
                    </dl>
                    <Button variant="ghost" className="mt-4 px-0 text-accent hover:text-accent" asChild>
                      <Link to={item.to}>
                        Learn more <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="faqs" className="scroll-mt-32">
            <SectionHeading badge="Decision Support" title="Frequently asked questions" />
            <div className="mt-6 space-y-4">
              {FAQS.map((item) => (
                <Card key={item.q} className="border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground">{item.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator className="my-8" />

            <Card className="border-none bg-primary text-primary-foreground">
              <CardContent className="flex flex-col gap-5 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15">
                    Ready to choose?
                  </Badge>
                  <h3 className="mt-3 text-2xl font-bold">Need help choosing an outdoor lens setup?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-primary-foreground/85">
                    We can help you compare polarized sun lenses, photochromic convenience, UV protection, and lens materials based on how you actually live — driving, beach use, boating, sport, or everyday tropical wear.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="secondary" asChild>
                    <Link to="/#contact">Talk to our team</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link to="/lenses/lens-types">
                      Explore more lens types <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 rounded-full border border-border bg-background p-3 shadow-fab transition-colors hover:bg-muted"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4 text-foreground" />
        </button>
      )}

      <Footer />
    </div>
  );
};

function SectionHeading({ badge, title }: { badge: string; title: string }) {
  return (
    <div>
      <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider">
        {badge}
      </Badge>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

export default PolarizedPage;
