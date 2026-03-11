import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Car, Palette, Sun, Shield, Timer } from "lucide-react";
import { Link } from "react-router-dom";

type LensProfile = {
  name: string;
  family: "Darkun" | "Transitions" | "Category";
  positioning: string;
  summary: string;
  idealFor: string[];
  colors: { name: string; hex: string }[];
  cta?: { label: string; to: string };
};

const LENSES: LensProfile[] = [
  {
    name: "Generic Photochromics",
    family: "Category",
    positioning: "Value adaptive lenses",
    summary: "Baseline photochromic lenses that darken in UV light and clear indoors. Performance varies by supplier and material.",
    idealFor: ["Budget-focused buyers", "First-time photochromic wearers", "General everyday use"],
    colors: [{ name: "Gray", hex: "#6b7280" }],
  },
  {
    name: "Darkun™",
    family: "Darkun",
    positioning: "House photochromic option",
    summary: "Darkun is our branded photochromic option with UV activation, rapid fade back, and all-day UV400 protection for one-pair convenience.",
    idealFor: ["Patients who want one pair", "Daily commuters", "Users comparing branded upgrades"],
    colors: [{ name: "Gray", hex: "#5b6470" }, { name: "Brown (special order)", hex: "#7b5538" }],
  },
  {
    name: "Transitions® GEN S™",
    family: "Transitions",
    positioning: "Fast everyday flagship + style color family",
    summary: "Transitions positions GEN S as a fast everyday generation; style color options are grouped here for shoppers comparing both performance and color personalization.",
    idealFor: ["Patients moving in/outdoors often", "Style-conscious users", "General all-day wear"],
    colors: [
      { name: "Gray", hex: "#68707b" },
      { name: "Brown", hex: "#6d4c33" },
      { name: "Graphite Green", hex: "#4f5c4f" },
      { name: "Amethyst", hex: "#6e5a7d" },
      { name: "Amber", hex: "#b2672f" },
      { name: "Emerald", hex: "#2f6f57" },
      { name: "Ruby", hex: "#8c2f3f" },
      { name: "Sapphire", hex: "#2e4d87" },
    ],
  },
  {
    name: "Transitions® XTRActive® New Generation",
    family: "Transitions",
    positioning: "Extra-light-reactive performance",
    summary: "XTRActive New Generation is designed for people sensitive to bright light, with deeper activation outdoors and noticeable in-car activation behind windshields.",
    idealFor: ["Bright climate wearers", "Frequent drivers", "Light-sensitive users"],
    colors: [{ name: "Gray", hex: "#5c6570" }, { name: "Brown", hex: "#664732" }],
  },
  {
    name: "Transitions® XTRActive® Polarized",
    family: "Transitions",
    positioning: "Adaptive + polarization",
    summary: "XTRActive Polarized combines photochromic adaptation with dynamic polarization outdoors to reduce reflective glare from roads, water, and bright surfaces.",
    idealFor: ["Drivers", "Boaters", "Patients wanting adaptive glare control"],
    colors: [{ name: "Gray", hex: "#5a626d" }],
  },
  {
    name: "Transitions® Drivewear®",
    family: "Transitions",
    positioning: "Driving-specialized polarized lens",
    summary: "Drivewear is a dedicated polarized driving lens that starts tinted (not clear indoors) and shifts color intensity with changing outdoor and behind-the-windshield conditions.",
    idealFor: ["Dedicated driving pair", "High-glare commuters", "Road sport enthusiasts"],
    colors: [{ name: "Olive/Amber-Copper family", hex: "#7e5d2d" }],
    cta: { label: "Night driving guide", to: "/patients/night-driving-aids" },
  },
];

const FEATURE_ROWS = [
  { label: "Clears indoors", key: "indoorClear" },
  { label: "Activates in-car", key: "inCar" },
  { label: "Polarized outdoors", key: "polarized" },
  { label: "Broad style color range", key: "styleColors" },
  { label: "Designed for bright-light sensitivity", key: "brightLight" },
  { label: "One-pair everyday suitability", key: "onePair" },
];

const FEATURE_MATRIX: Record<string, Record<string, string>> = {
  "Generic Photochromics": { indoorClear: "Usually yes", inCar: "Often minimal", polarized: "No", styleColors: "Gray only", brightLight: "Entry level", onePair: "Yes" },
  "Darkun™": { indoorClear: "Yes", inCar: "Limited", polarized: "No", styleColors: "Gray + Brown (special order)", brightLight: "Balanced", onePair: "Yes" },
  "Transitions® GEN S™": { indoorClear: "Yes", inCar: "Limited", polarized: "No", styleColors: "Very broad", brightLight: "Balanced-fast", onePair: "Excellent" },
  "Transitions® XTRActive® New Generation": { indoorClear: "Slight indoor tint", inCar: "Yes", polarized: "No", styleColors: "Gray + Brown", brightLight: "High", onePair: "Excellent" },
  "Transitions® XTRActive® Polarized": { indoorClear: "Slight indoor tint", inCar: "Yes", polarized: "Yes", styleColors: "Gray only", brightLight: "High + glare", onePair: "Excellent outdoors" },
  "Transitions® Drivewear®": { indoorClear: "No (always tinted)", inCar: "Yes", polarized: "Yes", styleColors: "Driving palette", brightLight: "Very high", onePair: "Best as dedicated driving pair" },
};

const faqItems = [
  {
    q: "Myth: XTRActive Polarized is always darker than XTRActive New Generation.",
    a: "XTRActive Polarized is optimized for polarized glare reduction outdoors, not simply maximum darkness in every condition. Perceived darkness depends on light, temperature, and environment.",
  },
  {
    q: "Myth: XTRActive New Generation is always darker than GEN S.",
    a: "They are designed for different priorities. XTRActive New Generation focuses on higher light-reactivity and in-car response, while GEN S focuses on rapid everyday transitions and broader color style options.",
  },
  {
    q: "Do Drivewear lenses replace everyday clear photochromics?",
    a: "Not usually. Drivewear starts tinted and is purpose-built for driving comfort and glare control. Most wearers pair it with a clear or clear-to-dark everyday lens.",
  },
];

const PhotochromicGuidePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="relative overflow-hidden bg-gradient-hero pb-16 pt-28">
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-secondary/8 blur-3xl" />
        <div className="container relative mx-auto max-w-6xl px-4 text-center lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">Photochromic Knowledge Hub</p>
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">Photochromic Lens Comparison Guide</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-muted-foreground">Compare Darkun™, generic photochromics, and key Transitions® families in one place. This page is designed to answer real buying questions quickly: darkness behavior, in-car activation, polarization, and available colors.</p>
          <p className="mx-auto mt-4 max-w-3xl text-sm text-muted-foreground">Color availability used here: Generic photochromics (Gray), Darkun™ (Gray + Brown special order), XTRActive® New Generation (Gray/Brown), and XTRActive® Polarized (Gray).</p>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl space-y-16 px-4 py-16 lg:px-8">
        <section>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground">Lens Families at a Glance</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {LENSES.map((lens) => (
              <Card key={lens.name} variant="glass" className="h-full border-border/80">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{lens.name}</h3>
                      <p className="text-sm text-accent">{lens.positioning}</p>
                    </div>
                    <Badge variant="secondary">{lens.family}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{lens.summary}</p>
                  {lens.cta && (
                    <div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={lens.cta.to}>{lens.cta.label}</Link>
                      </Button>
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">Best for</p>
                    <ul className="space-y-1.5">
                      {lens.idealFor.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
                      <Palette className="h-3.5 w-3.5" />
                      Available colors
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lens.colors.map((color) => (
                        <span key={`${lens.name}-${color.name}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground">
                          <Circle className="h-3.5 w-3.5" fill={color.hex} color={color.hex} />
                          {color.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-foreground">Benefits Grid: Feature-by-Feature Comparison</h2>
            <p className="mt-2 text-muted-foreground">Use this matrix to compare product behavior side-by-side before choosing a recommendation.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Feature</th>
                  {LENSES.map((lens) => (
                    <th key={lens.name} className="whitespace-nowrap px-4 py-3 text-center font-semibold text-foreground">{lens.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, idx) => (
                  <tr key={row.key} className={`border-b border-border ${idx % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{row.label}</td>
                    {LENSES.map((lens) => (
                      <td key={`${lens.name}-${row.key}`} className="px-4 py-3 text-center text-muted-foreground">{FEATURE_MATRIX[lens.name][row.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-foreground">FAQ: Myth vs Fact</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {faqItems.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-border bg-muted/30 p-5">
                <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-8 md:grid-cols-4">
          {[
            { icon: Sun, title: "Outdoor darkness", text: "Darkness level is not the only metric; response speed and color neutrality also matter." },
            { icon: Car, title: "In-car use", text: "Standard photochromics often show limited windshield activation; XTRActive/Drivewear categories are engineered for this use case." },
            { icon: Timer, title: "Fade-back speed", text: "Fast fade-back improves comfort when moving from bright outdoors to indoor environments." },
            { icon: Shield, title: "UV + glare", text: "UV protection and glare control are separate benefits; only polarized categories target reflective glare reduction." },
          ].map((item) => (
            <div key={item.title} className="space-y-2">
              <item.icon className="h-4 w-4 text-accent" />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PhotochromicGuidePage;
