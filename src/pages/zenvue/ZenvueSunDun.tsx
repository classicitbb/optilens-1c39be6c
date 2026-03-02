import { Sun, Car, Waves, TreePine, Check, Shield } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import ZenvueFeatureShell from "@/components/zenvue/ZenvueFeatureShell";

const USE_CASES = [
  { icon: Car, title: "Driving", desc: "Eliminates road glare and reflections from dashboards and windshields for safer driving." },
  { icon: Waves, title: "Water Activities", desc: "Cuts through water surface glare for fishing, boating, and beach activities." },
  { icon: TreePine, title: "Outdoor & Sports", desc: "Enhances contrast and color perception in bright Caribbean sunlight." },
];

const SPECS = [
  { label: "Polarization", value: "99.9% efficiency" },
  { label: "Color", value: "Gray (neutral)" },
  { label: "UV Protection", value: "UV400 (100%)" },
  { label: "Materials", value: "CR-39, Polycarbonate" },
  { label: "Type", value: "Single Vision" },
  { label: "Coatings", value: "Hard coat, AR available" },
];

const ZenvueSunDun = () => {
  return (
    <ZenvueFeatureShell>
      <ZenvueHero
        badge="Polarized Sunwear"
        title="SunDun™ Polarized"
        subtitle="Premium gray polarized lenses that eliminate glare for crystal-clear outdoor vision — built for Caribbean sun."
        ctas={[
          { label: "Shop Now", to: "/store" },
          { label: "Compare Products", to: "/zenvue/compare", variant: "outline" },
        ]}
      />

      <AvailabilityBanner />

      {/* Use Cases */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Built for Every Outdoor Moment
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {USE_CASES.map((item) => (
              <div key={item.title} className="border border-border bg-card p-6">
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Features & Specifications
          </h2>
          <div className="mx-auto max-w-xl space-y-0 border border-border">
            {SPECS.map((s, i) => (
              <div key={s.label} className={`flex items-center justify-between px-4 py-3 ${i < SPECS.length - 1 ? "border-b border-border" : ""}`}>
                <span className="text-sm font-medium text-foreground">{s.label}</span>
                <span className="text-sm text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Gray? */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Why Gray?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Gray is the gold standard for polarized lenses. It provides the most natural color perception,
              reducing brightness without distorting the colors you see. Gray is universally flattering and
              appropriate for all outdoor activities — from driving to fishing to everyday sun protection.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 text-left">
              {[
                "True color perception",
                "Universal suitability",
                "Maximum glare reduction",
              ].map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm text-foreground">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-accent">
                    <Check className="h-3 w-3 text-accent-foreground" />
                  </div>
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </ZenvueFeatureShell>
  );
};

export default ZenvueSunDun;
