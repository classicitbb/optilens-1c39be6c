import { Eye, Check, Sparkles, Monitor, BookOpen, Glasses } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import { Link } from "react-router-dom";

const MATERIALS = [
  { name: "CR-39", index: "1.50", desc: "Lightweight, excellent optics" },
  { name: "Polycarbonate", index: "1.59", desc: "Impact-resistant, thinner" },
  { name: "Hi-Index", index: "1.67", desc: "Ultra-thin, high prescriptions" },
];

const IDEAL_FOR = [
  { icon: Glasses, title: "Distance Vision", desc: "Clear, sharp distance correction for driving, sports, and daily activities." },
  { icon: BookOpen, title: "Reading", desc: "Comfortable close-up clarity for reading, crafts, and detailed work." },
  { icon: Monitor, title: "Computer & Office", desc: "Reduce digital eye strain with lenses optimized for screen distances." },
];

const ZenvueSingleVision = () => {
  return (
    <>
      <ZenvueHero
        badge="Single Vision Lenses"
        title="Single Vision Lenses"
        subtitle="Precision-ground single vision lenses for distance, reading, or computer use — available in all major materials."
        ctas={[
          { label: "Shop Now", to: "/store" },
          { label: "Compare Products", to: "/zenvue/compare", variant: "outline" },
        ]}
      />

      <AvailabilityBanner />

      {/* Options */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            Available Options
          </h2>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <div className="border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center bg-muted">
                <Eye className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Clear</h3>
              <p className="mt-2 text-sm text-muted-foreground">Standard transparent lenses. The go-to choice for dedicated-use eyewear.</p>
            </div>
            <div className="border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
                Darkun™ Photochromic
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Adapts to changing light conditions automatically.{" "}
                <Link to="/zenvue/darkun" className="text-accent hover:underline">Learn about Darkun™ →</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
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

      {/* Ideal For */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            Ideal For
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {IDEAL_FOR.map((item) => (
              <div key={item.title} className="border border-border bg-card p-6">
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </>
  );
};

export default ZenvueSingleVision;
