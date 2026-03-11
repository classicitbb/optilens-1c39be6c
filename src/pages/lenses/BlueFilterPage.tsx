import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Eye,
  Monitor,
  Sun,
  ShieldAlert,
  BookOpen,
  FlaskConical,
  Glasses,
  ArrowUp,
} from "lucide-react";
import { useState, useEffect } from "react";

/* ─── anchor sections ─── */
const SECTIONS = [
  { id: "what-is-blue-light", label: "What Is Blue Light?", icon: <Sun className="h-4 w-4" /> },
  { id: "blue-filter-types", label: "Filter Types Explained", icon: <Glasses className="h-4 w-4" /> },
  { id: "the-science", label: "What the Science Says", icon: <FlaskConical className="h-4 w-4" /> },
  { id: "bv-coatings", label: "BV Coatings — Debunked", icon: <ShieldAlert className="h-4 w-4" /> },
  { id: "blue-look", label: 'Blue-Look Cosmetic Lenses', icon: <Eye className="h-4 w-4" /> },
  { id: "digital-eye-strain", label: "Digital Eye Strain Truth", icon: <Monitor className="h-4 w-4" /> },
  { id: "when-useful", label: "When Blue Filters Help", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "dispensing-guide", label: "Dispensing Guide", icon: <BookOpen className="h-4 w-4" /> },
];

/* ─── spectrum data ─── */
const SPECTRUM = [
  { range: "380–410 nm", name: "UV-A / Near-UV", color: "bg-violet-600", danger: "High", note: "Absorbed mostly by cornea & crystalline lens. True UV — blocked by quality lens materials regardless of coating." },
  { range: "410–440 nm", name: "Blue-Violet (BV)", color: "bg-violet-500", danger: "Moderate (debated)", note: "Often marketed as 'harmful blue light'. Lab studies on isolated retinal cells don't translate to real-world exposure." },
  { range: "440–500 nm", name: "Blue-Turquoise", color: "bg-blue-500", danger: "Low / Beneficial", note: "Essential for circadian rhythm, pupil response, colour vision. Filtering this range harms more than it helps." },
  { range: "500–780 nm", name: "Green → Red", color: "bg-green-500", danger: "Negligible", note: "Standard visible light. No filtering needed or recommended." },
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
            Blue Filter Lenses — Facts vs. Fiction
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Blue-light filtering is one of the most aggressively marketed lens features of the last decade.
            This guide separates peer-reviewed evidence from sales narratives so you can advise patients honestly.
          </p>
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
            <p className="mt-4 text-muted-foreground leading-relaxed">
              "Blue light" is simply high-energy visible (HEV) light between roughly 380 nm and 500 nm on the electromagnetic spectrum.
              It's emitted by the sun (by far the dominant source), LED lighting, and digital screens.
              The <strong>sun delivers 100–500× more blue-light irradiance</strong> than a phone or computer screen at typical use distances.
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
            <SectionHeading badge="Definitions" title="Blue Filter Types Explained" />
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <FilterTypeCard
                title="BV (Blue-Violet) Coating"
                status="overstated"
                description="An AR coating engineered to reflect a narrow band (roughly 415–435 nm). Often adds a purple residual reflex. Marketed as 'retina protection' but peer-reviewed evidence does not support meaningful protective benefit at screen-level irradiances."
              />
              <FilterTypeCard
                title="Blue-Look / Cosmetic Blue"
                status="misleading"
                description="A tint or coating that gives lenses a blue-ish mirror aesthetic. Sometimes sold as 'blue filter' but may actually transmit MORE blue light than a clear lens. The colour is cosmetic — it tells you almost nothing about spectral filtering."
              />
              <FilterTypeCard
                title="Selective Substrate Filter"
                status="contextual"
                description="A lens material or monomer that absorbs specific wavelengths (e.g., 400–420 nm). Some high-quality versions exist for occupational use or post-cataract patients. Effective only when matched to a clinical need."
              />
            </div>
          </section>

          {/* ── 3. The Science ── */}
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
                body="A 2021 Cochrane systematic review of 17 RCTs found 'no evidence that blue-light filtering lenses reduce eye strain, improve sleep quality, or protect the retina' compared to non-blue-filter lenses. Strain comes from accommodation and vergence demand, not wavelength."
              />
              <EvidenceCard
                icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
                title="Circadian disruption is real — but the solution isn't a coating"
                body="Evening blue-light exposure (440–480 nm) suppresses melatonin. But BV coatings target the wrong band (415–435 nm) and reduce transmission by only 10–25%. Night-mode software, limiting screen time before bed, and ambient lighting changes are vastly more effective."
              />
              <EvidenceCard
                icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                title="Post-cataract and macular-disease patients may benefit"
                body="Patients lacking the natural UV/blue-absorbing crystalline lens (pseudophakia) or those with early AMD may benefit from selective filtering in the 400–420 nm range. These are clinical prescriptions, not retail upsells."
              />
            </div>
          </section>

          {/* ── 4. BV Coatings Debunked ── */}
          <section id="bv-coatings" className="scroll-mt-32">
            <SectionHeading badge="Myth-Busting" title="BV Coatings — The Uncomfortable Truth" />
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Why BV coatings don't deliver on their promises
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "They filter only 10–25% of a narrow band (~415–435 nm). Your crystalline lens already absorbs far more.",
                  "Screen irradiance at 30–60 cm is orders of magnitude below the threshold used in lab 'damage' studies.",
                  "The purple residual reflex increases unwanted reflections and can reduce contrast in low-light driving.",
                  "They do NOT reduce accommodative or vergence-related eye strain — the actual cause of screen discomfort.",
                  "Marketing materials routinely cite retracted, misrepresented, or in-vitro-only research.",
                  "Regulatory bodies (FDA, TGA) have not approved any blue-filter lens as a medical device for retinal protection.",
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
                <h4 className="font-semibold text-foreground">So why do patients "feel better" with BV lenses?</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  <strong>Placebo effect and improved AR.</strong> Most BV lenses ship on premium AR substrates with excellent anti-glare performance.
                  Patients upgrading from an uncoated or basic hard-coat lens notice less glare — and attribute it to the blue filter.
                  Controlled studies that compare BV-AR to equivalent clear-AR find no difference in comfort or strain.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── 5. Blue-Look ── */}
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
                    <li>• Not proven to reduce any symptom</li>
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
                    <li>• A cosmetic mirror tint — fashion-driven</li>
                    <li>• A marketing rebrand of coloured AR reflex</li>
                    <li>• Sometimes higher-priced than superior clear AR</li>
                    <li>• Can compromise visual clarity in dim conditions</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <p className="mt-4 text-sm text-muted-foreground italic">
              If a patient wants the look — that's fine. Just don't sell it as protection.
            </p>
          </section>

          {/* ── 6. Digital Eye Strain Truth ── */}
          <section id="digital-eye-strain" className="scroll-mt-32">
            <SectionHeading badge="Clinical Facts" title="Digital Eye Strain — The Real Causes" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
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
                  will outperform any blue-filter coating for screen comfort — because it addresses the actual optical demand, not the wavelength.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── 7. When Useful ── */}
          <section id="when-useful" className="scroll-mt-32">
            <SectionHeading badge="Honest Guidance" title="When Blue Filters Genuinely Help" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
              There are narrow, clinically justified situations where selective blue filtering is appropriate:
            </p>
            <div className="mt-6 space-y-3">
              {[
                { who: "Post-cataract (pseudophakic) patients", why: "Missing the natural crystalline lens that absorbs short-wavelength light. A 400–420 nm substrate filter restores natural protection." },
                { who: "Early / intermediate AMD patients", why: "Theoretical (not conclusively proven) benefit in reducing phototoxic load on compromised RPE. Discuss with ophthalmologist." },
                { who: "Night-shift workers exposed to bright LEDs", why: "Occupational filtering (amber or selective substrate) can reduce circadian disruption during shift." },
                { who: "Migraine and photophobia sufferers", why: "FL-41 tinted lenses (rose/amber) filter 480–520 nm and have stronger evidence for migraine than BV coatings." },
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

          {/* ── 8. Dispensing Guide ── */}
          <section id="dispensing-guide" className="scroll-mt-32">
            <SectionHeading badge="For Professionals" title="Dispensing Guide — How to Talk About Blue Light" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Patient trust is built on honesty. Here's how to handle the most common conversations:
            </p>

            <div className="mt-6 space-y-4">
              <ConversationCard
                patient='"I heard blue light damages my eyes — I need blue filter lenses."'
                response="Current research does not support that screens damage the retina. The American Academy of Ophthalmology does not recommend blue-light glasses for screen use. What I'd recommend instead is a premium anti-reflective coating — it reduces glare from all wavelengths and gives you the clearest, most comfortable vision."
              />
              <ConversationCard
                patient='"My eyes get tired after using the computer all day."'
                response="That's very common and it's usually caused by focusing effort, not the light colour. Let me check your prescription is optimised for screen distance, and I'll recommend an anti-fatigue or occupational lens that gives your focusing muscles the support they need."
              />
              <ConversationCard
                patient='"But my friend got blue filter lenses and says they really helped."'
                response="I'm glad they're comfortable! What usually happens is that the lens they got also has excellent anti-glare coating, which is the part doing the work. We can get you the same comfort — or better — with a clear premium AR without the colour distortion that blue coatings can introduce."
              />
              <ConversationCard
                patient={'"I want them anyway — I just feel better knowing they\'re there."'}
                response="Absolutely, we can accommodate that preference. I just want to be upfront that the clinical evidence for screen protection is very limited, so I'd call it a comfort choice rather than a medical necessity. Let me make sure the rest of your lens design is optimised too."
              />
            </div>

            <Separator className="my-8" />

            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-6">
                <h4 className="text-lg font-bold text-foreground">The Professional Standard</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  As optical professionals, our obligation is to recommend based on evidence, not margin.
                  BV coatings and blue-look lenses carry high markups — which is why they're pushed so aggressively through supplier incentives.
                  The best thing you can sell is trust. Patients who learn you won't upsell them on hype become patients for life.
                </p>
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

function FilterTypeCard({ title, status, description }: { title: string; status: "overstated" | "misleading" | "contextual"; description: string }) {
  const statusConfig = {
    overstated: { label: "Overstated", variant: "destructive" as const },
    misleading: { label: "Misleading", variant: "destructive" as const },
    contextual: { label: "Context-Dependent", variant: "secondary" as const },
  };
  const cfg = statusConfig[status];
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>
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
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
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
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Recommended response:</strong> {response}
        </p>
      </CardContent>
    </Card>
  );
}

export default BlueFilterPage;
