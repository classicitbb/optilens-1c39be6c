import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import {
  Sun,
  Shield,
  Eye,
  CloudSun,
  ArrowRight,
  Bike,
  Car,
  Baby,
  Umbrella,
} from "lucide-react";

const BENEFITS = [
  {
    icon: <Sun className="h-5 w-5" />,
    title: "UVA & UVB Blocking",
    text: "Filters high-energy ultraviolet radiation that reaches the eye during daily outdoor activity, reducing cumulative UV exposure.",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Blue-Violet Management",
    text: "Adds blue-violet (BV) control for bright daylight and reflective urban environments where short-wavelength light is intense.",
  },
  {
    icon: <CloudSun className="h-5 w-5" />,
    title: "All-Weather Protection",
    text: "UV control is important even on cloudy days — up to 80% of UV radiation penetrates cloud cover and reaches the eyes.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Complements Other Options",
    text: "Works alongside polarized, photochromic, and clear indoor/outdoor prescriptions for comprehensive light management.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: <Sun className="h-6 w-6" />,
    name: "UV Absorption Layer",
    description: "UV-absorbing compounds are integrated into the lens material or applied as a coating, converting harmful UV energy into harmless heat.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    name: "Broad-Spectrum Coverage",
    description: "Blocks both UVA (315–400 nm) and UVB (280–315 nm) wavelengths that contribute to eye tissue damage over time.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    name: "Blue-Violet Control",
    description: "Extends protection into the blue-violet band (400–455 nm) for additional support in high-brightness conditions.",
  },
  {
    icon: <CloudSun className="h-6 w-6" />,
    name: "Invisible Protection",
    description: "UV Shield adds no visible tint or color shift to the lens — full protection while maintaining complete optical clarity.",
  },
];

const IDEAL_WEARERS = [
  {
    icon: <Bike className="h-6 w-6" />,
    label: "Active Outdoor Users",
    description: "Patients who spend extended time commuting, exercising outdoors, or near water where UV reflection is amplified.",
  },
  {
    icon: <Car className="h-6 w-6" />,
    label: "Daily Commuters",
    description: "Wearers who drive or walk outdoors regularly and accumulate UV exposure over months and years.",
  },
  {
    icon: <Baby className="h-6 w-6" />,
    label: "Children & Young Adults",
    description: "Younger eyes transmit more UV light to the retina, making early protection especially important.",
  },
  {
    icon: <Umbrella className="h-6 w-6" />,
    label: "Tropical & High-Altitude",
    description: "Patients in sunny climates, at elevation, or near reflective surfaces (water, snow, sand) with higher UV indices.",
  },
];

const UVShieldPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-24">
        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Everyday Protection</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">UV Shield — UVA, UVB &amp;&nbsp;BV</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            UV Shield coatings filter high-energy ultraviolet radiation and support blue-violet control for broader environmental light protection — even on cloudy days.
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
            <h2 className="text-2xl font-bold text-foreground">How UV Shield Works</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Broad-spectrum UV protection that blocks harmful radiation without affecting lens clarity or color.
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

        {/* Ideal Wearers */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Ideal For</h2>
          <p className="mt-1 text-muted-foreground">Pair with polarized or photochromic options when glare reduction is also a priority.</p>
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
                <h2 className="text-xl font-bold">Add UV Shield to any prescription</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">Essential invisible protection for every patient, every day.</p>
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

export default UVShieldPage;
