import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Droplets,
  Fingerprint,
  Sparkles,
  Timer,
  ArrowRight,
  CloudRain,
  Bike,
  Users,
  Shield,
} from "lucide-react";

const BENEFITS = [
  {
    icon: <Droplets className="h-5 w-5" />,
    title: "Water Repellency",
    text: "Hydrophobic chemistry helps droplets bead and roll off instead of spreading across the lens surface, maintaining clarity in rain and humidity.",
  },
  {
    icon: <Fingerprint className="h-5 w-5" />,
    title: "Smudge Resistance",
    text: "Oil-repellent performance minimizes fingerprints and facial-oil smears on high-touch areas, keeping lenses cleaner longer.",
  },
  {
    icon: <Timer className="h-5 w-5" />,
    title: "Faster Cleaning",
    text: "Speeds up cleaning and reduces friction during wiping, helping preserve the AR stack performance underneath.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "AR Stack Protection",
    text: "Reduces the abrasive effect of frequent cleaning on the anti-reflective layers below, extending overall coating lifespan.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: <Droplets className="h-6 w-6" />,
    name: "Hydrophobic Layer",
    description: "A fluorocarbon-based top coat creates an extremely low surface energy so water cannot spread — it forms tight beads that roll away.",
  },
  {
    icon: <Fingerprint className="h-6 w-6" />,
    name: "Oleophobic Layer",
    description: "The same chemistry repels oils from skin, cosmetics, and environmental sources, preventing the thin film of grease that causes smearing.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    name: "Nano-Scale Application",
    description: "Applied as an ultra-thin molecular layer (just nanometers thick) on top of the AR stack — adding no visible thickness or color shift.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    name: "Self-Cleaning Effect",
    description: "The combination of water and oil repellency creates a partial self-cleaning behavior where contaminants have difficulty adhering to the surface.",
  },
];

const IDEAL_WEARERS = [
  {
    icon: <CloudRain className="h-6 w-6" />,
    label: "Humid Climate Wearers",
    description: "Patients in tropical or humid environments where condensation and rain regularly affect lens clarity.",
  },
  {
    icon: <Bike className="h-6 w-6" />,
    label: "Active Users",
    description: "Athletes, cyclists, and fitness enthusiasts who perspire and handle their glasses frequently during activity.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    label: "Mask Wearers",
    description: "Anyone wearing face masks regularly who experiences fogging and moisture buildup on their lenses.",
  },
  {
    icon: <Fingerprint className="h-6 w-6" />,
    label: "Touch-Screen Workers",
    description: "Patients who adjust their glasses frequently throughout the day and want to minimize visible fingerprints.",
  },
];

const HydrophobicOleophobicPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-24">
        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Everyday Protection</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">Hydrophobic &amp; Oleophobic Top&nbsp;Coats</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Water-repellent and oil-repellent finishing layers that keep coated lenses cleaner between wipes and easier to maintain — protecting your premium AR investment.
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
            <h2 className="text-2xl font-bold text-foreground">How Top Coats Work</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Nano-scale chemistry that repels water and oil at the molecular level, applied as the final layer of the coating system.
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
                <li>Rinse lenses under lukewarm water, apply approved cleaner, then dry with a clean microfiber cloth.</li>
                <li>Replace heavily worn microfiber cloths regularly — saturated cloths re-deposit oils onto premium coatings.</li>
                <li>Avoid household glass cleaners, paper towels, and abrasive materials that can degrade top-coat performance.</li>
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
                <h2 className="text-xl font-bold">Keep lenses cleaner, longer</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">Hydrophobic and oleophobic top coats are the finishing touch on every premium AR system.</p>
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

export default HydrophobicOleophobicPage;
