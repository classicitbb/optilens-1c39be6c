import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Eye,
  Shield,
  Sun,
  Feather,
  Gem,
  Coins,
  Star,
  Glasses,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type MaterialHighlight = { icon: LucideIcon; label: string };

type MaterialData = {
  index: string;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  extendedDescription?: string;
  highlights: MaterialHighlight[];
  specs: { label: string; value: string }[];
  bestFor: string[];
};

const MATERIALS: MaterialData[] = [
  {
    index: "1.50",
    name: "Plastic 1.50 (CR-39)",
    badge: "Standard",
    tagline: "The reliable, budget-friendly classic",
    description:
      "With a refractive index of 1.50, this entry-level lens material is economical and durable. Commonly called CR-39, it has been a cornerstone of optical dispensing for decades.",
    extendedDescription:
      "This very common material has great optical corrective properties. However, the lens thickness for high plus or minus prescriptions can be a limitation.",
    highlights: [
      { icon: Coins, label: "Budget-friendly" },
      { icon: Eye, label: "Good optical clarity" },
      { icon: Star, label: "Suitable for simple prescriptions" },
    ],
    specs: [
      { label: "Refractive Index", value: "1.50" },
      { label: "Abbe Value", value: "58" },
      { label: "Specific Gravity", value: "1.32" },
      { label: "UV Protection", value: "Optional" },
    ],
    bestFor: ["Low prescriptions (±2.00 D)", "Second pairs & backups", "Budget-conscious wearers"],
  },
  {
    index: "POLY",
    name: "Polycarbonate",
    badge: "Impact Resistant",
    tagline: "Tough protection for active lifestyles",
    description:
      "For eyeglass wearers with an active lifestyle, Polycarbonate is the robust lens material of choice. Ideal for sports enthusiasts, children, and youngsters.",
    extendedDescription:
      "Elastic and exceptionally strong, this lens material can withstand the impact of a 1 kg steel ball dropped from a height of 1.20 m. Designed for confident everyday use, it meets our demanding standards for drilled or groove-mounted frames. Heat resistant up to 90 °C for easy processing, including tinting and coating.",
    highlights: [
      { icon: Shield, label: "Optimum eye protection" },
      { icon: Eye, label: "Optical purity" },
      { icon: Sun, label: "Built-in UV protection" },
    ],
    specs: [
      { label: "Refractive Index", value: "1.59" },
      { label: "Abbe Value", value: "30" },
      { label: "Specific Gravity", value: "1.20" },
      { label: "UV Protection", value: "100 %" },
    ],
    bestFor: ["Children & teens", "Sports & safety eyewear", "Rimless & drill-mount frames"],
  },
  {
    index: "Trivex",
    name: "Trivex",
    badge: "Premium Impact",
    tagline: "Superior clarity meets unmatched impact resistance",
    description:
      "For eyeglass wearers with an active lifestyle, Trivex is the best impact-resistant lens material. Ideal for drill-mount frames, sports enthusiasts, children, and youngsters.",
    extendedDescription:
      "Elastic and exceptionally strong, Trivex withstands the impact of a 1 kg steel ball dropped from 1.20 m. It meets our demanding standards for drilled or groove-mounted frames and is very robust and safe.",
    highlights: [
      { icon: Eye, label: "Optical purity" },
      { icon: Shield, label: "Optimum eye protection" },
      { icon: Sun, label: "UV protection" },
    ],
    specs: [
      { label: "Refractive Index", value: "1.53" },
      { label: "Abbe Value", value: "45" },
      { label: "Specific Gravity", value: "1.11" },
      { label: "UV Protection", value: "100 %" },
    ],
    bestFor: ["Drill-mount / rimless frames", "Active & outdoor lifestyles", "Low-to-moderate Rx"],
  },
  {
    index: "1.60",
    name: "High Index 1.60",
    badge: "Top Seller",
    tagline: "The perfect balance of thin, light, and clear",
    description:
      "High Index 1.60 is a premium lens material and a top-seller due to its stability, balance of aesthetics, and economy. Its success lies in reliability, optical clarity, and exceptional comfort.",
    extendedDescription:
      "Especially suitable for wearers with a moderate to high prescription. A class leader in optical purity, it is heat resistant up to 110 °C for easy processing, including tinting and coating, and meets demanding standards for drilled or groove-mounted frames.",
    highlights: [
      { icon: Glasses, label: "Aesthetically appealing for rimless" },
      { icon: Feather, label: "Thin, lightweight & comfortable" },
      { icon: Eye, label: "Optical purity" },
    ],
    specs: [
      { label: "Refractive Index", value: "1.60" },
      { label: "Abbe Value", value: "42" },
      { label: "Specific Gravity", value: "1.30" },
      { label: "UV Protection", value: "100 %" },
    ],
    bestFor: [
      "Moderate-to-high Rx (±4.00 D)",
      "Rimless & supra/nylon frames",
      "Everyday premium wear",
    ],
  },
  {
    index: "1.67",
    name: "High Index 1.67",
    badge: "Premium",
    tagline: "Up to 40 % thinner than standard lenses",
    description:
      "High Index 1.67 is our premium high-index lens material that keeps up with the latest fashion and design trends. Thin and lightweight yet optically pure, it offers the perfect combination of clarity, comfort, and style.",
    extendedDescription:
      "Especially suited for wearers with a moderate to high prescription who require a strong, elegant lens. Compared with a standard-index lens, it is up to 40 % thinner and five times stronger. Heat resistant up to 95 °C for easy processing.",
    highlights: [
      { icon: Feather, label: "Lightweight & comfortable" },
      { icon: Eye, label: "Optical purity & durability" },
      { icon: Sun, label: "UV protection" },
    ],
    specs: [
      { label: "Refractive Index", value: "1.67" },
      { label: "Abbe Value", value: "32" },
      { label: "Specific Gravity", value: "1.35" },
      { label: "UV Protection", value: "100 %" },
    ],
    bestFor: [
      "High Rx (±6.00 D)",
      "Fashion-forward frame styles",
      "Patients wanting thinner lenses",
    ],
  },
  {
    index: "1.74",
    name: "Ultra High Index 1.74",
    badge: "Ultra Thin",
    tagline: "The thinnest, most elegant lens possible",
    description:
      "With a refractive index of 1.74, lenses can be made ultra-thin for maximum aesthetic appeal.",
    extendedDescription:
      "This material is particularly suitable for patients with a higher plus or minus prescription, reducing the magnification effect caused by thicker lenses. Available with all of our premium progressive and single-vision lens designs and coatings, it is extremely lightweight, increasing all-day comfort.",
    highlights: [
      { icon: Feather, label: "Exceptional wearing comfort" },
      { icon: Gem, label: "Reduced magnification effect" },
      { icon: Eye, label: "Crystal-clear vision" },
    ],
    specs: [
      { label: "Refractive Index", value: "1.74" },
      { label: "Abbe Value", value: "33" },
      { label: "Specific Gravity", value: "1.47" },
      { label: "UV Protection", value: "100 %" },
    ],
    bestFor: [
      "Very high Rx (±8.00 D+)",
      "Patients sensitive to lens thickness",
      "Minimalist & elegant frames",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Comparison table data                                              */
/* ------------------------------------------------------------------ */

const COMPARISON_ROWS: { label: string; key: string }[] = [
  { label: "Refractive Index", key: "index" },
  { label: "Thickness", key: "thickness" },
  { label: "Weight", key: "weight" },
  { label: "Impact Resistance", key: "impact" },
  { label: "UV Protection", key: "uv" },
  { label: "Abbe Value (Clarity)", key: "abbe" },
];

const COMPARISON_DATA: Record<string, Record<string, string>> = {
  "1.50": { index: "1.50", thickness: "Thick", weight: "Light", impact: "Standard", uv: "Optional", abbe: "58 ★★★★★" },
  POLY: { index: "1.59", thickness: "Thin", weight: "Very Light", impact: "Excellent", uv: "100 %", abbe: "30 ★★" },
  Trivex: { index: "1.53", thickness: "Moderate", weight: "Lightest", impact: "Excellent", uv: "100 %", abbe: "45 ★★★★" },
  "1.60": { index: "1.60", thickness: "Thinner", weight: "Light", impact: "Good", uv: "100 %", abbe: "42 ★★★★" },
  "1.67": { index: "1.67", thickness: "Very Thin", weight: "Moderate", impact: "Good", uv: "100 %", abbe: "32 ★★★" },
  "1.74": { index: "1.74", thickness: "Ultra Thin", weight: "Moderate", impact: "Good", uv: "100 %", abbe: "33 ★★★" },
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const MaterialCard = ({ m, reversed }: { m: MaterialData; reversed: boolean }) => (
  <section className={`flex flex-col gap-8 lg:gap-12 ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
    {/* Info side */}
    <div className="flex-1 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-bold text-foreground">{m.name}</h2>
        {m.badge && <Badge variant="secondary" className="text-xs">{m.badge}</Badge>}
      </div>
      <p className="text-lg font-medium text-accent">{m.tagline}</p>
      <p className="text-muted-foreground leading-relaxed">{m.description}</p>
      {m.extendedDescription && (
        <p className="text-sm text-muted-foreground/80 leading-relaxed">{m.extendedDescription}</p>
      )}

      {/* Highlights */}
      <div className="flex flex-wrap gap-4 pt-2">
        {m.highlights.map((h) => (
          <div key={h.label} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
            <h.icon className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">{h.label}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Specs + Best-for side */}
    <div className="flex-1 space-y-5">
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-primary/5 px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Technical Specs</h3>
          </div>
          <div className="divide-y divide-border">
            {m.specs.map((s) => (
              <div key={s.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className="text-sm font-semibold text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Best For</h3>
        <ul className="space-y-2">
          {m.bestFor.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const MaterialsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero pb-16 pt-28">
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-secondary/8 blur-3xl" />
        <div className="container relative mx-auto max-w-5xl px-4 text-center lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">Technical Specs</p>
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
            Lens Materials
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Compare index options from CR-39 through 1.74 to balance optics, weight, impact behaviour,
            and thickness profile for different prescriptions and frame styles.
          </p>

          {/* Quick-jump pills */}
          <div className="mx-auto mt-8 flex flex-wrap justify-center gap-2">
            {MATERIALS.map((m) => (
              <a
                key={m.index}
                href={`#material-${m.index}`}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {m.index === "POLY" ? "Polycarbonate" : m.index === "Trivex" ? "Trivex" : m.index}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Material detail sections */}
      <main className="container mx-auto max-w-5xl space-y-20 px-4 py-16 lg:px-8">
        {MATERIALS.map((m, i) => (
          <div key={m.index} id={`material-${m.index}`} className="scroll-mt-24">
            <MaterialCard m={m} reversed={i % 2 !== 0} />
          </div>
        ))}

        {/* Comparison Table */}
        <section id="comparison" className="scroll-mt-24">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground">Side-by-Side Comparison</h2>
            <p className="mt-2 text-muted-foreground">
              Quick reference across all material options
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Property</th>
                  {MATERIALS.map((m) => (
                    <th key={m.index} className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">
                      {m.index === "POLY" ? "Poly" : m.index}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, ri) => (
                  <tr key={row.key} className={`border-b border-border ${ri % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.label}</td>
                    {MATERIALS.map((m) => (
                      <td key={m.index} className="px-4 py-3 text-center text-muted-foreground">
                        {COMPARISON_DATA[m.index]?.[row.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How to choose guide */}
        <section className="rounded-2xl border border-border bg-card p-8 lg:p-10">
          <div className="mb-8 text-center">
            <Zap className="mx-auto mb-3 h-8 w-8 text-accent" />
            <h2 className="text-2xl font-bold text-foreground">How to Choose the Right Material</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Low Rx (≤ ±2.00 D)",
                tip: "CR-39 (1.50) offers the best optical clarity at the lowest cost. Upgrade to Poly or Trivex if impact resistance matters.",
              },
              {
                title: "Moderate Rx (±2.00 – ±4.00 D)",
                tip: "1.60 delivers the best balance of thinness, weight, and clarity. Great value for most patients.",
              },
              {
                title: "High Rx (±4.00 – ±6.00 D)",
                tip: "1.67 reduces lens thickness by up to 40 % compared to CR-39. Noticeably thinner and lighter.",
              },
              {
                title: "Very High Rx (≥ ±6.00 D)",
                tip: "1.74 provides the thinnest possible lens for strong prescriptions, minimising the magnification effect.",
              },
              {
                title: "Children & Safety",
                tip: "Polycarbonate or Trivex are recommended for impact resistance and built-in UV protection.",
              },
              {
                title: "Rimless / Drill-Mount Frames",
                tip: "Trivex or 1.60 are ideal — strong enough for drilling while maintaining optical quality.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-2">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Need Help Choosing?</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Our team can recommend the ideal material based on the patient's prescription, lifestyle, and frame choice.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button variant="hero" size="lg" asChild>
              <Link to="/contact" className="group">
                Contact Us
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/store">Browse Catalog</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MaterialsPage;
