import { Eye, Sparkles, Monitor, BookOpen, Glasses } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import ZenvueFeatureShell from "@/components/zenvue/ZenvueFeatureShell";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import type { ComponentType, ReactNode } from "react";

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

type LensCardProps = {
  title: string;
  desc: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  iconClassName?: string;
  iconWrapperClassName?: string;
};

const LensCard = ({ title, desc, icon: Icon, iconClassName, iconWrapperClassName }: LensCardProps) => (
  <Card className="border-border bg-card">
    <CardContent className="p-6">
      {Icon ? (
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md ${iconWrapperClassName ?? "bg-muted"}`}>
          <Icon className={iconClassName ?? "h-5 w-5 text-foreground"} />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </CardContent>
  </Card>
);

const ZenvueSingleVision = () => {
  return (
    <ZenvueFeatureShell>
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
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Available Options
          </h2>
          <p className="mt-1 text-muted-foreground">
            Choose your lens treatment while keeping the same optical performance.
          </p>
          <div className="mt-8 mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <LensCard
              icon={Eye}
              title="Clear"
              desc="Standard transparent lenses. The go-to choice for dedicated-use eyewear."
            />
            <LensCard
              icon={Sparkles}
              iconWrapperClassName="bg-primary"
              iconClassName="h-5 w-5 text-primary-foreground"
              title="Darkun™ Photochromic"
              desc={(
                <>
                  Adapts to changing light conditions automatically.{" "}
                  <Link to="/zenvue/darkun" className="text-accent hover:underline">
                    Learn about Darkun™ →
                  </Link>
                </>
              )}
            />
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="border-b border-border">
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Materials & Specifications
          </h2>
          <p className="mt-1 text-muted-foreground">
            Material options for single vision prescriptions and different thickness needs.
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Material</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Index</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Benefits</th>
                </tr>
              </thead>
              <tbody>
                {MATERIALS.map((m) => (
                  <tr key={m.name} className="border-t border-border transition-colors hover:bg-muted/30">
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
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Ideal For
          </h2>
          <p className="mt-1 text-muted-foreground">
            Purpose-built single vision configurations for your daily visual priority.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {IDEAL_FOR.map((item) => (
              <LensCard
                key={item.title}
                icon={item.icon}
                iconWrapperClassName="bg-accent/10"
                iconClassName="h-5 w-5 text-accent"
                title={item.title}
                desc={item.desc}
              />
            ))}
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </ZenvueFeatureShell>
  );
};

export default ZenvueSingleVision;
