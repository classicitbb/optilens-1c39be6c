import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, CircleUserRound, Glasses, MapPin, Phone } from "lucide-react";

import caribbeanHero from "@/assets/classic-visions-caribbean-journey.webp";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PublicSearchPanel from "@/components/PublicSearchPanel";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { cn } from "@/lib/utils";
import {
  BUSINESS,
  DEFINITION_SENTENCE,
  PLACEHOLDERS,
  capabilityPillars,
  faqs,
  heroPaths,
  heroProofPoints,
  lensExplorer,
  onboardingSteps,
  patientLinks,
  supportPromises,
  type Audience,
} from "@/components/home-prototypes/homeVersionBContent";

/* -------------------------------------------------------------------------- */
/*  Shared Meridian Precision primitives                                       */
/* -------------------------------------------------------------------------- */

/**
 * Monospaced micro-label preceded by the gold structural rule.
 * Gold reads correctly on both the linen and the deep navy field, so one
 * variant covers every band on the page.
 */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
    <span className="h-3 w-px bg-accent" aria-hidden="true" />
    {children}
  </p>
);

/** Hairline optical rings used as the recurring structural motif. */
const OpticalRings = ({ className }: { className?: string }) => (
  <div className={cn("pointer-events-none absolute", className)} aria-hidden="true">
    <div className="relative h-[520px] w-[520px]">
      <div className="absolute inset-0 rounded-full border border-surface-deep-foreground/10" />
      <div className="absolute inset-[12%] rounded-full border border-surface-deep-foreground/[0.07]" />
      <div className="absolute inset-[26%] rounded-full border border-accent/20" />
      <div className="absolute inset-[42%] rounded-full border border-secondary/25" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-surface-deep-foreground/[0.06]" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-surface-deep-foreground/[0.06]" />
    </div>
  </div>
);

const SectionHeading = ({
  eyebrow,
  title,
  lede,
  id,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  id: string;
  align?: "left" | "center";
}) => (
  <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
    <div className={cn(align === "center" && "flex justify-center")}>
      <Eyebrow>{eyebrow}</Eyebrow>
    </div>
    <h2
      id={id}
      className="mt-4 font-serif text-3xl font-semibold leading-[1.12] tracking-[-0.015em] text-foreground sm:text-4xl"
    >
      {title}
    </h2>
    {lede ? <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">{lede}</p> : null}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

const HomeVersionB = () => {
  const [audience, setAudience] = useState<Audience>("professional");
  const path = heroPaths[audience];
  const { openAssistant } = useCompanionAssistant();

  const jsonLd = useMemo(() => {
    const orgId = `${BUSINESS.url}/#organization`;

    const organization = {
      "@context": "https://schema.org",
      "@type": ["Organization", "LocalBusiness"],
      "@id": orgId,
      name: BUSINESS.name,
      alternateName: "Classic Visions Optical Laboratory",
      description: DEFINITION_SENTENCE,
      url: BUSINESS.url,
      logo: `${BUSINESS.url}/favicon.ico`,
      image: `${BUSINESS.url}/og-default.jpg`,
      telephone: BUSINESS.phoneDisplay,
      ...(PLACEHOLDERS.foundingYear ? { foundingDate: PLACEHOLDERS.foundingYear } : {}),
      address: {
        "@type": "PostalAddress",
        streetAddress: BUSINESS.streetAddress,
        addressLocality: BUSINESS.addressLocality,
        postalCode: BUSINESS.postalCode,
        addressCountry: BUSINESS.addressCountry,
      },
      areaServed: [
        { "@type": "Country", name: "Barbados" },
        { "@type": "Place", name: "Caribbean" },
      ],
      knowsAbout: [
        "prescription lenses",
        "progressive lenses",
        "anti-reflective coating",
        "photochromic lenses",
        "polarized lenses",
        "lens surfacing",
        "lens edging",
        "optical wholesale",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: BUSINESS.phoneDisplay,
          contactType: "sales",
          areaServed: "Caribbean",
          availableLanguage: ["en"],
        },
      ],
      sameAs: [...BUSINESS.sameAs],
    };

    const website = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${BUSINESS.url}/#website`,
      name: BUSINESS.name,
      url: BUSINESS.url,
      publisher: { "@id": orgId },
      potentialAction: {
        "@type": "SearchAction",
        target: `${BUSINESS.url}/knowledge?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };

    const services = {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${BUSINESS.url}/#wholesale-service`,
      serviceType: "Wholesale prescription lens supply and optical laboratory services",
      provider: { "@id": orgId },
      areaServed: { "@type": "Place", name: "Caribbean" },
      audience: { "@type": "BusinessAudience", audienceType: "Opticians, eye clinics and optical retailers" },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Classic Visions trade catalogue",
        itemListElement: capabilityPillars.map((pillar) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: pillar.title,
            description: pillar.description,
            url: `${BUSINESS.url}${pillar.href}`,
          },
        })),
      },
    };

    const faqPage = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${BUSINESS.url}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    };

    return [organization, website, services, faqPage];
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Wholesale Prescription Lenses & Optical Lab — Barbados | Classic Visions"
        description="Classic Visions is a Barbados wholesale optical laboratory supplying prescription lenses, coatings, and optical supplies to opticians and clinics across the Caribbean. Open a trade account."
        canonicalPath="/"
        jsonLd={jsonLd}
      />
      <Header />

      <main id="main-content">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden bg-surface-deep text-surface-deep-foreground" aria-labelledby="hero-heading">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,hsl(var(--secondary)/0.28),transparent_46%)]"
            aria-hidden="true"
          />
          <OpticalRings className="-left-48 top-1/2 -translate-y-1/2 opacity-70" />

          <div className="container relative mx-auto grid max-w-[1500px] gap-0 px-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-0">
            <div className="flex min-w-0 flex-col justify-center py-14 sm:py-20 lg:py-24 lg:pl-12 lg:pr-14 xl:pl-16">
              <Eyebrow >
                Barbados optical laboratory{PLACEHOLDERS.foundingYear ? ` · Est. ${PLACEHOLDERS.foundingYear}` : ""}
              </Eyebrow>

              <h1
                id="hero-heading"
                className="mt-5 max-w-[15ch] hyphens-auto break-words font-serif text-[2rem] font-semibold leading-[1.06] tracking-[-0.02em] min-[400px]:text-[2.4rem] sm:text-6xl sm:leading-[1.04] xl:text-[4.25rem]"
              >
                Wholesale prescription lenses, <span className="text-accent">made in the Caribbean.</span>
              </h1>

              {/* Answer-first definition sentence — the quotable line for AI answer engines. */}
              <p className="mt-6 max-w-2xl border-l-2 border-accent/70 pl-5 text-base leading-7 text-surface-deep-foreground/85 sm:text-lg">
                {DEFINITION_SENTENCE}
              </p>

              {/* Audience switch */}
              <div className="mt-9 max-w-2xl rounded-2xl border border-surface-deep-foreground/15 bg-surface-deep-foreground/[0.06] p-2 backdrop-blur-sm sm:p-2.5">
                <p className="px-3 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-surface-deep-foreground/60">
                  I am an…
                </p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose your path">
                  {(
                    [
                      { key: "professional", label: "Optical professional", icon: Glasses },
                      { key: "visitor", label: "Patient or visitor", icon: CircleUserRound },
                    ] as const
                  ).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={audience === key}
                      onClick={() => setAudience(key)}
                      className={cn(
                        "flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-center text-[0.8125rem] font-semibold leading-tight transition sm:gap-2 sm:px-3 sm:text-base",
                        audience === key
                          ? "bg-background text-foreground shadow-medium"
                          : "text-surface-deep-foreground/85 hover:bg-surface-deep-foreground/10",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 rounded-xl bg-card p-5 text-card-foreground sm:p-6">
                  <Eyebrow>{path.eyebrow}</Eyebrow>
                  <h2 className="mt-3 font-serif text-2xl font-semibold tracking-[-0.015em] sm:text-[1.75rem]">
                    {path.title}
                  </h2>
                  <p className="mt-2.5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {path.description}
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
                      <Link to={path.primaryHref}>
                        {path.primaryLabel}
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Link
                      to={path.secondaryHref}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-secondary underline-offset-4 transition hover:underline"
                    >
                      {path.secondaryLabel}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="grid gap-1 sm:grid-cols-3">
                      {path.actions.map(({ label, href, icon: Icon }) => (
                        <Link
                          key={label}
                          to={href}
                          className="group flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[340px] lg:min-h-full">
              <img
                src={caribbeanHero}
                alt="Classic Visions optical technician finishing a prescription lens in the Barbados laboratory while a customer wears her new glasses"
                className="absolute inset-0 h-full w-full object-cover object-[58%_center]"
                loading="eager"
                fetchPriority="high"
                width={1680}
                height={945}
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-surface-deep/25 via-transparent to-surface-deep/80 lg:bg-gradient-to-r lg:from-surface-deep lg:via-surface-deep/15 lg:to-surface-deep/35"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Proof rail — published claims only */}
          <div className="relative border-t border-surface-deep-foreground/10 bg-surface-deep/60 backdrop-blur-sm">
            <div className="container mx-auto max-w-[1500px] px-5 sm:px-8">
              <dl className="grid divide-y divide-surface-deep-foreground/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-surface-deep-foreground/10">
                {heroProofPoints.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3.5 py-5 lg:px-7 lg:first:pl-0">
                    <Icon className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.24em] text-surface-deep-foreground/55">
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-surface-deep-foreground">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Partner logo strip — hidden until real assets are supplied         */}
        {/* ---------------------------------------------------------------- */}
        {PLACEHOLDERS.partnerLogos.length > 0 ? (
          <section className="border-b border-border bg-muted/40 py-8" aria-label="Brands we supply">
            <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-6 px-5 sm:px-8">
              {PLACEHOLDERS.partnerLogos.map((logo) => (
                <img key={logo.name} src={logo.src} alt={logo.name} className="h-7 w-auto opacity-70" loading="lazy" />
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* What we supply                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-background py-20 sm:py-24" aria-labelledby="capabilities-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="capabilities-heading"
              eyebrow="What we supply"
              title="One trade account. The whole bench covered."
              lede="Lenses, coatings, consumables, and the digital tools around them — so your practice isn't stitching together four suppliers to finish one job."
            />

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
              {capabilityPillars.map(({ icon: Icon, title, description, href, links }) => (
                <article key={title} className="group relative flex flex-col bg-card p-7 transition-colors hover:bg-muted/40">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10">
                    <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 font-serif text-xl font-semibold tracking-[-0.01em] text-foreground">
                    <Link to={href} className="after:absolute after:inset-0 hover:text-secondary">
                      {title}
                    </Link>
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
                  <ul className="mt-5 space-y-1.5 border-t border-border pt-4">
                    {links.map((link) => (
                      <li key={link.href}>
                        <Link
                          to={link.href}
                          className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/75 underline-offset-4 transition hover:text-secondary hover:underline"
                        >
                          <span className="h-px w-3 bg-accent" aria-hidden="true" />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Lens & coating explorer — internal link equity                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border bg-muted/40 py-20 sm:py-24" aria-labelledby="explorer-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="explorer-heading"
              eyebrow="Lens & coating index"
              title="Go straight to the specification you're pricing."
              lede="Every design, material, and coating we supply, with the technical page behind it — for you, and for the search engines and assistants your patients ask first."
            />

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {lensExplorer.map(({ title, icon: Icon, items }) => (
                <div key={title}>
                  <div className="flex items-center gap-2.5 border-b border-border pb-3">
                    <Icon className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">{title}</h3>
                  </div>
                  <ul className="mt-4 space-y-0.5">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className="group flex min-h-10 items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
                        >
                          {item.label}
                          <ArrowUpRight
                            className="h-3.5 w-3.5 shrink-0 text-secondary opacity-0 transition group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Onboarding path                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-background py-20 sm:py-24" aria-labelledby="onboarding-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="onboarding-heading"
              eyebrow="Becoming a customer"
              title="From first enquiry to first delivery, without the runaround."
              lede="Four steps, each with a named next action. No forms that go nowhere, no pricing you have to chase."
            />

            <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
              {onboardingSteps.map(({ number, title, text, meta, href, linkLabel, icon: Icon }) => (
                <li key={number} className="flex flex-col bg-card p-7">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step {number}</span>
                    <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div className="mt-5 h-px w-full bg-border" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{text}</p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
                    {meta}
                  </p>
                  <Link
                    to={href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary underline-offset-4 hover:underline"
                  >
                    {linkLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Support promise                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border bg-surface-deep py-20 text-surface-deep-foreground sm:py-24" aria-labelledby="support-heading">
          <div className="container relative mx-auto px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
              <div>
                <Eyebrow >After the sale</Eyebrow>
                <h2
                  id="support-heading"
                  className="mt-4 font-serif text-3xl font-semibold leading-[1.12] tracking-[-0.015em] sm:text-4xl"
                >
                  Everything that happens after the order.
                </h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-surface-deep-foreground/80">
                  Freight, remakes, repairs, and customer-supplied frames are all covered by written policy you can read
                  before you commit — not discovered when something goes wrong.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="hero" size="lg" onClick={() => openAssistant({ formKind: "customer_support" })}>
                    Talk to our optical team
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="border-2 border-surface-deep-foreground/25 text-surface-deep-foreground hover:bg-surface-deep-foreground/10"
                  >
                    <a href={BUSINESS.phoneHref}>
                      <Phone className="h-5 w-5" aria-hidden="true" />
                      {BUSINESS.phoneDisplay}
                    </a>
                  </Button>
                </div>
              </div>

              <div className="grid gap-px overflow-hidden rounded-2xl border border-surface-deep-foreground/15 bg-surface-deep-foreground/15 sm:grid-cols-2">
                {supportPromises.map(({ icon: Icon, title, text, href, linkLabel }) => (
                  <div key={title} className="bg-surface-deep p-6">
                    <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                    <h3 className="mt-4 text-base font-semibold text-surface-deep-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-surface-deep-foreground/70">{text}</p>
                    <Link
                      to={href}
                      className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent underline-offset-4 hover:underline"
                    >
                      {linkLabel}
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Trade partner voices — rendered only when real quotes exist        */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-background py-20 sm:py-24" aria-labelledby="voices-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="voices-heading"
              eyebrow="From the practices we supply"
              title="Trade partners, in their own words."
              align="center"
            />

            {PLACEHOLDERS.testimonials.length > 0 ? (
              <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
                {PLACEHOLDERS.testimonials.map((item) => (
                  <figure key={item.name} className="rounded-2xl border border-border bg-card p-7 shadow-soft">
                    <div className="h-px w-10 bg-accent" aria-hidden="true" />
                    <blockquote className="mt-5 text-base leading-7 text-foreground">"{item.quote}"</blockquote>
                    <figcaption className="mt-6 border-t border-border pt-4">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {item.role} · {item.practice}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-dashed border-accent/50 bg-muted/40 p-8 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Content slot — not live</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Add three approved trade partner quotes (name, role, practice) to{" "}
                  <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[12px] text-foreground">
                    PLACEHOLDERS.testimonials
                  </code>{" "}
                  and this section renders. Until then it is hidden from consideration — no invented quotes ship.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FAQ — the AEO surface                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border bg-muted/40 py-20 sm:py-24" aria-labelledby="faq-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Eyebrow>Common questions</Eyebrow>
                <h2
                  id="faq-heading"
                  className="mt-4 font-serif text-3xl font-semibold leading-[1.12] tracking-[-0.015em] text-foreground sm:text-4xl"
                >
                  Straight answers, first time.
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  The questions practices and patients actually ask us — answered here in full, and marked up so search
                  engines and AI assistants can quote them accurately.
                </p>
                <div className="mt-8 rounded-2xl border border-border bg-card p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">Still stuck?</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Ask in your own words. We answer first, then point you to the right page.
                  </p>
                  <div className="mt-4">
                    <PublicSearchPanel />
                  </div>
                </div>
              </div>

              {/* Answers are rendered open, not behind a disclosure. Collapsed content is
                  weaker for both crawlers and AI answer engines, and this is the page's
                  primary AEO surface — so it stays readable without a click. */}
              <dl className="divide-y divide-border border-t border-border">
                {faqs.map((faq, index) => (
                  <div key={faq.question} className="grid gap-x-5 py-7 sm:grid-cols-[2.5rem_1fr]">
                    <span
                      className="hidden pt-1 font-mono text-[11px] tracking-[0.14em] text-accent sm:block"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <dt className="text-base font-semibold leading-6 text-foreground sm:text-lg">{faq.question}</dt>
                      <dd className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                        {faq.answer}
                        {faq.links.length > 0 ? (
                          <span className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                            {faq.links.map((link) => (
                              <Link
                                key={link.href}
                                to={link.href}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary underline-offset-4 hover:underline"
                              >
                                {link.label}
                                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            ))}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Patient lane                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-background py-20 sm:py-24" aria-labelledby="patients-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <div className="grid gap-10 rounded-2xl border border-border bg-card p-8 shadow-soft lg:grid-cols-[.9fr_1.1fr] lg:gap-14 lg:p-12">
              <div>
                <Eyebrow>Not an optical business?</Eyebrow>
                <h2
                  id="patients-heading"
                  className="mt-4 font-serif text-2xl font-semibold leading-[1.15] tracking-[-0.015em] text-foreground sm:text-3xl"
                >
                  We make the lenses. Your optician fits them.
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  Classic Visions supplies optical practices rather than the public. Find a participating retailer near
                  you, and read up on your options first so the conversation at the counter is a short one.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/find-a-retailer">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                      Find an optical retailer
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/patients">Patient guides</Link>
                  </Button>
                </div>
              </div>

              <ul className="grid gap-px self-start overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
                {patientLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="group flex h-full min-h-16 items-center justify-between gap-3 bg-card px-5 py-4 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                    >
                      {link.label}
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-secondary opacity-0 transition group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Closing CTA                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden bg-surface-deep py-20 text-surface-deep-foreground sm:py-24" aria-labelledby="cta-heading">
          <OpticalRings className="-right-40 top-1/2 -translate-y-1/2 opacity-60" />
          <div className="container relative mx-auto max-w-4xl px-5 text-center sm:px-8">
            <div className="mx-auto h-px w-14 bg-accent" aria-hidden="true" />
            <h2
              id="cta-heading"
              className="mt-8 font-serif text-3xl font-semibold leading-[1.1] tracking-[-0.015em] sm:text-4xl md:text-5xl"
            >
              Let's get your account open.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-surface-deep-foreground/80 sm:text-lg">
              Apply in a few minutes, get pricing built around what you dispense, and start ordering with a Caribbean
              lab that picks up the phone.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button asChild variant="hero" size="lg">
                <Link to="/professionals/trade-account" className="group">
                  Apply for a trade account
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="border-2 border-surface-deep-foreground/25 text-surface-deep-foreground hover:bg-surface-deep-foreground/10"
              >
                <Link to="/professionals/price-list-request">Request a price list</Link>
              </Button>
            </div>

            <a
              href={BUSINESS.phoneHref}
              className="mt-7 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-surface-deep-foreground/70 underline-offset-4 transition hover:text-surface-deep-foreground hover:underline"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              Or call {BUSINESS.phoneDisplay}
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomeVersionB;
