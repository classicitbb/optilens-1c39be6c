import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import Seo from "@/components/seo/Seo";
import {
  Eye,
  Layers,
  Sparkles,
  Shield,
  ArrowRight,
  Car,
  Monitor,
  Glasses,
  Users,
} from "lucide-react";

const BENEFITS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Maximum Transparency",
    text: "Multi-layer AR stacks cut front- and back-surface reflections so eyes are more visible and lenses look virtually invisible.",
  },
  {
    icon: <Car className="h-5 w-5" />,
    title: "Night Driving Clarity",
    text: "Reduces halos and stray light from oncoming headlights and street lamps for safer, more comfortable night vision.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Cosmetic Appeal",
    text: "Eliminates distracting surface glare in photos, video calls, and face-to-face conversations for a polished appearance.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Durable Multi-Layer System",
    text: "Includes hard-coat and top-coat chemistry for stronger resistance to fine scratches and everyday smudging.",
  },
];

const TECH_LAYERS = [
  {
    icon: <Shield className="h-6 w-6" />,
    name: "Hard Coat Layer",
    description: "Scratch-resistant base that protects the lens surface and provides a stable foundation for the AR stack to bond to.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    name: "Multi-Layer AR Stack",
    description: "Multiple ultra-thin layers with different refractive indices work through interference to cancel reflected light waves.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    name: "Hydrophobic Top Coat",
    description: "Water-repellent finishing layer causes droplets to bead and roll off, keeping lenses cleaner between cleanings.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    name: "Oleophobic Finish",
    description: "Oil-repellent chemistry minimizes fingerprints and facial-oil smears, reducing cleaning frequency significantly.",
  },
];

const IDEAL_WEARERS = [
  {
    icon: <Car className="h-6 w-6" />,
    label: "Night Drivers",
    description: "Patients who frequently drive at night or commute in low-light conditions and need maximum glare reduction.",
  },
  {
    icon: <Monitor className="h-6 w-6" />,
    label: "Digital Professionals",
    description: "Wearers under overhead LED and screen lighting all day who need the clearest, most comfortable vision.",
  },
  {
    icon: <Glasses className="h-6 w-6" />,
    label: "High-Index Wearers",
    description: "Patients with higher prescriptions and high-index lenses that naturally reflect more light and benefit most from premium AR.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    label: "Video & Presentation Pros",
    description: "Anyone regularly on camera or speaking in person who wants their eyes visible and lenses glare-free.",
  },
];

const UltraClearARPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="UltraClear AR Coating — Premium Anti-Reflective | Classic Visions"
        description="Learn how UltraClear AR improves lens transparency, night-driving comfort, cosmetic appearance, and cleaning performance with a premium multi-layer anti-reflective stack."
        canonicalPath="/coatings/ultraclear-ar"
      />
      <Header />
      <main className="pb-20 pt-24">
        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Premium Performance</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">UltraClear AR (Super&nbsp;AR)</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            A premium multi-layer anti-reflective system designed to virtually eliminate distracting glare while improving cosmetic clarity, night-driving comfort, and all-day visual performance.
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
            <h2 className="text-2xl font-bold text-foreground">How UltraClear AR Works</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Each layer in the UltraClear system serves a specific purpose — from scratch protection at the base to oil repellency at the top.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {TECH_LAYERS.map((t) => (
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

        {/* Ideal Wearers */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Ideal For</h2>
          <p className="mt-1 text-muted-foreground">Position UltraClear AR as best-in-class for these patient profiles.</p>
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
                <h2 className="text-xl font-bold">Upgrade to UltraClear AR</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">Pair with hydrophobic and oleophobic top layers for the ultimate in lens performance.</p>
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

export default UltraClearARPage;
