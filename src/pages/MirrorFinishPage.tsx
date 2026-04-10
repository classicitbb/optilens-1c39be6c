import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
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

const finishComparisonRows = [
  {
    finish: "Silver Flash",
    intensity: "Medium",
    condition: "Bright all-day sun",
    baseTint: "Gray / smoke",
    notes: "Balanced appearance with neutral color perception.",
  },
  {
    finish: "Blue Ice",
    intensity: "High",
    condition: "Water, coastal, high-glare",
    baseTint: "Gray / blue-gray",
    notes: "Popular for sport styling and high reflective cosmetics.",
  },
  {
    finish: "Rose Gold",
    intensity: "Medium",
    condition: "Lifestyle, city sun",
    baseTint: "Brown / amber",
    notes: "Warmer aesthetic with premium fashion positioning.",
  },
  {
    finish: "Emerald Green",
    intensity: "High",
    condition: "Trail, variable terrain",
    baseTint: "Brown / green",
    notes: "Sport-led look with strong outdoor contrast perception.",
  },
];

const bestForTags = ["Driving", "Beach", "Cycling", "Ski / Snow", "Outdoor sports"];

const bestUseCases = [
  "Sunglass dispensing where cosmetic appeal and glare reduction are priorities.",
  "Outdoor and sport eyewear requiring high visible-light rejection.",
  "Fashion-forward frames that benefit from a reflective, statement finish.",
  "Ski, water, and driving applications where intense light management is needed.",
];

const compatibilityNotes = [
  "Mirror coatings are applied on top of a base tint — they do not replace tinting.",
  "Best paired with backside AR treatments for reduced ghost reflections.",
  "Not all lens materials accept every mirror color; confirm with lab before ordering.",
  "Flash mirrors (lighter reflection) are available for subtler cosmetic effects.",
];

const limitations = [
  "Mirror coatings do not provide UV protection on their own — a UV-blocking substrate or treatment is still required.",
  "They are not scratch-proof; a hard coat underneath is recommended.",
  "Reflective layers can show fingerprints and smudges more readily than standard tints.",
  "Mirror finishes may not be suitable for indoor or low-light use due to reduced light transmission.",
];

const careTips = [
  "Clean with a microfiber cloth and lens-safe spray — avoid paper towels or rough fabrics.",
  "Store lenses in a hard case to prevent surface abrasion.",
  "Avoid placing lenses face-down on hard surfaces.",
  "Periodic professional cleaning can extend the life of the mirror layer.",
];

const relatedGuides = [
  {
    title: "Super AR coating",
    description: "Pair mirror fronts with backside anti-reflective performance for cleaner optics.",
    to: "/coatings/ultraclear-ar",
  },
  {
    title: "Blue Defense AR+ coating",
    description: "Compare reflective color behavior with blue-light management and AR stacks.",
    to: "/coatings/blueblock-ar",
  },
  {
    title: "Hydrophobic + oleophobic topcoat",
    description: "Improve smudge resistance and cleanability on finished mirror lenses.",
    to: "/coatings/hydrophobic-oleophobic",
  },
  {
    title: "Knowledge: caring for coated lenses",
    description: "Review cleaning and care best practices for long-lasting mirror coatings.",
    to: "/knowledge#caring-for-coated-lenses",
  },
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

              <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Best use scenarios for mirror coatings">
                {bestForTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                    Best for: {tag}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Not ideal for mostly indoor wearers or low-light commuting due to reduced transmission.
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

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground">Finish comparison</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use this quick matrix to match finish style, environment, and base tint recommendations.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 font-semibold text-foreground">Finish</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Cosmetic intensity</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Best light condition</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Typical base tint</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishComparisonRows.map((row) => (
                      <tr key={row.finish} className="border-b border-border/70 last:border-0">
                        <td className="px-3 py-2 text-foreground">{row.finish}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.intensity}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.condition}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.baseTint}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

            <div className="grid gap-6 lg:grid-cols-2">
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

          <section className="mt-8 rounded-xl border border-border bg-card p-6" aria-labelledby="related-guides-heading">
            <h2 id="related-guides-heading" className="text-xl font-semibold text-foreground">
              Related guides
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue with complementary coating references often reviewed alongside mirror finish options.
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
                <Link to="/store">Shop mirror lens options</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/professionals/lens-ordering-tips">Professional ordering & compatibility</Link>
              </Button>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MirrorFinishPage;
