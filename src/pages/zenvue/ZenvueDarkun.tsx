import { Moon, Zap, Clock, Shield, Eye, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";

const HOW_IT_WORKS = [
  { icon: Zap, title: "UV Activation", desc: "Darkun™ molecules respond to ultraviolet light, darkening the lens within seconds of sun exposure." },
  { icon: Clock, title: "Rapid Fade", desc: "When you move indoors, lenses return to clear quickly — no waiting, no residual tint." },
  { icon: Moon, title: "Fast Transition", desc: "Advanced photochromic technology ensures smooth, consistent transitions in any lighting condition." },
];

const BENEFITS = [
  { icon: Eye, title: "Visual Comfort", desc: "Automatic tint adjustment reduces eye fatigue and squinting in bright environments." },
  { icon: Shield, title: "UV Protection", desc: "Full UV400 protection in both activated and clear states — always protecting your patients' eyes." },
  { icon: Sparkles, title: "Convenience", desc: "One pair for indoors and outdoors. No need to switch between prescription glasses and sunglasses." },
];

const ZenvueDarkun = () => {
  return (
    <>
      <ZenvueHero
        badge="Photochromic Technology"
        title="Darkun™ Photochromic"
        subtitle="Lenses that adapt to light — clear indoors, tinted outdoors. Available with Brilliance™ Progressive and Single Vision lenses."
        ctas={[
          { label: "Brilliance™ + Darkun™", to: "/zenvue/brilliance", variant: "outline" },
          { label: "Single Vision + Darkun™", to: "/zenvue/single-vision", variant: "outline" },
        ]}
      />

      <AvailabilityBanner />

      {/* How It Works */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            How It Works
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.title} className="border border-border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground text-sm font-bold">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            Benefits
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {BENEFITS.map((item) => (
              <div key={item.title} className="border border-border bg-card p-6">
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Available With */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            Available With
          </h2>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <Link to="/zenvue/brilliance" className="group border border-border bg-card p-6 transition-colors hover:border-accent/40">
              <Sparkles className="h-8 w-8 text-accent" />
              <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-accent transition-colors" style={{ fontFamily: "'Crimson Pro', serif" }}>
                Brilliance™ Progressive
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">Progressive lenses with photochromic capability for ultimate versatility.</p>
            </Link>
            <Link to="/zenvue/single-vision" className="group border border-border bg-card p-6 transition-colors hover:border-accent/40">
              <Eye className="h-8 w-8 text-accent" />
              <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-accent transition-colors" style={{ fontFamily: "'Crimson Pro', serif" }}>
                Single Vision
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">Single focus lenses that darken in sunlight — perfect for one-pair patients.</p>
            </Link>
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </>
  );
};

export default ZenvueDarkun;
