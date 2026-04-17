import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import tintLifestyleApplicationImage from "@/assets/tints-lifestyle-application.jpg";
import tintGradientBehaviorImage from "@/assets/tints-gradient-behavior.jpg";

const highlights = [
  "Offers cosmetic personalization with functional light-management benefits.",
  "Available in solid, gradient, and dual-tone programs for style-driven dispensing.",
  "Can be combined with UV, AR, and hydrophobic stacks based on wear environment.",
  "Helps practitioners position sunwear and lifestyle second-pair recommendations.",
];

const tintPalette = [
  {
    name: "Classic Gray",
    descriptor: "Neutral tone for true color perception and broad outdoor usability.",
    swatchClass: "bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-700",
  },
  {
    name: "Warm Brown",
    descriptor: "Enhances contrast and depth perception in mixed, changing light.",
    swatchClass: "bg-gradient-to-br from-amber-100 via-amber-400 to-orange-700",
  },
  {
    name: "Performance G-15",
    descriptor: "Balanced green tint favored for road, water, and sport applications.",
    swatchClass: "bg-gradient-to-br from-emerald-100 via-emerald-400 to-green-700",
  },
  {
    name: "Fashion Rose",
    descriptor: "Soft pink cosmetic tint for boutique and statement frame styling.",
    swatchClass: "bg-gradient-to-br from-rose-100 via-pink-300 to-fuchsia-600",
  },
  {
    name: "Ocean Blue",
    descriptor: "Cool blue tone for coastal aesthetics and bright-day style positioning.",
    swatchClass: "bg-gradient-to-br from-sky-100 via-blue-400 to-indigo-700",
  },
  {
    name: "Sunset Copper",
    descriptor: "High-contrast copper hue for trail and variable terrain wear.",
    swatchClass: "bg-gradient-to-br from-orange-200 via-red-400 to-amber-700",
  },
  {
    name: "Graphite Smoke",
    descriptor: "Deeper neutral charcoal tint commonly specified in high-brightness markets.",
    swatchClass: "bg-gradient-to-br from-slate-200 via-slate-500 to-slate-900",
  },
  {
    name: "Bronze Gold",
    descriptor: "Warm, premium bronze family tint used in lifestyle and luxury sunglass dispensing.",
    swatchClass: "bg-gradient-to-br from-yellow-100 via-amber-300 to-yellow-700",
  },
  {
    name: "Tea Amber",
    descriptor: "Classic tea-tone tint for comfortable contrast in hazy and variable weather.",
    swatchClass: "bg-gradient-to-br from-orange-100 via-amber-300 to-orange-600",
  },
  {
    name: "Olive Field",
    descriptor: "Muted olive tone designed for trail, hunting, and outdoor utility eyewear.",
    swatchClass: "bg-gradient-to-br from-lime-100 via-lime-400 to-green-800",
  },
  {
    name: "Violet Plum",
    descriptor: "Boutique-forward violet tint used for fashion statements and color collections.",
    swatchClass: "bg-gradient-to-br from-violet-100 via-purple-400 to-fuchsia-700",
  },
  {
    name: "Ruby Red",
    descriptor: "Bold cosmetic red used in select fashion capsules and trend-driven retail lines.",
    swatchClass: "bg-gradient-to-br from-rose-100 via-red-400 to-red-700",
  },
];

const gradientPalette = [
  {
    name: "Gray Fade",
    descriptor: "Dark top with lighter lower zone for all-day wear across indoor-outdoor transitions.",
    swatchClass: "bg-gradient-to-b from-zinc-700 via-zinc-400 to-zinc-100",
  },
  {
    name: "Brown Fade",
    descriptor: "Comfort-forward driving gradient that keeps contrast while improving dashboard visibility.",
    swatchClass: "bg-gradient-to-b from-amber-700 via-amber-400 to-amber-100",
  },
  {
    name: "G-15 Fade",
    descriptor: "Sport-inspired green gradient for active use and mixed ambient light.",
    swatchClass: "bg-gradient-to-b from-emerald-700 via-emerald-400 to-emerald-100",
  },
  {
    name: "Blue Horizon",
    descriptor: "Dark marine top fade with a lighter base for coastal and travel sunwear collections.",
    swatchClass: "bg-gradient-to-b from-blue-800 via-blue-500 to-sky-100",
  },
  {
    name: "Rose Mist",
    descriptor: "Fashion-led rose gradient used in feminine and boutique frame programs.",
    swatchClass: "bg-gradient-to-b from-fuchsia-700 via-rose-400 to-pink-100",
  },
  {
    name: "Sunset Fade",
    descriptor: "Copper-to-amber gradient common in lifestyle and resort assortments.",
    swatchClass: "bg-gradient-to-b from-orange-700 via-amber-400 to-yellow-100",
  },
];

const comparisonRows = [
  {
    tint: "Classic Gray",
    category: "Solid",
    transmission: "15–25%",
    bestFor: "General bright sunlight",
    notes: "Most neutral color rendering across environments.",
  },
  {
    tint: "Warm Brown",
    category: "Solid / Gradient",
    transmission: "18–35%",
    bestFor: "Driving, everyday outdoor",
    notes: "Comfortable contrast and reduced scattered glare perception.",
  },
  {
    tint: "Performance G-15",
    category: "Solid",
    transmission: "12–20%",
    bestFor: "Sport and water",
    notes: "Popular premium sunwear baseline with balanced comfort.",
  },
  {
    tint: "Fashion Rose",
    category: "Fashion",
    transmission: "30–60%",
    bestFor: "Style-first lifestyle use",
    notes: "Prioritizes cosmetic look over maximum light attenuation.",
  },
  {
    tint: "Gray Fade",
    category: "Gradient",
    transmission: "15–65%",
    bestFor: "Indoor-outdoor transitions",
    notes: "Most globally stocked gradient profile for everyday wear.",
  },
  {
    tint: "Brown Fade",
    category: "Gradient",
    transmission: "18–70%",
    bestFor: "Driving and city use",
    notes: "Maintains useful contrast while reducing top-field brightness.",
  },
];

const dispensingGuidance = [
  "Start with wear goal first: all-day sun comfort, sport contrast, or fashion styling.",
  "Confirm target transmission range before selecting final tint density.",
  "Use gradients for users moving between outdoor and intermittent indoor environments.",
  "Pair with backside AR for improved visual quality and reduced internal reflections.",
];

const bestUseCases = [
  "Prescription sunwear for driving, commuting, and outdoor social activities.",
  "Second-pair sales in boutique practices focused on cosmetic customization.",
  "Sport and active lifestyle frames requiring tuned contrast behavior.",
  "Fashion collections where tint color is part of frame-and-style storytelling.",
];

const limitations = [
  "Very dark tints can reduce visibility in low-light or indoor transitions.",
  "Certain color-forward fashion tints may shift perceived hue in critical tasks.",
  "Not every lens material accepts every tint family with identical outcomes.",
  "Tint density can vary between labs; trial swatches and QA checks are recommended.",
];

const careTips = [
  "Rinse lenses before wiping to reduce micro-abrasion from trapped particles.",
  "Use lens-safe cleaning spray and microfiber cloths only.",
  "Avoid prolonged heat exposure (car dashboards, saunas) that can stress coatings.",
  "Store in a case and avoid stacking lenses face-to-face.",
];

const relatedGuides = [
  {
    title: "Mirror coatings",
    description: "Layer reflective finishes over tint bases for added glare and cosmetic control.",
    to: "/coatings/mirror",
  },
  {
    title: "UV shield coating",
    description: "Review how UV protection complements visible-light tinting programs.",
    to: "/coatings/uv-shield",
  },
  {
    title: "Hydrophobic + oleophobic topcoat",
    description: "Improve cleanability and day-to-day durability on tinted lenses.",
    to: "/coatings/hydrophobic-oleophobic",
  },
  {
    title: "Lens ordering tips",
    description: "Learn how to communicate tint density and finish requirements to the lab.",
    to: "/professionals/lens-ordering-tips",
  },
];

const bestForTags = ["Driving", "Lifestyle", "Sport", "Boutique fashion", "Outdoor leisure"];

const TintsFashionColorsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-4xl px-4 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground">Tints & Fashion Colors Guide</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tint programs combine optical performance with personal style, helping patients choose lens color, transmission,
            and aesthetic impact that fits how and where they wear their eyewear.
          </p>

          <section className="mt-8 space-y-6" aria-labelledby="tints-visuals-heading">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 id="tints-visuals-heading" className="text-xl font-semibold text-foreground">
                Tint styles in practice
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                From neutral sunwear to high-fashion palettes, tint selection balances cosmetic preference and visual comfort.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <figure className="overflow-hidden rounded-lg border border-border/80 bg-muted/20">
                  <img
                    src={tintLifestyleApplicationImage}
                    alt="Lifestyle eyewear showcasing tinted lenses in bright outdoor light"
                    className="h-56 w-full object-cover"
                    loading="lazy"
                  />
                  <figcaption className="px-4 py-3 text-sm text-muted-foreground">Lifestyle tint application</figcaption>
                </figure>

                <figure className="overflow-hidden rounded-lg border border-border/80 bg-muted/20">
                  <img
                    src={tintGradientBehaviorImage}
                    alt="Close-up view of lens tint color and gradient transitions"
                    className="h-56 w-full object-cover"
                    loading="lazy"
                  />
                  <figcaption className="px-4 py-3 text-sm text-muted-foreground">Color, density, and gradient behavior</figcaption>
                </figure>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground">Popular solid & fashion tint palette</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Popular tint options">
                {tintPalette.map((tint) => (
                  <article key={tint.name} role="listitem" className="rounded-lg border border-border/80 bg-background p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-8 w-8 shrink-0 rounded-full border border-white/40 shadow-sm ${tint.swatchClass}`}
                        aria-hidden="true"
                      />
                      <h4 className="font-medium text-foreground">{tint.name}</h4>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tint.descriptor}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground">Popular gradient tint palette</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                These fade programs reflect globally common standard options carried across most mainstream lens labs.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Popular gradient tint options">
                {gradientPalette.map((tint) => (
                  <article key={tint.name} role="listitem" className="rounded-lg border border-border/80 bg-background p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-8 w-8 shrink-0 rounded-full border border-white/40 shadow-sm ${tint.swatchClass}`}
                        aria-hidden="true"
                      />
                      <h4 className="font-medium text-foreground">{tint.name}</h4>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tint.descriptor}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground">Quick comparison matrix</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Match tint family, transmission range, and patient lifestyle needs before finalizing the order.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 font-semibold text-foreground">Tint</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Category</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Typical transmission</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Best environment</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.tint} className="border-b border-border/70 last:border-0">
                        <td className="px-3 py-2 text-foreground">{row.tint}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.transmission}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.bestFor}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-6" aria-labelledby="tint-guidance-heading">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Dispensing highlights</h2>
              <ul className="mt-4 space-y-3">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-2" aria-label="Best for environments">
                {bestForTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 id="tint-guidance-heading" className="text-xl font-semibold text-foreground">
                  Best use-cases
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                  {bestUseCases.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h3 className="mt-6 text-lg font-semibold text-foreground">Selection checklist</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                  {dispensingGuidance.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-xl font-semibold text-foreground">Limitations to discuss</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                  {limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h3 className="mt-6 text-lg font-semibold text-foreground">Care & longevity tips</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                  {careTips.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-border bg-card p-6" aria-labelledby="tints-related-heading">
            <h2 id="tints-related-heading" className="text-xl font-semibold text-foreground">
              Related guides
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue exploring related resources often reviewed while specifying tint and fashion-color jobs.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {relatedGuides.map((guide) => (
                <Link
                  key={guide.to}
                  to={guide.to}
                  className="rounded-lg border border-border/80 bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <h3 className="text-sm font-semibold text-foreground">{guide.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{guide.description}</p>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/store">Shop tinted lens options</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/professionals/dispensing-tips">Professional dispensing guidance</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TintsFashionColorsPage;
