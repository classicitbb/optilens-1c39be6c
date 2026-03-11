import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import heroLensesImage from "@/assets/hero-lenses.jpg";
import chemistrieHeroImage from "@/assets/chemistrie-hero.jpg";

const highlights = [
  "Enhances cosmetic appeal with fashion-forward reflective color options.",
  "Adds comfort in bright environments by reducing glare and visible light intensity.",
  "Pairs with AR back-surface treatments to maintain visual clarity.",
  "Commonly selected for sunglass, sport, and outdoor lifestyle dispensing.",
];

const popularFinishes = [
  {
    name: "Silver Flash",
    descriptor: "A neutral metallic mirror that pairs with gray and smoke base tints.",
    swatchClass: "bg-gradient-to-br from-zinc-100 via-zinc-300 to-zinc-500",
  },
  {
    name: "Blue Ice",
    descriptor: "Cool reflective blue for ocean, snow, and high-glare activities.",
    swatchClass: "bg-gradient-to-br from-sky-200 via-blue-400 to-indigo-600",
  },
  {
    name: "Rose Gold",
    descriptor: "Warm premium tone that softens contrast while keeping a fashion look.",
    swatchClass: "bg-gradient-to-br from-amber-100 via-rose-300 to-amber-500",
  },
  {
    name: "Emerald Green",
    descriptor: "Sport-forward reflective green with high perceived contrast outdoors.",
    swatchClass: "bg-gradient-to-br from-emerald-100 via-emerald-400 to-teal-600",
  },
  {
    name: "Sunset Copper",
    descriptor: "Copper mirror optimized for variable light and trail environments.",
    swatchClass: "bg-gradient-to-br from-orange-200 via-amber-400 to-red-500",
  },
  {
    name: "Violet Chrome",
    descriptor: "Bold violet reflection for statement sunglasses and lifestyle frames.",
    swatchClass: "bg-gradient-to-br from-fuchsia-200 via-violet-400 to-purple-600",
  },
];

const bestUseCases = [
  "Water, snow, and beach dispensing where bright-light intensity is consistently high.",
  "Sport and driving sunwear where wearers want both comfort and a high-reflection cosmetic look.",
  "Outdoor occupational eyewear when sunglass performance and appearance are both priorities.",
  "Lifestyle sunglasses that benefit from color-matched mirror aesthetics.",
];

const compatibilityNotes = [
  "AR: Back-surface AR is recommended to reduce internal reflections and improve clarity.",
  "Polarization: Mirror + polarized is a common premium stack for reflected glare from roads, water, and snow.",
  "Photochromic: Available in select programs; mirror color can make the light-state transition appear less obvious.",
];

const limitations = [
  "Mirror coatings do not replace UV protection; UV coverage depends on lens material and treatment specs.",
  "They do not correct prescription, centration, or fitting errors.",
  "They do not fully replace polarization for harsh reflected glare control.",
  "They do not make lenses scratch-proof or impact-proof without appropriate material and care.",
];

const careTips = [
  "Rinse debris before wiping, then use approved lens cleaner and microfiber.",
  "Avoid dry wiping, paper towels, and household cleaners that can damage top coats.",
  "Store in a hard case to reduce cosmetic wear during transport.",
  "Avoid prolonged high heat (for example, dashboard storage) to preserve coating durability.",
];

const MirrorFinishPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-4xl px-4 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground">Mirror Coatings & Finish Guide</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Mirror coatings apply a reflective top layer to tinted or sun lenses, supporting bright-light comfort with a
            distinct cosmetic finish.
          </p>

          <section className="mt-8 space-y-6" aria-labelledby="mirror-finish-visuals-heading">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 id="mirror-finish-visuals-heading" className="text-xl font-semibold text-foreground">
                Mirror finish style gallery
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Compare lifestyle styling with close-up reflective detail to guide finish selection.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <figure className="overflow-hidden rounded-lg border border-border/80 bg-muted/20">
                  <img
                    src={heroLensesImage}
                    alt="Lifestyle eyewear with mirrored sun lenses worn outdoors in bright light"
                    className="h-56 w-full object-cover"
                    loading="lazy"
                  />
                  <figcaption className="px-4 py-3 text-sm text-muted-foreground">Lifestyle mirror lens application</figcaption>
                </figure>

                <figure className="overflow-hidden rounded-lg border border-border/80 bg-muted/20">
                  <img
                    src={chemistrieHeroImage}
                    alt="Close-up of mirrored lens surface showing high-reflection color and sheen"
                    className="h-56 w-full object-cover"
                    loading="lazy"
                  />
                  <figcaption className="px-4 py-3 text-sm text-muted-foreground">
                    Close-up reflection and finish texture
                  </figcaption>
                </figure>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground">Popular mirror finishes</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Popular mirror finish options">
                {popularFinishes.map((finish) => (
                  <article key={finish.name} role="listitem" className="rounded-lg border border-border/80 bg-background p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-8 w-8 shrink-0 rounded-full border border-white/40 shadow-sm ${finish.swatchClass}`}
                        aria-hidden="true"
                      />
                      <h4 className="font-medium text-foreground">{finish.name}</h4>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{finish.descriptor}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-6" aria-labelledby="mirror-finish-guidance-heading">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">When to recommend mirror coatings</h2>
              <ul className="mt-4 space-y-3">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 id="mirror-finish-guidance-heading" className="text-xl font-semibold text-foreground">
                Best use-cases
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                {bestUseCases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3 className="mt-6 text-lg font-semibold text-foreground">Compatibility notes</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                {compatibilityNotes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">What mirror coatings do not do</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                {limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Care & durability tips</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                {careTips.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <p className="mt-8 text-sm text-muted-foreground">
            Canonical slug: <code>/coatings/mirror</code>. Legacy <code>/coatings/mirrors</code> requests are redirected.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MirrorFinishPage;
