import { ShoppingBag, Handshake, ArrowDown, Award, Layers, Palette, ShieldCheck, Sparkles, Eye, Sun } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import AvailabilityBanner from "@/components/zenvue/AvailabilityBanner";
import ZenvueProductCard from "@/components/zenvue/ZenvueProductCard";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";

const ZenvueHome = () => {
  return (
    <>
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
        <div className="container mx-auto px-4 py-16 lg:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl" style={{ fontFamily: "'Crimson Pro', serif" }}>
              Caribbean Craftsmanship, Global Standards
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
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
        <div className="container mx-auto px-4 py-16 lg:py-20 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl" style={{ fontFamily: "'Crimson Pro', serif" }}>
              Our Product Range
            </h2>
            <p className="mt-3 text-muted-foreground">Three product lines designed for every patient need.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
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
            <ZenvueProductCard
              title="SunDun™ Polarized"
              description="Premium gray polarized lenses that eliminate glare for crystal-clear outdoor vision."
              features={["99.9% polarization efficiency", "CR-39 & Polycarbonate", "UV400 protection", "Ideal for Caribbean sun"]}
              to="/zenvue/sundun"
              icon={Sun}
              accentColor="hsl(216 19% 26%)"
            />
          </div>
        </div>
      </section>

      {/* Why ZenVue */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:py-20 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl" style={{ fontFamily: "'Crimson Pro', serif" }}>
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
              <div key={item.title} className="border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-zv)" }}>
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {item.title}
                </h3>
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

export default ZenvueHome;
