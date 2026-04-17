import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  Clapperboard,
  Gamepad2,
  MonitorSmartphone,
  Sparkles,
  Waves,
} from "lucide-react";
import { Link } from "react-router";

const scenarioHighlights = [
  {
    title: "Night driving",
    body: "Cuts the harsh LED headlight peaks that many wearers find fatiguing after dark.",
    icon: CarFront,
  },
  {
    title: "Gaming",
    body: "Preserves colour accuracy and contrast while reducing visual noise during long sessions.",
    icon: Gamepad2,
  },
  {
    title: "Streaming and screens",
    body: "Built for LED-heavy entertainment and work routines without the amber look of broad blue blockers.",
    icon: Clapperboard,
  },
  {
    title: "LED lighting at work",
    body: "Useful for wearers spending long days under bright overhead LED lighting and monitors.",
    icon: MonitorSmartphone,
  },
  {
    title: "Sporting arenas",
    body: "Helps soften glare from powerful stadium and indoor sports lighting for players and spectators.",
    icon: Waves,
  },
];

const opticalFacts = [
  "Patented selective absorption targets the two disruptive LED peaks at 450 nm and 550 nm.",
  "Blocks 100% UV light and high-energy visible light up to 400 nm.",
  "Approximate visible light transmission is 78%, rising to nearly 90% with anti-reflective coating.",
  "Category 0 everyday lens with no stated wear limitations when finished to Class 1 eyewear standards.",
];

const faqPoints = [
  {
    question: "How is LED PRO different from broad blue-light blockers?",
    answer:
      "LED PRO concentrates absorption on two LED peaks instead of blocking broad bands that can dim vision and skew colour.",
  },
  {
    question: "Will the lens look tinted?",
    answer:
      "The lens has a very subtle pale green or chartreuse hue. With AR applied, it appears almost clear on the face and most wearers adapt within minutes.",
  },
  {
    question: "Can it be a primary pair?",
    answer:
      "Yes. The booklet positions LED PRO as a primary clear pair or as a specialty pair for night driving, computer use, gaming, occupational wear, and low-impact sport.",
  },
  {
    question: "What lens forms are available?",
    answer:
      "The current ANZ range notes 1.67 material availability, 1.60 coming soon, and suitability for both single-vision and progressive designs with freeform digital processing.",
  },
];

const patientProfiles = [
  "Drivers bothered by modern LED headlights and whiter oncoming beams.",
  "Gamers and remote workers who spend long hours under monitors, RGB setups, and bright room lighting.",
  "Healthcare, industrial, and office staff exposed to strong indoor LED lighting for full shifts.",
  "Spectators and recreational athletes under stadium, court, and arena lighting.",
];

export default function LedProPage() {
  const [videoDemoError, setVideoDemoError] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="LED PRO Lenses | Lifestyle Lens Guide | Classic Visions"
        description="Explore LED PRO lenses: a patented selective-filter lifestyle lens for LED headlight glare, gaming, screens, and bright indoor lighting."
        canonicalPath="/lenses/led-pro"
        image="/media/led-pro/led-pro-scene-1.jpg"
      />
      <Header />

      <main id="main-content" className="overflow-hidden pb-20">
        <section className="relative isolate min-h-[calc(100svh-4rem)]">
          <div className="absolute inset-0">
            <img
              src="/media/led-pro/led-pro-scene-1.jpg"
              alt="Silhouette overlooking a bright LED-lit cityscape"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,11,19,0.92)_0%,rgba(6,11,19,0.74)_42%,rgba(6,11,19,0.18)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(245,194,66,0.34),transparent_24%),radial-gradient(circle_at_18%_84%,rgba(100,200,255,0.18),transparent_26%)]" />
          </div>

          <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl gap-10 px-4 pb-14 pt-28 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:px-8">
            <div className="flex max-w-2xl flex-col justify-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Lifestyle Lenses</p>
              <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                LED PRO
                <span className="block text-white/70">for an LED-lit world.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/78 sm:text-xl">
                A patented clear ophthalmic lens designed to selectively absorb the two LED peaks most associated with
                glare, visual fatigue, and washed-out contrast while keeping brightness and colour natural.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/#contact">
                    Ask About LED PRO <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/74">
                <div>
                  <p className="font-semibold text-white">450 nm + 550 nm</p>
                  <p>Selective LED peak absorption</p>
                </div>
                <div>
                  <p className="font-semibold text-white">100% UV</p>
                  <p>Everyday protection built in</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Patent No. US 8,911,082 B2</p>
                  <p>Younger Optics technology</p>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-center lg:justify-end">
              <div className="w-full max-w-xl rounded-[2rem] border border-white/14 bg-black/30 p-3 shadow-2xl shadow-black/35 backdrop-blur-sm">
                {videoDemoError ? (
                  <div className="aspect-video w-full rounded-[1.35rem] bg-black/40 flex items-center justify-center text-white/50 text-sm">
                    Video preview unavailable
                  </div>
                ) : (
                  <video
                    id="watch-demo"
                    className="aspect-video w-full rounded-[1.35rem] object-cover"
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/video/LED-PRO-FULL-ANZ.mp4`}
                    controls
                    preload="metadata"
                    playsInline
                    onError={() => setVideoDemoError(true)}
                  />
                )}
                <div className="grid gap-4 px-2 pb-2 pt-4 text-sm text-white/72 sm:grid-cols-3">
                  <div>
                    <p className="font-semibold text-white">LED Pro Lenses</p>
                    <p>Watch the Younger Optics LED PRO product overview.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Clear everyday wear</p>
                    <p>Designed as a primary lens, not just an occasional novelty pair.</p>
                  </div>
                  <div className="sm:col-span-1">
                    <p className="font-semibold text-white">Subtle neutral-green tint</p>
                    <p>Almost invisible with AR and not intended to dull the scene.</p>
                  </div>
                  <div className="sm:col-span-3 lg:col-span-1">
                    <p className="font-semibold text-white">Built for real LED use cases</p>
                    <p>Driving, screens, work lighting, sports, and entertainment.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/45">
          <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="font-semibold uppercase tracking-[0.22em] text-foreground">Why it stands apart</span>
              <span>Selective rather than broad-spectrum filtering</span>
              <span>Natural colour and contrast preserved</span>
              <span>Ideal for LED headlights, displays, and lighting-heavy environments</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
            <div className="max-w-xl">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em]">
                One Lens, Many Scenarios
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">
                Built for the moments when LEDs feel harsh.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
                LED PRO is positioned as a lifestyle lens for wearers who notice discomfort from high-intensity white
                LEDs, whether that comes from the road, a workstation, a stadium, or a gaming setup.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-[1.75rem] border border-border bg-border sm:grid-cols-2 xl:grid-cols-5">
              {scenarioHighlights.map(({ title, body, icon: Icon }) => (
                <div key={title} className="bg-background p-6">
                  <Icon className="h-5 w-5 text-accent" />
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,rgba(13,23,38,1)_0%,rgba(8,16,27,1)_100%)] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8">
            <div className="space-y-6">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#b0d870]">How LED PRO Works</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                  Precision absorption instead of a blunt blue block.
                </h2>
                <p className="mt-5 text-base leading-7 text-white/74 sm:text-lg">
                  The LED PRO uses a selective absorption dye system engineered to reduce the LED emission
                  peaks at 450 nm and 550 nm. That matters because white LED light is commonly produced by coupling a
                  narrow blue spectrum with a broad yellow-green spectrum.
                </p>
              </div>

              <div className="space-y-4">
                {opticalFacts.map((fact) => (
                  <div key={fact} className="flex items-start gap-3 border-t border-white/12 pt-4">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#b0d870]" />
                    <p className="text-sm leading-6 text-white/78">{fact}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5">
                <img
                  src="/media/led-pro/led-pro-scene-2.jpg"
                  alt="Spectral graph showing visible light wavelengths"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="grid gap-4">
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5">
                  <img
                    src="/media/led-pro/led-pro-scene-3.jpg"
                    alt="Bright LED bulb used to illustrate harsh point-source light"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Why not broad blue blockers?</p>
                  <p className="mt-4 text-base leading-7 text-white/78">
                    LED PRO FAQ frames the difference clearly: many blue-light lenses block broad chunks of the
                    spectrum, which can dim vision and distort colour. LED PRO is positioned as the selective alternative.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="max-w-xl">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em]">
                Quick Answers
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">
                The details patients and dispensers ask first.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
                {"\n"}
              </p>
            </div>

            <div className="space-y-6">
              {faqPoints.map(({ question, answer }) => (
                <div key={question} className="border-t border-border pt-6 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-semibold text-foreground">{question}</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
          <div className="grid gap-10 rounded-[2rem] border border-border bg-card/70 p-8 shadow-soft lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Recommended For</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                Wearers who notice discomfort from bright, modern LEDs.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                The booklet highlights drivers, gamers, remote workers, shift workers, and evening sports participants.
                In practice, LED PRO makes the most sense for patients who keep describing glare, fatigue, or washed-out
                comfort under artificial light rather than full sun.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {patientProfiles.map((profile) => (
                <div key={profile} className="border-t border-border pt-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-1 h-4 w-4 shrink-0 text-accent" />
                    <p className="text-sm leading-6 text-muted-foreground">{profile}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(10,18,30,1)_0%,rgba(16,31,47,1)_52%,rgba(38,62,39,1)_100%)]">
            <div className="grid gap-10 px-8 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-12 lg:py-14">
              <div className="max-w-3xl">
                <Badge className="bg-white/10 text-white hover:bg-white/10">LED PRO Lifestyle Lens</Badge>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                  Better suited to LED-heavy routines than ordinary clear lenses, without looking like amber computer eyewear.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/72">
                  Ask about LED PRO as a primary pair, a night-driving pair, or a specialty screen and indoor-lighting
                  lens. We can pair it with anti-reflective treatment and the right lens design for the wearer’s routine.
                </p>
                <Separator className="my-6 bg-white/12" />
                <p className="text-sm text-white/58">
                  Source basis for this page: LED PRO ANZ live FAQ and range pages, the supplied LED PRO booklet, and
                  the supplied product video.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/#contact">Talk to Our Team</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  asChild
                >
                  <a href="https://ledprolens.com.au/led-pro-faqs/" target="_blank" rel="noopener noreferrer">
                    Read LED PRO FAQs
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/lenses/lens-types">Back to Lens Guide</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
