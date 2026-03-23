import { ShoppingBag, Handshake, ArrowDown, Award, Layers, Palette, ShieldCheck, Sparkles, Eye } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueProductCard from "@/components/zenvue/ZenvueProductCard";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import ZenvueFeatureShell from "@/components/zenvue/ZenvueFeatureShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ZenvueHome = () => {
  return (
    <ZenvueFeatureShell>
      <ZenvueHero
        title="Clarity, Comfort, Confidence"
        subtitle="Premium prescription lenses crafted for Caribbean optical professionals."
        description="ZenVue delivers world-class lens technology with regional expertise and reliable finished stock availability."
        ctas={[
          { label: "Shop Now", to: "/store", icon: ShoppingBag },
          { label: "Become a Partner", to: "/zenvue/wholesale", variant: "outline", icon: Handshake },
          { label: "Explore Products", to: "#products", variant: "outline", icon: ArrowDown },
        ]}
      />

      <AvailabilityBanner />

      {/* Brand Story */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              Caribbean Craftsmanship, Global Standards
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              ZenVue was born from a simple belief: optical professionals in the Caribbean deserve
              access to premium lens technology without compromise. We partner with world-leading
              manufacturers to deliver lenses that meet the highest global standards — available
              as finished stock, ready when you need them.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="border-b border-border">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              Our Product Range
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">Two core ZenVue product lines designed for everyday patient needs.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <ZenvueProductCard
              title="Brilliance™ Progressive"
              description="Advanced progressive lenses with smooth corridor transitions for natural, comfortable vision at all distances."
              features={["CR-39, Poly & Hi-Index 1.67", "Clear and Darkun™ options", "Multi-coat anti-reflective", "Wide reading zone"]}
              to="/zenvue/brilliance"
              icon={Sparkles}
            />
            <ZenvueProductCard
              title="Single Vision"
              description="Precision-ground single vision lenses available across all major materials and index values."
              features={["CR-39, Poly & Hi-Index 1.67", "Clear and Darkun™ options", "Distance, reading & computer", "Hard-coat and multi-coat"]}
              to="/zenvue/single-vision"
              icon={Eye}
            />
          </div>
        </div>
      </section>

      {/* Why ZenVue */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              Why ZenVue?
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Award, title: "Premium Materials", desc: "Only the finest optical-grade materials from globally certified manufacturers." },
              { icon: Layers, title: "Advanced Coatings", desc: "Multi-coat AR, hydrophobic, and oleophobic treatments on every lens." },
              { icon: Palette, title: "Color-Coded System", desc: "Easy identification with our intuitive color-coding across all product lines." },
              { icon: ShieldCheck, title: "Quality Assured", desc: "Every lens undergoes rigorous quality checks before reaching your practice." },
            ].map((item) => (
              <Card key={item.title} variant="feature" className="rounded-2xl">
                <CardHeader className="space-y-0 p-6 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                    <item.icon className="h-6 w-6 text-accent" />
                  </div>
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

      <ZenvueCTA />
    </ZenvueFeatureShell>
  );
};

export default ZenvueHome;
