import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import {
  Shield,
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  Briefcase,
  Users,
  Baby,
  Glasses,
} from "lucide-react";

const BENEFITS = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Surface Hardening",
    text: "Adds a hardened surface layer that significantly reduces micro-scratches from normal use, cleaning, and everyday handling.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Extended Lens Life",
    text: "Supports longer-lasting optical clarity by protecting lens surfaces from abrasive dust and cleaning contact.",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "AR Foundation Layer",
    text: "Acts as the critical foundation layer that premium AR systems bond to for better overall stack performance and durability.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Universal Application",
    text: "Recommended across clear, sun, digital-use, and specialty prescriptions as a baseline protection standard.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: <Layers className="h-6 w-6" />,
    name: "Hard Coat Chemistry",
    description: "A thin, transparent layer of hardened material (typically silicone-based) is applied to both lens surfaces, creating a barrier against abrasion.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    name: "Micro-Scratch Defense",
    description: "The coating increases surface hardness by up to 3× compared to uncoated lenses, dramatically reducing the impact of fine particles during wiping.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    name: "Bonding Platform",
    description: "Premium AR, hydrophobic, and oleophobic layers require a stable hard-coat base to adhere properly and perform at their designed specifications.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    name: "Long-Term Clarity",
    description: "By minimizing accumulated surface damage, hard coat preserves the optical transparency and visual performance of the lens over its entire lifespan.",
  },
];

const IDEAL_WEARERS = [
  {
    icon: <Briefcase className="h-6 w-6" />,
    label: "Everyday Wearers",
    description: "Anyone who wears glasses daily and wants to protect their investment from routine handling and cleaning wear.",
  },
  {
    icon: <Baby className="h-6 w-6" />,
    label: "Children & Active Users",
    description: "Young wearers and active patients whose lenses face more physical handling and environmental exposure.",
  },
  {
    icon: <Glasses className="h-6 w-6" />,
    label: "High-Index Lens Wearers",
    description: "Higher-index materials are softer and more scratch-prone, making hard coat especially valuable.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    label: "Multi-Pair Owners",
    description: "Patients with dedicated reading, computer, or sport pairs that may not always receive careful handling.",
  },
];

const ScratchResistantPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-24">
        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Everyday Protection</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">Scratch-Resistant Coating</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            The durability foundation for modern ophthalmic lenses. Scratch-resistant hard coat helps preserve optical quality during routine cleaning, handling, and everyday wear.
          </p>
        </section>

        {/* Benefits */}
        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Key Benefits</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">{b.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">How Scratch-Resistant Coating Works</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              A transparent hard coat that strengthens the lens surface and provides a stable foundation for premium coating systems.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((t) => (
                <Card key={t.name} className="border-border bg-background">
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{t.icon}</div>
                    <h3 className="text-base font-semibold text-foreground">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Care Tips */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-border bg-background">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground">Care Tips</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Always rinse lenses with water before wiping to avoid grinding particles into the surface.</li>
                <li>Use microfiber cloths and approved lens cleaners instead of tissues, paper towels, or garments.</li>
                <li>Store eyewear in a hard case to prevent contact with hard surfaces and keys.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Ideal Wearers */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Ideal For</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {IDEAL_WEARERS.map((w) => (
              <Card key={w.label} className="border-border">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{w.icon}</div>
                  <h3 className="text-base font-semibold text-foreground">{w.label}</h3>
                  <p className="text-sm text-muted-foreground">{w.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold">Add scratch protection to every pair</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">The essential first layer for long-lasting lens performance.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" asChild><Link to="/#contact">Contact Us</Link></Button>
                <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <Link to="/store">Shop Coatings <ArrowRight className="ml-2 h-4 w-4" /></Link>
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

export default ScratchResistantPage;
