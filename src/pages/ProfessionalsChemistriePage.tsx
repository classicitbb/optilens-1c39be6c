import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sun,
  BookOpen,
  Car,
  Monitor,
  Leaf,
  FlowerIcon,
  Film,
  Eye,
  CheckCircle2,
  ExternalLink,
  Magnet,
  Layers,
  Shield,
  Feather,
  Settings,
  Sparkles,
  Award,
  ArrowRight,
  Phone,
  Mail } from
"lucide-react";


/* ─────────────── DATA ─────────────── */

const STATS = [
{ value: "1M+", label: "Clips Sold Worldwide" },
{ value: "#1", label: "Best-Selling Magnetic Clip System" },
{ value: "100+", label: "Optical Labs Equipped" },
{ value: "24", label: "Polarized Color Options" }];


const PRODUCTS = [
{
  icon: Sun,
  title: "Chemistrie Sun",
  description:
  "24 polarized lens colors in solid, mirror, and gradient. Base-curve matched, custom-made to fit any frame.",
  href: "https://www.forecps.com/chemistrie-sun",
  accent: "hsl(var(--primary))"
},
{
  icon: BookOpen,
  title: "Chemistrie+ Reading",
  description:
  "Prescription reading power integrated into the magnetic clip, eliminating the need for a separate pair.",
  href: "https://www.forecps.com/chemistrie-reading",
  accent: "hsl(var(--accent))"
},
{
  icon: Car,
  title: "Chemistrie Driving",
  description:
  "Specialty driving tints optimized for road contrast and glare reduction at the wheel.",
  href: "https://www.forecps.com/chemistrie-driving",
  accent: "hsl(var(--primary))"
},
{
  icon: Monitor,
  title: "Chemistrie Blue",
  description:
  "Blue light filtering clip for digital device use. Reduces digital eye strain throughout the workday.",
  href: "https://www.forecps.com/chemistrie-blue",
  accent: "hsl(var(--accent))"
},
{
  icon: Leaf,
  title: "Chemistrie Avulux",
  description:
  "Precision light filtering for migraine and light sensitivity sufferers. Developed with clinical research.",
  href: "https://www.forecps.com/avulux",
  accent: "hsl(var(--primary))"
},
{
  icon: FlowerIcon,
  title: "Chemistrie FL-41",
  description:
  "Rose-tinted FL-41 filter for photophobia, blepharospasm, and light-triggered headache relief.",
  href: "https://www.forecps.com/fl41",
  accent: "hsl(var(--accent))"
},
{
  icon: Film,
  title: "Chemistrie 3D",
  description:
  "Premium 3D clip for cinema use. Fits over prescription frames with no compromise to optical clarity.",
  href: "https://www.forecps.com/3d",
  accent: "hsl(var(--primary))"
},
{
  icon: Eye,
  title: "Color Deficiency",
  description:
  "Specialty clip for color vision deficiency, helping patients perceive a broader color spectrum.",
  href: "https://www.forecps.com/color-deficiency",
  accent: "hsl(var(--accent))"
}];


const SOLID_COLORS = [
{ name: "Grey", hex: "#6B7280" },
{ name: "Brown", hex: "#92400E" },
{ name: "G-15", hex: "#4B5320" },
{ name: "Blue", hex: "#1E40AF" },
{ name: "Copper", hex: "#B45309" },
{ name: "Amber", hex: "#D97706" },
{ name: "Pink", hex: "#DB2777" },
{ name: "Purple", hex: "#7C3AED" }];


const MIRROR_COLORS = [
{ name: "Silver Mirror", hex: "#C0C0C0" },
{ name: "Gold Mirror", hex: "#D4AF37" },
{ name: "Blue Mirror", hex: "#3B82F6" },
{ name: "Green Mirror", hex: "#16A34A" },
{ name: "Rose Gold Mirror", hex: "#C7849C" },
{ name: "Red Mirror", hex: "#DC2626" },
{ name: "Orange Mirror", hex: "#EA580C" },
{ name: "Purple Mirror", hex: "#9333EA" }];


const GRADIENT_COLORS = [
{ name: "Grey Gradient", top: "#6B7280", bottom: "#D1D5DB" },
{ name: "Brown Gradient", top: "#92400E", bottom: "#FDE68A" },
{ name: "Blue Gradient", top: "#1E40AF", bottom: "#BFDBFE" },
{ name: "Pink Gradient", top: "#DB2777", bottom: "#FBD3E9" }];


const BRIDGE_COLORS = [
{ name: "Bronze", hex: "#CD7F32" },
{ name: "Gunmetal", hex: "#2C3E50" },
{ name: "Gold", hex: "#D4AF37" },
{ name: "Silver", hex: "#A8A9AD" },
{ name: "Black", hex: "#1A1A1A" }];


const MAGNET_COLORS = [
{ name: "Gunmetal", hex: "#2C3E50" },
{ name: "Gold", hex: "#D4AF37" },
{ name: "Silver", hex: "#A8A9AD" }];


const MAGNET_SHAPES = ["Round"];

const SWAROVSKI = [
"Crystal Clear",
"Crystal AB",
"Jet Black",
"Rose",
"Aquamarine",
"Sapphire",
"Peridot",
"Amethyst",
"Topaz",
"Citrine",
"Ruby",
"Emerald"];


const SPECS = [
{ icon: Settings, label: "Custom-made in-house", detail: "Crafted to your exact order specifications" },
{ icon: Layers, label: "Fits virtually any frame", detail: "Proprietary base-curve matching system" },
{ icon: Shield, label: "100% UV protection", detail: "Full UV400 blocking on all clip models" },
{ icon: Feather, label: "Extremely lightweight", detail: "Titanium bridge construction, feather-light" },
{ icon: Magnet, label: "Secure magnetic attachment", detail: "Square or round magnet options" },
{ icon: Sparkles, label: "Swarovski crystal options", detail: "12 premium crystal colors available" }];


/* ─────────────── COMPONENT ─────────────── */

export default function ProfessionalsChemistriePage() {
  const [tab, setTab] = useState("sun-colors");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative min-h-[92vh] pt-16 overflow-hidden">
        {/* Background image fills the entire section */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover">
            
            <source src="https://www.forecps.com/wp-content/uploads/2025/06/chem-sun-short.mp4" type="video/mp4" />
          </video>
          {/* Gradient overlay: transparent on right → dark on left */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/10" />
        </div>

        {/* Content */}
        <div className="relative container mx-auto flex min-h-[calc(92vh-4rem)] items-center px-4 lg:px-8">
          <div className="max-w-xl py-16">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
              For Eyecare Professionals
            </p>
            <h1 className="mb-6 text-5xl font-bold leading-tight text-foreground lg:text-6xl">
              Chemistrie<br />
              <span className="text-primary">Lens System</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
              The world's #1 magnetic clip-on lens system. Custom-made in-house,
              base-curve matched to fit virtually any frame your patient chooses.
            </p>

            <ul className="mb-10 space-y-3">
              {[
              "24 polarized color options — solid, mirror & gradient",
              "Titanium bridge in 5 colours, magnets in 3 shapes",
              "Optional Swarovski crystal embellishments"].
              map((item) =>
              <li key={item} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm">{item}</span>
                </li>
              )}
            </ul>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/professionals/trade-account">Apply for Trade Account</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="https://www.forecps.com" target="_blank" rel="noopener noreferrer">
                  Visit ForECPs.com <ExternalLink className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ STAT BAR ══════════════ */}
      <section className="border-y border-border bg-muted/40">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-border lg:grid-cols-4">
            {STATS.map((s) =>
            <div key={s.label} className="flex flex-col items-center gap-1 px-6 py-8 text-center">
                <span className="text-3xl font-bold text-primary lg:text-4xl">{s.value}</span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ ABOUT ══════════════ */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Magnetic Lens Layering Technology
              </p>
              <h2 className="mb-6 text-3xl font-bold text-foreground lg:text-4xl">
                One Frame. Infinite Possibilities.
              </h2>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                Chemistrie uses a proprietary magnetic attachment system that allows a
                secondary functional lens to be placed precisely over a primary ophthalmic lens.
                Each clip is custom-manufactured to match the base curve of the primary lens,
                ensuring optical accuracy and a seamless fit.
              </p>
              <p className="mb-8 text-muted-foreground leading-relaxed">
                Unlike traditional clip-ons, Chemistrie attaches to a titanium bridge fitted
                on the primary lens — not the frame — meaning it works with virtually any
                eyewear your patient selects, including drill-mounts and rimless designs.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <a
                    href="https://www.forecps.com/chemistrie-technology"
                    target="_blank"
                    rel="noopener noreferrer">
                    
                    Explore the Technology <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/professionals/customer-service">Contact Our Team</Link>
                </Button>
              </div>
            </div>

            {/* Right: visual feature tiles */}
            <div className="grid grid-cols-2 gap-4">
              {[
              { icon: Layers, title: "Base-Curve Matched", desc: "Every clip is precision-fitted to the primary lens curvature" },
              { icon: Magnet, title: "Magnetic Bridge", desc: "Titanium bridge bonds to the lens, not the frame" },
              { icon: Feather, title: "Feather-Light", desc: "Near-weightless wear — patients forget they have it on" },
              { icon: Award, title: "Lab-Controlled", desc: "Custom-manufactured in-house for quality assurance" }].
              map(({ icon: Icon, title, desc }) =>
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ PRODUCT LINE ══════════════ */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              The Full Range
            </p>
            <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
              Chemistrie Product Line
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Eight distinct solutions, one unified system. Stock the full range to
              address every patient's functional and lifestyle needs.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map(({ icon: Icon, title, description, href, accent }) =>
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5">
              
                <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ background: accent }}>
                
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
                <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
                <div className="mt-5 flex items-center gap-1 text-xs font-medium text-primary">
                  View on ForECPs.com
                  <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ STYLE OPTIONS ══════════════ */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Customisation
            </p>
            <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
              Style Options
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Every Chemistrie order is bespoke. Help your patients personalise their
              look across lenses, hardware, and premium embellishments.
            </p>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex justify-center mb-8">
              <TabsList className="h-auto gap-1 p-1">
                <TabsTrigger value="sun-colors" className="px-5 py-2 text-sm">
                  Sunlens Colors
                </TabsTrigger>
                <TabsTrigger value="hardware" className="px-5 py-2 text-sm">
                  Bridges & Magnets
                </TabsTrigger>
                <TabsTrigger value="swarovski" className="px-5 py-2 text-sm">
                  Swarovski Crystals
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Tab 1: Sun Colors ── */}
            <TabsContent value="sun-colors" className="space-y-8">
              {[
              { label: "Solid Polarized", colors: SOLID_COLORS, gradient: false },
              { label: "Mirror Polarized", colors: MIRROR_COLORS, gradient: false }].
              map(({ label, colors }) =>
              <div key={label}>
                  <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {colors.map((c) =>
                  <div key={c.name} className="flex flex-col items-center gap-1.5">
                        <div
                      className="h-10 w-10 rounded-full border-2 border-border shadow-sm"
                      style={{ background: c.hex }}
                      title={c.name} />
                    
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{c.name}</span>
                      </div>
                  )}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Gradient Polarized
                </p>
                <div className="flex flex-wrap gap-3">
                  {GRADIENT_COLORS.map((c) =>
                  <div key={c.name} className="flex flex-col items-center gap-1.5 px-[19px]">
                      <div
                      className="h-10 w-10 rounded-full border-2 border-border shadow-sm"
                      style={{
                        background: `linear-gradient(to bottom, ${c.top}, ${c.bottom})`
                      }}
                      title={c.name} />
                    
                      <span className="text-xs text-muted-foreground whitespace-nowrap max-w-[56px] text-center leading-tight">
                        {c.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                All polarized lenses provide 100% UV400 protection.
                <a
                  href="https://www.forecps.com/chemistrie-sun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline">
                  
                  Full colour chart at ForECPs.com →
                </a>
              </p>
            </TabsContent>

            {/* ── Tab 2: Hardware ── */}
            <TabsContent value="hardware" className="space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Titanium Bridge Colors
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {BRIDGE_COLORS.map((c) =>
                    <div key={c.name} className="flex flex-col items-center gap-1.5">
                        <div
                        className="h-10 w-10 rounded-full border-2 border-border shadow-sm"
                        style={{ background: c.hex }} />
                      
                        <span className="text-xs text-muted-foreground">{c.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Magnet Colors
                  </p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {MAGNET_COLORS.map((c) =>
                    <div key={c.name} className="flex flex-col items-center gap-1.5">
                        <div
                        className="h-10 w-10 rounded-full border-2 border-border shadow-sm"
                        style={{ background: c.hex }} />
                      
                        <span className="text-xs text-muted-foreground">{c.name}</span>
                      </div>
                    )}
                  </div>
                  <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Magnet Shape
                  </p>
                  <div className="flex gap-3">
                    {MAGNET_SHAPES.map((shape) =>
                    <span
                      key={shape}
                      className="rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
                      
                        {shape}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 3: Swarovski ── */}
            <TabsContent value="swarovski">
              <p className="mb-6 text-muted-foreground">
                Elevate any Chemistrie order with genuine Swarovski crystal embellishments,
                available in 12 premium colours applied to the bridge hardware.
              </p>
              <div className="flex flex-wrap gap-3">
                {SWAROVSKI.map((name) =>
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                  
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {name}
                  </div>
                )}
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Swarovski crystals are an optional add-on to any Chemistrie Sun order.
                Contact our team for product samples.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ══════════════ KEY SPECS ══════════════ */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Technical Specifications
            </p>
            <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
              Built for Professionals
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SPECS.map(({ icon: Icon, label, detail }) =>
            <div
              key={label}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
              
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA STRIP ══════════════ */}
      <section className="bg-primary py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground lg:text-4xl">
              Order Chemistrie for Your Practice
            </h2>
            <p className="mb-10 text-primary-foreground/80 text-lg">
              Classic Vision is an authorised Chemistrie laboratory. Contact our team
              to discuss pricing, demo kits, and wholesale account setup.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <Button
                size="lg"
                variant="secondary"
                asChild>
                
                <Link to="/professionals/trade-account">
                  Apply for a Trade Account <ArrowRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                className="border-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                asChild>
                
                <Link to="/professionals/customer-service">Contact Us</Link>
              </Button>
            </div>

            {/* Contact details */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8 text-primary-foreground/70 text-sm">
              <a href="tel:+12464334928" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4" />
                +1 246 433-4928
              </a>
              <a href="mailto:support@optivisionnow.com" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4" />
                support@optivisionnow.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>);

}