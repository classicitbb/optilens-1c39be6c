import { Moon, Zap, Clock, Shield, Eye, Sparkles } from "lucide-react";
import { Link } from "react-router";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import ZenvueFeatureShell from "@/components/zenvue/ZenvueFeatureShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <ZenvueFeatureShell>
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
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              How It Works
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <Card key={item.title} variant="feature" className="rounded-2xl">
                <CardHeader className="space-y-0 p-6 pb-4">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              Benefits
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {BENEFITS.map((item) => (
              <Card key={item.title} variant="feature" className="rounded-2xl">
                <CardHeader className="space-y-0 p-6 pb-4">
                  <item.icon className="h-8 w-8 text-accent" />
                  <CardTitle className="mt-4 text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Available With */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              Available With
            </h2>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <Link to="/zenvue/brilliance" className="group block">
              <Card variant="feature" className="h-full rounded-2xl">
                <CardHeader className="space-y-0 p-6 pb-4">
                  <Sparkles className="h-8 w-8 text-accent" />
                  <CardTitle className="mt-4 text-lg transition-colors group-hover:text-accent">
                    Brilliance™ Progressive
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-sm text-muted-foreground">Progressive lenses with photochromic capability for ultimate versatility.</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/zenvue/single-vision" className="group block">
              <Card variant="feature" className="h-full rounded-2xl">
                <CardHeader className="space-y-0 p-6 pb-4">
                  <Eye className="h-8 w-8 text-accent" />
                  <CardTitle className="mt-4 text-lg transition-colors group-hover:text-accent">
                    Single Vision
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-sm text-muted-foreground">Single focus lenses that darken in sunlight — perfect for one-pair patients.</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </ZenvueFeatureShell>
  );
};

export default ZenvueDarkun;
