import { Sparkles, Check, Shield, Layers, Eye, Monitor } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import ZenvueFeatureShell from "@/components/zenvue/ZenvueFeatureShell";
import { Link } from "react-router-dom";

const MATERIALS = [
  { name: "CR-39", index: "1.50", desc: "Lightweight, excellent optics" },
  { name: "Polycarbonate", index: "1.59", desc: "Impact-resistant, thinner" },
  { name: "Hi-Index", index: "1.67", desc: "Ultra-thin, high prescriptions" },
];

const COATINGS = [
  "Multi-coat anti-reflective (AR)",
  "Hard coat scratch protection",
  "Hydrophobic (water repellent)",
  "Oleophobic (smudge resistant)",
  "UV400 protection (standard)",
];

const IDEAL_FOR = [
  { icon: Eye, title: "Daily Wear", desc: "Seamless all-day vision for work, leisure, and everything in between." },
  { icon: Monitor, title: "Office & Digital", desc: "Wide intermediate zone optimized for screens and office environments." },
  { icon: Layers, title: "Active Lifestyles", desc: "Durable materials and coatings for patients who need reliable performance." },
];

const ZenvueBrilliance = () => {
  return (
    <ZenvueFeatureShell>
      <ZenvueHero
        badge="Progressive Lenses"
        title="Brilliance™ Progressive"
        subtitle="Advanced progressive lenses with smooth corridor transitions for natural, comfortable vision at every distance."
        ctas={[
          { label: "Shop Now", to: "/store" },
          { label: "Compare Products", to: "/zenvue/compare", variant: "outline" },
        ]}
      />

      <AvailabilityBanner />

      {/* Options: Clear & Darkun */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Available Options
          </h2>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <div className="border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center bg-muted">
                <Sparkles className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Clear</h3>
              <p className="mt-2 text-sm text-muted-foreground">Classic transparent progressive lenses. Ideal for everyday indoor and outdoor use.</p>
            </div>
            <div className="border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Darkun™ Photochromic
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Transitions from clear indoors to tinted outdoors.{" "}
                <Link to="/zenvue/darkun" className="text-accent hover:underline">Learn about Darkun™ →</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Materials & Specs */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Materials & Specifications
          </h2>
          <div className="mx-auto max-w-2xl overflow-hidden border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Material</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Index</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Benefits</th>
                </tr>
              </thead>
              <tbody>
                {MATERIALS.map((m) => (
                  <tr key={m.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.index}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Coatings */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Coatings Included
          </h2>
          <div className="mx-auto max-w-xl space-y-3">
            {COATINGS.map((c) => (
              <div key={c} className="flex items-center gap-3 text-sm text-foreground">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-accent">
                  <Check className="h-3 w-3 text-accent-foreground" />
                </div>
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal For */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Ideal For
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {IDEAL_FOR.map((item) => (
              <div key={item.title} className="border border-border bg-card p-6">
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </ZenvueFeatureShell>
  );
};

export default ZenvueBrilliance;
