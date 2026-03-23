import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Eye,
  FlaskConical,
  Glasses,
  Lightbulb,
  Monitor,
  Shield,
  ShieldAlert,
  Sun,
  Waves,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

/* ─── anchor sections ─── */
const SECTIONS = [
  { id: "what-is-blue-light", label: "What Is Blue Light?", icon: <Sun className="h-4 w-4" /> },
  { id: "blue-filter-types", label: "The Terms Explained", icon: <Glasses className="h-4 w-4" /> },
  { id: "caribbean-context", label: "Caribbean Context", icon: <Waves className="h-4 w-4" /> },
  { id: "the-science", label: "What the Science Says", icon: <FlaskConical className="h-4 w-4" /> },
  { id: "bv-coatings", label: "BV Coatings — Debunked", icon: <ShieldAlert className="h-4 w-4" /> },
  { id: "blue-look", label: 'Blue-Look Cosmetic Lenses', icon: <Eye className="h-4 w-4" /> },
  { id: "digital-eye-strain", label: "Digital Eye Strain Truth", icon: <Monitor className="h-4 w-4" /> },
  { id: "when-useful", label: "When Blue Filters Help", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "dispensing-guide", label: "How We Talk About It", icon: <BookOpen className="h-4 w-4" /> },
];

/* ─── spectrum data ─── */
const SPECTRUM = [
  { range: "380–410 nm", name: "UV-A / Near-UV", color: "bg-violet-600", danger: "High", note: "Absorbed mostly by cornea & crystalline lens. True UV — blocked by quality lens materials regardless of coating." },
  { range: "410–440 nm", name: "Blue-Violet (BV)", color: "bg-violet-500", danger: "Moderate (debated)", note: "Often marketed as 'harmful blue light'. Lab studies on isolated retinal cells don't translate to real-world exposure." },
  { range: "440–500 nm", name: "Blue-Turquoise", color: "bg-blue-500", danger: "Low / Beneficial", note: "Essential for circadian rhythm, pupil response, colour vision. Filtering this range harms more than it helps." },
  { range: "500–780 nm", name: "Green → Red", color: "bg-green-500", danger: "Negligible", note: "Standard visible light. No filtering needed or recommended." },
];

const TERM_GUIDE = [
  {
    title: "True Blue Filter Lens",
    status: "preferred" as const,
    description:
      "The lens material or a selective filter meaningfully reduces part of short-wavelength visible light. This is the clearest customer-facing term when the lens is actually filtering blue light rather than just reflecting a blue colour at the surface.",
  },
  {
    title: "Blue-Reflective Coating",
    status: "limited" as const,
    description:
      "A coating that reflects some wavelengths and often creates a visible blue or purple reflex on the front of the lens. It is not the same thing as a true blue filter lens, and the real-world benefit is usually modest compared with premium clear AR, UV protection, and glare control.",
  },
  {
    title: "Blue-Look / Cosmetic Blue",
    status: "cosmetic" as const,
    description:
      "An appearance-driven blue mirror or blue-tinted look. It may look protective, but the visible colour alone does not tell you how much short-wavelength light is being filtered.",
  },
];

const CARIBBEAN_FACTORS = [
  {
    title: "Sunlight is the big exposure source",
    body:
      "Screens are a tiny blue-light source compared with daylight. In bright Caribbean conditions, the more practical conversation is about sunlight, UV, and environmental glare — not fear of phones.",
  },
  {
    title: "Water, sand, and roads add reflected light",
    body:
      "Near water, beaches, and bright roads, light reflects back toward the eye. That makes UV control, glare management, and good lens selection especially relevant for everyday comfort outdoors.",
  },
  {
    title: "Blue filter is an add-on, not the whole answer",
    body:
      "If you want a lens that trims part of short-wavelength visible light, blue filter can be a sensible option. But it should sit alongside the fundamentals: UV protection first, then glare reduction, then the right lens design for your routine.",
  },
];

const LAYERED_RECOMMENDATIONS = [
  {
    title: "Start with UV protection",
    body: "In tropical daylight, full UV protection matters more than any blue-light marketing claim. That is your baseline layer of protection.",
  },
  {
    title: "Add glare control for outdoor comfort",
    body: "If you spend time driving, boating, at the beach, or moving between bright outdoor spaces, polarized or photochromic options often make the biggest day-to-day difference.",
  },
  {
    title: "Choose blue filter when you want true short-wavelength filtering",
    body: "For customers who specifically want that extra filtering step, we offer true blue filter lenses — not just a blue-looking front coating.",
  },
];

const BlueFilterPage = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        {/* Hero */}
        <section className="container mx-auto max-w-5xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Lifestyle Lenses</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Blue Filter Lenses — Clear Terms, Honest Guidance
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Blue filter lenses are often discussed using confusing terms. This guide explains what a true blue filter lens is,
            what it is not, and how to choose the right option for bright Caribbean living without buying into hype.
          </p>

          <Card className="mt-8 border-accent/30 bg-accent/5">
            <CardContent className="grid gap-5 p-6 md:grid-cols-[1.3fr_0.7fr] md:items-center">
              <div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">What we offer</Badge>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Yes — we sell true blue filter lenses</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  When a lens genuinely filters part of short-wavelength visible light, we call it a <strong className="text-foreground">blue filter lens</strong>.
                  We do <strong className="text-foreground">not</strong> use that term for a purely blue-reflective front coating or a cosmetic blue mirror look.
                </p>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-background/80 p-4">
                {[
                  "True filtering in the lens, not just a blue-looking surface",
                  "Honest recommendations matched to outdoor Caribbean conditions",
                  "Can be paired with premium AR, photochromic, or polarized options",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Jump nav */}
        <nav className="container mx-auto mt-8 max-w-5xl px-4 lg:px-8" aria-label="Page sections">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Jump to section
            </p>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {s.icon}
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <div className="container mx-auto max-w-5xl space-y-20 px-4 pt-12 lg:px-8">

          {/* ── 1. What Is Blue Light? ── */}
          <section id="what-is-blue-light" className="scroll-mt-32">
            <SectionHeading badge="Foundation" title="What Is Blue Light?" />
            <p className="mt-4 leading-relaxed text-muted-foreground">
              "Blue light" is simply high-energy visible (HEV) light between roughly 380 nm and 500 nm on the electromagnetic spectrum.
              It's emitted by the sun (by far the dominant source), LED lighting, and digital screens.
              The <strong>sun delivers far more blue-light irradiance</strong> than a phone or computer screen at typical use distances.
            </p>

            <h3 className="mt-8 text-lg font-semibold text-foreground">Visible Spectrum Breakdown</h3>
            <div className="mt-4 space-y-3">
              {SPECTRUM.map((band) => (
                <Card key={band.range} className="overflow-hidden border-border">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={`mt-1 h-5 w-5 shrink-0 rounded-full ${band.color}`} />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{band.range}</span>
                        <Badge variant="outline">{band.name}</Badge>
                        <Badge variant={band.danger === "High" ? "destructive" : "secondary"} className="text-[10px]">
                          Risk: {band.danger}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{band.note}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── 2. Filter Types ── */}
          <section id="blue-filter-types" className="scroll-mt-32">
            <SectionHeading badge="Definitions" title="The Terms Explained" />
            <p className="mt-4 max-w-4xl leading-relaxed text-muted-foreground">
              The terminology is where most confusion starts. Our preferred rule is simple: <strong className="text-foreground">blue filter</strong> should describe lenses that actually filter blue light,
              not lenses that merely look blue from the front.
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {TERM_GUIDE.map((item) => (
                <FilterTypeCard
                  key={item.title}
                  title={item.title}
                  status={item.status}
                  description={item.description}
                />
              ))}
            </div>
            <Card className="mt-6 border-border">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground">The simplest way to say it</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  If the lens <strong className="text-foreground">meaningfully reduces part of short-wavelength visible light</strong>, call it a blue filter lens.
                  If it mainly shows a visible blue or purple reflex on the surface, call it a blue-reflective coating.
                  If it is bought mostly for the look, call it cosmetic blue.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── 3. Caribbean Context ── */}
          <section id="caribbean-context" className="scroll-mt-32">
            <SectionHeading badge="Regional Context" title="Why This Matters in the Caribbean" />
            <p className="mt-4 max-w-4xl leading-relaxed text-muted-foreground">
              In the Caribbean, the conversation should start with outdoor light management. Sunlight, reflective water, bright sand,
              and road glare are much more relevant than screen fear. That is why we position blue filter as one part of a broader lens strategy — not the whole story.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {CARIBBEAN_FACTORS.map((item) => (
                <Card key={item.title} className="border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {LAYERED_RECOMMENDATIONS.map((item) => (
                <Card key={item.title} className="border-accent/30 bg-accent/5">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-accent" />
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── 4. The Science ── */}
          <section id="the-science" className="scroll-mt-32">
            <SectionHeading badge="Evidence" title="What the Science Actually Says" />
            <div className="mt-6 space-y-4">
              <EvidenceCard
                icon={<XCircle className="h-5 w-5 text-destructive" />}
                title="No proven retinal damage from screens"
                body="The 2018 University of Toledo study (Karunarathne et al.) that went viral was conducted on isolated retinal cells bathed in retinal (a chemical not normally exposed to light in intact eyes) under high-intensity blue LED — nothing like screen use. The American Academy of Ophthalmology explicitly states screens do not cause retinal damage."
              />
              <EvidenceCard
                icon={<XCircle className="h-5 w-5 text-destructive" />}
                title="Blue-filter lenses don't reduce digital eye strain"
                body="A 2021 Cochrane systematic review of 17 RCTs found no evidence that blue-light filtering lenses reduce eye strain, improve sleep quality, or protect the retina compared to non-blue-filter lenses. Strain comes from accommodation and vergence demand, not wavelength."
              />
              <EvidenceCard
                icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
                title="Circadian disruption is real — but the solution isn't a coating"
                body="Evening blue-light exposure (440–480 nm) suppresses melatonin. But BV coatings target the wrong band (415–435 nm) and reduce transmission by only 10–25%. Night-mode software, limiting screen time before bed, and ambient lighting changes are vastly more effective."
              />
              <EvidenceCard
                icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                title="Selective filtering can still be a reasonable preference"
                body="Some wearers still prefer a true blue filter lens as part of their overall light-management setup, especially when they spend a lot of time in bright environments. The key is to describe it honestly as selective filtering — not as a miracle shield against screens."
              />
            </div>
          </section>

          {/* ── 5. BV Coatings Debunked ── */}
          <section id="bv-coatings" className="scroll-mt-32">
            <SectionHeading badge="Myth-Busting" title="BV Coatings — The Uncomfortable Truth" />
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Why blue-reflective BV coatings are often oversold
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "They filter only 10–25% of a narrow band (~415–435 nm). Your crystalline lens already absorbs far more.",
                  "Screen irradiance at 30–60 cm is orders of magnitude below the threshold used in lab 'damage' studies.",
                  "The visible blue or purple residual reflex is not proof of strong protection.",
                  "They do NOT reduce accommodative or vergence-related eye strain — the actual cause of screen discomfort.",
                  "Marketing materials routinely cite retracted, misrepresented, or in-vitro-only research.",
                  "If your goal is a real blue filter lens, a blue-reflective coating is usually not the best description and not the strongest solution.",
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="mt-6 border-border">
              <CardContent className="p-6">
                <h4 className="font-semibold text-foreground">So why do patients sometimes feel better with them?</h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <strong>Usually because several things changed at once.</strong> Many blue-reflective products are bundled with premium anti-reflective stacks,
                  better hydrophobic layers, and an overall lens upgrade. People may notice less glare or simply prefer the feel of the new lens — but that does not mean the visible blue reflex itself is doing most of the work.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── 6. Blue-Look ── */}
          <section id="blue-look" className="scroll-mt-32">
            <SectionHeading badge="Cosmetic Warning" title='"Blue-Look" Lenses — Style, Not Science' />
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card className="border-border">
                <CardContent className="p-6">
                  <h4 className="flex items-center gap-2 font-semibold text-foreground">
                    <XCircle className="h-4 w-4 text-destructive" />
                    What they are NOT
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• Not a medical or protective device</li>
                    <li>• Not a substitute for UV-absorbing materials</li>
                    <li>• Not the same as a true blue filter lens</li>
                    <li>• Often increase visible-light reflections</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-6">
                  <h4 className="flex items-center gap-2 font-semibold text-foreground">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    What they actually are
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• A cosmetic mirror tint or front-surface blue effect</li>
                    <li>• A style choice, not proof of deep filtering</li>
                    <li>• Sometimes higher-priced than superior clear AR</li>
                    <li>• Something you can choose for appearance — just not by confusing it with protection</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <p className="mt-4 text-sm italic text-muted-foreground">
              If you like the look, that is perfectly fine. We just believe the terminology should stay honest.
            </p>
          </section>

          {/* ── 7. Digital Eye Strain Truth ── */}
          <section id="digital-eye-strain" className="scroll-mt-32">
            <SectionHeading badge="Clinical Facts" title="Digital Eye Strain — The Real Causes" />
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Digital eye strain (DES), or computer vision syndrome, is a convergence-accommodation problem — not a light-wavelength problem.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { cause: "Prolonged near-point fixation", fix: "20-20-20 rule (every 20 min, look 20 ft away, for 20 sec)" },
                { cause: "Reduced blink rate (3–5× lower on screens)", fix: "Conscious blinking, lubricating drops" },
                { cause: "Uncorrected or under-corrected refractive error", fix: "Accurate Rx, especially cylinder" },
                { cause: "Poor workstation ergonomics", fix: "Screen below eye level, 50–70 cm distance, anti-glare monitor" },
                { cause: "Dry office environment / HVAC", fix: "Humidification, directed-air management" },
                { cause: "Inadequate or excessive ambient lighting", fix: "Task lighting, reduce overhead fluorescent glare" },
              ].map((item, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-foreground">{item.cause}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.fix}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-6 border-accent/30 bg-accent/5">
              <CardContent className="flex items-start gap-3 p-5">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Bottom line:</strong> An anti-fatigue or occupational progressive lens with quality AR
                  will outperform any blue-reflective coating for screen comfort — because it addresses the actual optical demand, not the wavelength.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── 8. When Useful ── */}
          <section id="when-useful" className="scroll-mt-32">
            <SectionHeading badge="Honest Guidance" title="When Blue Filters Genuinely Help" />
            <p className="mt-4 leading-relaxed text-muted-foreground">
              There are narrow, clinically justified situations where selective blue filtering is appropriate — and there are also everyday wearers who simply want a true blue filter lens as part of a premium outdoor or all-day setup.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { who: "Post-cataract (pseudophakic) patients", why: "Missing the natural crystalline lens that absorbs short-wavelength light. A 400–420 nm substrate filter can restore part of that lost filtering." },
                { who: "Early / intermediate AMD patients", why: "Theoretical (not conclusively proven) benefit in reducing phototoxic load on compromised RPE. Discuss with ophthalmologist." },
                { who: "Bright-climate outdoor wearers", why: "Some people in high-sun environments prefer a lens that trims a portion of short-wavelength visible light as one part of their overall comfort strategy." },
                { who: "Patients pairing protection layers", why: "Blue filter can be combined thoughtfully with UV protection, premium AR, photochromic performance, or polarized sun solutions depending on the job the lens needs to do." },
              ].map((item, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="flex items-start gap-4 p-5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <div>
                      <p className="font-semibold text-foreground">{item.who}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── 9. Dispensing Guide ── */}
          <section id="dispensing-guide" className="scroll-mt-32">
            <SectionHeading badge="Practical Advice" title="How We Talk About Blue Filter" />
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Patient trust is built on honesty. Here is the clearest way to guide the conversation while still helping people choose what they want.
            </p>

            <div className="mt-6 space-y-4">
              <ConversationCard
                patient='"I heard blue light damages my eyes — I need blue filter lenses."'
                response="Current research does not support the idea that ordinary screen use damages the retina. If what you want is a true blue filter lens, we can absolutely show you that option — but we will also explain where UV protection, glare management, and lens design matter even more."
              />
              <ConversationCard
                patient='"My eyes get tired after using the computer all day."'
                response="That is very common and it is usually caused by focusing effort, blinking less, and workstation habits — not by blue light itself. Let us optimize your prescription and lens design first, then add blue filtering only if it still fits your preferences."
              />
              <ConversationCard
                patient='"I want the kind that actually filters blue light, not just the shiny blue look."'
                response="Perfect — that is exactly the right distinction. We will show you a true blue filter lens rather than a product that only has a blue-reflective cosmetic effect on the front."
              />
              <ConversationCard
                patient={'"I spend a lot of time outdoors in Caribbean sun — what should I prioritize?"'}
                response="Start with UV protection and glare control, especially if you drive or spend time around water and bright roads. If you also want selective short-wavelength filtering, we can build that in as an added layer rather than pretending one feature does everything."
              />
            </div>

            <Separator className="my-8" />

            <Card className="border-none bg-primary text-primary-foreground">
              <CardContent className="flex flex-col gap-5 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15">
                    Ready to choose?
                  </Badge>
                  <h3 className="mt-3 text-2xl font-bold">Ask us about true blue filter lenses</h3>
                  <p className="mt-2 text-sm leading-relaxed text-primary-foreground/85">
                    We will help you choose the right combination of blue filter, premium AR, photochromic, polarized,
                    and UV-focused options for your actual routine — from all-day office wear to bright Caribbean outdoor use.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="secondary" asChild>
                    <Link to="/#contact">Contact Us</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link to="/store">
                      Shop Lens Options <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 rounded-full border border-border bg-background p-3 shadow-lg transition-colors hover:bg-muted"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4 text-foreground" />
        </button>
      )}

      <Footer />
    </div>
  );
};

/* ─── Sub-components ─── */

function SectionHeading({ badge, title }: { badge: string; title: string }) {
  return (
    <div>
      <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider">
        {badge}
      </Badge>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

function FilterTypeCard({ title, status, description }: { title: string; status: "preferred" | "limited" | "cosmetic"; description: string }) {
  const statusConfig = {
    preferred: { label: "Preferred Term", variant: "secondary" as const },
    limited: { label: "Limited Benefit", variant: "destructive" as const },
    cosmetic: { label: "Appearance-Driven", variant: "outline" as const },
  };
  const cfg = statusConfig[status];
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EvidenceCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="border-border">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversationCard({ patient, response }: { patient: string; response: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <p className="text-sm font-semibold italic text-foreground">{patient}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Recommended response:</strong> {response}
        </p>
      </CardContent>
    </Card>
  );
}

export default BlueFilterPage;
