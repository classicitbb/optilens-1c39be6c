import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  CircleUserRound,
  Eye,
  Glasses,
  Headphones,
  MapPin,
  PackageSearch,
  ScanEye,
  Sparkles,
} from "lucide-react";

import caribbeanHero from "@/assets/classic-visions-caribbean-journey.webp";
import PublicSearchPanel from "@/components/PublicSearchPanel";
import { Button } from "@/components/ui/button";

type Audience = "professional" | "visitor";

const journeyContent = {
  professional: {
    eyebrow: "For optical professionals",
    title: "Start a prescription lens order",
    description: "We’ll help you find the right approved lens, capture the Rx, and keep the job easy to track.",
    primaryLabel: "Start an Rx order",
    primaryHref: "/lens-assistant?mode=order&audience=professional",
    actions: [
      { label: "Track an order", href: "/profile/orders", icon: PackageSearch },
      { label: "Find a lens & price", href: "/lens-assistant?audience=professional", icon: ScanEye },
      { label: "Talk to our optical team", href: "/#contact", icon: Headphones },
    ],
  },
  visitor: {
    eyebrow: "For patients and visitors",
    title: "Find trusted eye care near you",
    description: "We’ll point you to a participating Caribbean optical retailer and help you understand your lens options.",
    primaryLabel: "Find an optical retailer",
    primaryHref: "/find-a-retailer",
    actions: [
      { label: "Understand lens types", href: "/patients/lens-differences", icon: Eye },
      { label: "Care for your glasses", href: "/patients/caring-for-glasses", icon: Glasses },
      { label: "Ask a lens question", href: "/#site-search", icon: Sparkles },
    ],
  },
} as const;

const Hero = () => {
  const [audience, setAudience] = useState<Audience>("professional");
  const content = journeyContent[audience];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#071d35] text-white" aria-label="Smart customer journey">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(26,138,156,0.3),transparent_32%),linear-gradient(120deg,#071d35_0%,#0b2745_55%,#0b2745_100%)]" aria-hidden="true" />
        <div className="absolute -left-28 top-28 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -left-10 top-44 h-40 w-40 rounded-full border border-[#d7a83f]/25" aria-hidden="true" />

        <div className="container relative z-10 mx-auto max-w-[1500px]">
          <div className="flex min-h-[720px] flex-col justify-start pb-14 pt-24 sm:justify-center sm:py-20 lg:max-w-[51%] lg:px-12 xl:px-16">
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#55d3dc] shadow-[0_0_16px_rgba(85,211,220,.9)]" />
              Made in Barbados · Serving the Caribbean
            </div>

            <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-7xl">
              Clear vision starts with the <span className="text-[#efbd4f]">right next step.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Whether you order lenses for a practice or need help choosing where to go, we’ll guide you from here—simply and personally.
            </p>

            <div className="mt-8 max-w-2xl rounded-[28px] border border-white/15 bg-white/[0.08] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-3">
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">I’m here as an…</p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose your website journey">
                <button
                  type="button"
                  aria-pressed={audience === "professional"}
                  onClick={() => setAudience("professional")}
                  className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-center text-[0.8125rem] font-semibold leading-tight transition sm:gap-2 sm:px-3 sm:text-base ${audience === "professional" ? "bg-white text-[#0b2745] shadow-lg" : "text-white hover:bg-white/10"}`}
                >
                  <Glasses className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Optical professional
                </button>
                <button
                  type="button"
                  aria-pressed={audience === "visitor"}
                  onClick={() => setAudience("visitor")}
                  className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-center text-[0.8125rem] font-semibold leading-tight transition sm:gap-2 sm:px-3 sm:text-base ${audience === "visitor" ? "bg-white text-[#0b2745] shadow-lg" : "text-white hover:bg-white/10"}`}
                >
                  <CircleUserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Patient or visitor
                </button>
              </div>

              <div className="mt-2 rounded-[22px] bg-white p-5 text-[#0b2745] sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a8a9c]">{content.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{content.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">{content.description}</p>
                <Button asChild size="lg" className="mt-5 h-13 w-full justify-between rounded-xl bg-[#d99b22] px-5 text-[#071d35] shadow-lg hover:bg-[#efb945] sm:w-auto sm:min-w-64">
                  <Link to={content.primaryHref}>
                    {content.primaryLabel}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <div className="mt-4 grid gap-1 sm:grid-cols-3 sm:gap-2">
                  {content.actions.map(({ label, href, icon: Icon }) => (
                    <Link key={label} to={href} className="group flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#0b2745]">
                      <Icon className="h-4 w-4 shrink-0 text-[#1a8a9c]" aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-bleed image: a section-level sibling (not nested in the padded,
            max-w-[1500px] text container) so it can sit flush against the true
            browser edge at lg+ instead of being cut off by container padding. */}
        <div className="relative min-h-[430px] overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:min-h-0 lg:w-[49%]">
          <img
            src={caribbeanHero}
            alt="Caribbean customers wearing glasses beside an optical technician finishing a prescription lens"
            className="absolute inset-0 h-full w-full object-cover object-[58%_center]"
            loading="eager"
            fetchPriority="high"
            width={1680}
            height={945}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071d35]/15 via-transparent to-[#071d35]/75 lg:bg-gradient-to-r lg:from-[#0b2745] lg:via-[#0b2745]/10 lg:to-transparent" aria-hidden="true" />

          <div className="absolute bottom-6 left-5 right-5 flex items-center gap-4 rounded-2xl border border-white/25 bg-[#071d35]/75 p-4 shadow-2xl backdrop-blur-md sm:bottom-8 sm:left-8 sm:right-auto sm:max-w-sm">
            <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#67d8df]/60 bg-[#0b2745]">
              <div className="absolute inset-1 rounded-full border border-dashed border-[#efbd4f]/80 motion-safe:animate-spin [animation-duration:9s]" />
              <ScanEye className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#67d8df]">Precision in motion</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-white">Crafted carefully in Barbados. Supported by real people.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f2ed] py-16 sm:py-20" aria-labelledby="journey-heading">
        <div className="container mx-auto px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b27a15]">A smarter customer journey</p>
            <h2 id="journey-heading" className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0b2745] sm:text-4xl">From “what do I need?” to “it’s handled.”</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">One clear path, useful guidance at every step, and a Caribbean team within reach when you need a human.</p>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-3">
            {[
              { number: "01", title: "Tell us why you’re here", text: "Choose professional or visitor. The page immediately adapts to the task that matters to you.", icon: CircleUserRound },
              { number: "02", title: "Get the right next step", text: "Order, track, find a retailer, compare lenses, or ask for help—without hunting through menus.", icon: Sparkles },
              { number: "03", title: "Stay confidently informed", text: "Clear status, practical explanations, and real support turn an optical task into an easy experience.", icon: CheckCircle2 },
            ].map(({ number, title, text, icon: Icon }) => (
              <article key={number} className="group rounded-[24px] border border-[#0b2745]/10 bg-white p-6 shadow-[0_18px_50px_rgba(11,39,69,.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(11,39,69,.12)] sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-[0.2em] text-[#b27a15]">STEP {number}</span>
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e6f6f5] text-[#126f7c]"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                </div>
                <h3 className="mt-8 text-xl font-bold tracking-[-0.025em] text-[#0b2745]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>

          <div id="site-search" className="mx-auto mt-10 max-w-4xl scroll-mt-24 rounded-[26px] bg-[#0b2745] p-5 text-white shadow-xl sm:p-7">
            <div className="grid gap-5 md:grid-cols-[.8fr_1.2fr] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#67d8df]">Not sure where to start?</p>
                <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Ask Classic anything.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Describe what you need in your own words. We’ll answer first, then point you to the right place.</p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-[#0b2745]">
                <PublicSearchPanel />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-[#0b2745]">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#1a8a9c]" /> Barbados-based</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#1a8a9c]" /> Trusted across the Caribbean</span>
            <span className="flex items-center gap-2"><Headphones className="h-4 w-4 text-[#1a8a9c]" /> Real human support</span>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
