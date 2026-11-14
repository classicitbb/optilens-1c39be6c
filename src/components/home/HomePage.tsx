import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, CircleUserRound, Glasses, MapPin, Phone } from "lucide-react";

import caribbeanHero from "@/assets/classic-visions-caribbean-team-v2.webp";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PublicSearchPanel from "@/components/PublicSearchPanel";
import { TaskFinder, ShippingComparison, RelationshipJourney } from "./CustomerJourney";
import { useShippingPlannerEnabled } from "./useShippingPlannerEnabled";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { cn } from "@/lib/utils";
import {
  BUSINESS,
  DEFINITION_SENTENCE,
  PLACEHOLDERS,
  capabilityPillars,
  heroCopy,
  heroPaths,
  heroProofPoints,
  lensExplorer,
  onboardingSteps,
  patientFaqs,
  patientGuides,
  patientJourney,
  patientLensExplorer,
  professionalFaqs,
  supportPromises,
  type Audience,
} from "@/components/home/homeContent";
import { useHomeAudience } from "@/components/home/useHomeAudience";
import { homeLinkHref, homeLinkLabel, useHomeSignedIn } from "@/components/home/useHomeSignedIn";
import { useScrollCraft } from "@/lib/scrollcraft/useScrollCraft";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { customerHeroPath } from "./homeContent";

/* -------------------------------------------------------------------------- */
/*  Shared Meridian Precision primitives                                       */
/* -------------------------------------------------------------------------- */

/**
 * Small label above a heading. Gold reads correctly on both the linen and the
 * deep navy field, so one variant covers every band on the page.
 */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm font-semibold text-accent">{children}</p>
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
  <div data-sc-in className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
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

const HomePage = () => {
  const [audience, setAudience] = useHomeAudience();
  const isProfessional = audience === "professional";
  const signedIn = useHomeSignedIn();
  const { identity, isStaff } = usePortalIdentity();
  const portalAccess = signedIn && (identity?.portalAccessStatus === "approved_customer" || isStaff);
  const path = isProfessional && portalAccess ? customerHeroPath : heroPaths[audience];
  const copy = heroCopy[audience];
  const faqs = isProfessional ? professionalFaqs : patientFaqs;

  /** Used by the switch at the foot of the page: change view, then return to the hero. */
  const switchAudienceFromFooter = (next: Audience) => {
    setAudience(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const { openAssistant } = useCompanionAssistant();
  const shippingPlanner = useShippingPlannerEnabled();
  const scrollRef = useScrollCraft([audience]);

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
  }, [faqs]);

  return (
    <div ref={scrollRef} className="min-h-screen bg-background">
      <span data-sc-progress aria-hidden="true" />
      <Seo
        title="Wholesale Prescription Lenses & Optical Lab — Barbados | Classic Visions"
        description="Classic Visions is a Barbados wholesale optical laboratory supplying prescription lenses, coatings, and optical supplies to opticians and clinics across the Caribbean. Open a trade account."
        canonicalPath="/"
        jsonLd={jsonLd}
      />
      <Header />

      <main id="main-content">
        {isProfessional ? <TaskFinder portalAccess={portalAccess} /> : null}
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section data-sc-act="flow" className="sect-deep relative isolate overflow-hidden bg-surface-deep text-surface-deep-foreground" aria-labelledby="hero-heading">
          <div className="container relative mx-auto grid max-w-[1500px] gap-0 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:px-0">
            <div className="flex min-w-0 flex-col justify-center pt-24 pb-10 sm:pt-28 sm:pb-14 lg:pb-16 lg:pl-12 lg:pr-10 lg:pt-28 xl:pl-16">
              <Eyebrow>
                {copy.eyebrow}
                {PLACEHOLDERS.foundingYear ? ` · Est. ${PLACEHOLDERS.foundingYear}` : ""}
              </Eyebrow>

              <h1
                id="hero-heading"
                className="mt-5 max-w-[15ch] hyphens-none break-normal font-serif text-[2rem] font-semibold leading-[1.06] tracking-[-0.02em] min-[400px]:text-[2.4rem] sm:text-6xl sm:leading-[1.04] lg:max-w-[18ch] lg:text-[3.25rem] xl:text-[3.75rem]"
              >
                {copy.headline} {copy.headlineAccent}
              </h1>

              {/* Answer-first definition sentence — the quotable line for AI answer engines. */}
              <p className="mt-5 max-w-2xl text-base leading-7 text-surface-deep-foreground/85 sm:text-lg">
                {copy.lede}
              </p>

              {/* Audience switch */}
              <div className="mt-8 max-w-2xl rounded-2xl border border-surface-deep-foreground/15 bg-surface-deep-foreground/[0.05] p-2 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-2.5">
                <p className="px-3 pb-2 pt-1 text-sm text-surface-deep-foreground/70">
                  I'm here as…
                </p>
                <div
                  className="relative grid grid-cols-2 rounded-xl bg-surface-deep/70 p-1 ring-1 ring-inset ring-surface-deep-foreground/10"
                  role="group"
                  aria-label="Choose your path"
                >
                  {/* Sliding highlight — moves under the active choice. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-surface-deep-foreground shadow-medium transition-transform duration-300 ease-out",
                      audience === "visitor" && "translate-x-full",
                    )}
                  />
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
                        "relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-center text-[0.8125rem] font-semibold leading-tight transition-colors duration-300 sm:gap-2 sm:px-3 sm:text-base",
                        audience === key
                          ? "text-surface-deep"
                          : "text-surface-deep-foreground/80 hover:text-surface-deep-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>

                <div key={audience} className="mt-2 animate-fade-in rounded-xl bg-card p-5 text-card-foreground shadow-[0_16px_36px_-18px_rgba(0,0,0,0.55)] sm:p-6">
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
                      to={homeLinkHref(path.secondaryHref, signedIn)}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-secondary underline-offset-4 transition hover:underline"
                    >
                      {signedIn || path.secondaryHref !== "/profile/rx-order" ? path.secondaryLabel : "Already a customer? Sign in"}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="grid gap-1 sm:grid-cols-3">
                      {path.actions.map(({ label, href, icon: Icon }) => (
                        <Link
                          key={label}
                          to={homeLinkHref(href, signedIn)}
                          className="group flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                          <span>{homeLinkLabel(label, href, signedIn)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The team portrait keeps its native 16:9 frame at every width —
                edge to edge on phones and a framed print on desktop. */}
            <div className="relative -mx-5 sm:-mx-8 lg:mx-0 lg:flex lg:items-start lg:pb-16 lg:pr-12 lg:pt-28 xl:pr-16">
              <figure className="relative w-full">
                <div className="relative aspect-[16/9] w-full overflow-hidden lg:rounded-lg">
                  <div data-sc-parallax="0.4" className="absolute -inset-y-5 inset-x-0">
                    <img
                      src={caribbeanHero}
                      alt="Caribbean optical professionals presenting eyeglass frames and a lens in a bright consultation space"
                      className="h-full w-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                      width={1672}
                      height={941}
                    />
                  </div>
                  <figcaption className="absolute bottom-3 left-3 rounded bg-surface-deep/85 px-2.5 py-1 text-xs font-medium text-surface-deep-foreground sm:bottom-4 sm:left-4">
                    Made in Barbados
                  </figcaption>
                </div>
              </figure>
            </div>
          </div>

          {/* Proof rail — published claims only */}
          <div className="relative border-t border-surface-deep-foreground/10">
            <div className="container mx-auto max-w-[1500px] px-5 sm:px-8">
              <dl className="grid divide-y divide-surface-deep-foreground/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-surface-deep-foreground/10">
                {heroProofPoints[audience].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3.5 py-5 lg:px-7 lg:first:pl-0">
                    <Icon className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-surface-deep-foreground/60">
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

        {isProfessional ? (
          <div key="professional" className="animate-fade-in">
        <RelationshipJourney portalAccess={portalAccess} />
        {shippingPlanner ? <ShippingComparison /> : null}

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
        <section className="sect-glow bg-background py-20 sm:py-24" aria-labelledby="capabilities-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="capabilities-heading"
              eyebrow="What we supply"
              title="One trade account. Your optical's needs - covered."
              lede="Lenses, coatings, consumables and online ordering, all from one supplier."
            />

            <div data-sc-in data-sc-stagger="70" className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
              {capabilityPillars.map(({ icon: Icon, title, description, href, links }) => (
                <article key={title} className="group relative flex flex-col bg-card p-7 transition-colors hover:bg-muted/40">
                  <Icon className="h-6 w-6 text-secondary" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-xl font-semibold tracking-[-0.01em] text-foreground">
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
        <section className="sect-dots border-y border-border bg-background py-20 sm:py-24" aria-labelledby="explorer-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="explorer-heading"
              eyebrow="Lens & coating index"
              title="Find the right lenses and coatings for your customers."
              lede="Every design, material and coating we supply, each with its own technical page."
            />

            <div data-sc-in data-sc-stagger="70" className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {lensExplorer.map(({ title, icon: Icon, items }) => (
                <div key={title}>
                  <div className="flex items-center gap-2.5 border-b border-border pb-3">
                    <Icon className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
        {!portalAccess && <section className="sect-glow bg-background py-20 sm:py-24" aria-labelledby="onboarding-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="onboarding-heading"
              eyebrow="Becoming a customer"
              title="From first enquiry to first delivery."
              lede="Four steps, and each one tells you what happens next."
            />

            <ol data-sc-in data-sc-stagger="70" className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
              {onboardingSteps.map(({ number, title, text, meta, href, linkLabel, icon: Icon }) => (
                <li key={number} className="flex flex-col bg-card p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-accent">Step {number}</span>
                    <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div className="mt-5 h-px w-full bg-border" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{text}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {meta}
                  </p>
                  <Link
                    to={homeLinkHref(href, signedIn)}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary underline-offset-4 hover:underline"
                  >
                    {homeLinkLabel(linkLabel, href, signedIn)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>}

        {/* ---------------------------------------------------------------- */}
        {/* Support promise                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="sect-deep border-y border-border bg-surface-deep py-20 text-surface-deep-foreground sm:py-24" aria-labelledby="support-heading">
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
                  Freight, remakes, repairs and customer-supplied frames are each covered by a written policy you can read
                  before you order.
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

              <div className="grid gap-px overflow-hidden rounded-lg border border-surface-deep-foreground/15 bg-surface-deep-foreground/15 sm:grid-cols-2">
                {supportPromises.map(({ icon: Icon, title, text, href, linkLabel }) => (
                  <div key={title} className="bg-surface-deep p-6">
                    <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                    <h3 className="mt-4 text-base font-semibold text-surface-deep-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-surface-deep-foreground/70">{text}</p>
                    <Link
                      to={href}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                    >
                      {linkLabel}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
          </div>
        ) : (
          <div key="visitor" className="animate-fade-in">
        {/* ---------------------------------------------------------------- */}
        {/* Patient view — how to get our lenses                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="sect-glow bg-background py-20 sm:py-24" aria-labelledby="journey-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="journey-heading"
              eyebrow="How it works"
              title="Three steps to your new glasses."
              lede="We make the lenses; your optician is the person you should deal with. Here's how that fits together."
            />

            <ol data-sc-in data-sc-stagger="70" className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
              {patientJourney.map(({ number, title, text, href, linkLabel, icon: Icon }) => (
                <li key={number} className="flex flex-col bg-card p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-accent">Step {number}</span>
                    <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div className="mt-5 h-px w-full bg-border" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{text}</p>
                  <Link
                    to={href}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary underline-offset-4 hover:underline"
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
        {/* Patient view — plain-English guides                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="sect-dots border-y border-border bg-background py-20 sm:py-24" aria-labelledby="guides-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="guides-heading"
              eyebrow="Patient guides"
              title="Walk into your optician already knowing what to ask."
              lede="Short, jargon-free guides to the choices you'll be offered at the counter."
            />

            <ul data-sc-in data-sc-stagger="70" className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {patientGuides.map((guide) => (
                <li key={guide.href}>
                  <Link
                    to={guide.href}
                    className="group flex h-full flex-col bg-card p-6 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex items-start justify-between gap-3 text-base font-semibold leading-6 text-foreground group-hover:text-secondary">
                      {guide.label}
                      <ArrowUpRight
                        className="mt-1 h-4 w-4 shrink-0 text-secondary transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-2 text-sm leading-6 text-muted-foreground">{guide.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Patient view — lens options to ask about                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="sect-glow bg-background py-20 sm:py-24" aria-labelledby="patient-lenses-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="patient-lenses-heading"
              eyebrow="Lens options"
              title="Lenses worth asking your optician about."
            />

            <div data-sc-in data-sc-stagger="70" className="mt-12 grid gap-8 sm:grid-cols-2">
              {patientLensExplorer.map(({ title, icon: Icon, items }) => (
                <div key={title}>
                  <div className="flex items-center gap-2.5 border-b border-border pb-3">
                    <Icon className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  </div>
                  <ul className="mt-4 grid gap-0.5 sm:grid-cols-2">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className="group flex min-h-10 items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
          </div>
        )}


        {/* ---------------------------------------------------------------- */}
        {/* Trade partner voices — rendered only when real quotes exist        */}
        {/* ---------------------------------------------------------------- */}
        {isProfessional && PLACEHOLDERS.testimonials.length > 0 ? (
        <section className="sect-glow bg-background py-20 sm:py-24" aria-labelledby="voices-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <SectionHeading
              id="voices-heading"
              eyebrow="From the practices we supply"
              title="Trade partners, in their own words."
              align="center"
            />

              <div data-sc-in data-sc-stagger="70" className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
                {PLACEHOLDERS.testimonials.map((item) => (
                  <figure key={item.name} className="rounded-lg border border-border bg-card p-7 shadow-soft">
                    <blockquote className="text-base leading-7 text-foreground">"{item.quote}"</blockquote>
                    <figcaption className="mt-6 border-t border-border pt-4">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.role} · {item.practice}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
          </div>
        </section>
        ) : null}


        {/* ---------------------------------------------------------------- */}
        {/* FAQ — the AEO surface                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="sect-dots border-y border-border bg-background py-20 sm:py-24" aria-labelledby="faq-heading">
          <div className="container mx-auto px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <h2
                  id="faq-heading"
                  className="font-serif text-3xl font-semibold leading-[1.12] tracking-[-0.015em] text-foreground sm:text-4xl"
                >
                  Common questions
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  {isProfessional
                    ? "Practical answers about ordering, delivery and working with our team. Need a hand? Call us and we can walk through the same page together."
                    : "What you usually want to know before you visit your optician — answered in plain English."}
                </p>
                <div className="mt-8 rounded-lg border border-border bg-card p-5">
                  <p className="text-sm font-semibold text-foreground">Still stuck?</p>
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
                {faqs.map((faq) => (
                  <div key={faq.question} className="py-7">
                    <div>
                      <dt className="text-base font-semibold leading-6 text-foreground sm:text-lg">{faq.question}</dt>
                      <dd className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                        {faq.answer}
                        {faq.links.length > 0 ? (
                          <span className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                            {faq.links.map((link) => (
                              <Link
                                key={link.href}
                                to={portalAccess && link.href === "/professionals/trade-account" ? "/profile/rx-order" : link.href}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary underline-offset-4 hover:underline"
                              >
                                {portalAccess && link.href === "/professionals/trade-account" ? "Start an Rx order" : link.label}
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
        {/* Closing CTA — one per audience                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="sect-deep relative isolate overflow-hidden bg-surface-deep py-20 text-surface-deep-foreground sm:py-24" aria-labelledby="cta-heading">
          <div className="container relative mx-auto max-w-4xl px-5 text-center sm:px-8">
            <h2
              id="cta-heading"
              className="font-serif text-3xl font-semibold leading-[1.1] tracking-[-0.015em] sm:text-4xl md:text-5xl"
            >
              {isProfessional ? portalAccess ? "Ready for your next order?" : "Let's get your account open." : "Ready when you are."}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-surface-deep-foreground/80 sm:text-lg">
              {isProfessional
                ? portalAccess ? "Place an order, follow its progress, or shop for the supplies your practice needs." : "Apply in a few minutes, get pricing built around what you dispense, and start ordering with a Caribbean lab that picks up the phone."
                : "Find a participating optician near you, or ask us a question first — we're happy to point you in the right direction."}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {isProfessional ? (
                <>
                  <Button asChild variant="hero" size="lg">
                    <Link to={portalAccess ? "/profile/rx-order" : "/professionals/trade-account"} className="group">
                      {portalAccess ? "Start an Rx order" : "Apply for a trade account"}
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="border-2 border-surface-deep-foreground/25 text-surface-deep-foreground hover:bg-surface-deep-foreground/10"
                  >
                    <Link to={portalAccess ? "/store" : "/professionals/price-list-request"}>{portalAccess ? "Buy supplies" : "Request a price list"}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="hero" size="lg">
                    <Link to="/find-a-retailer" className="group">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                      Find an optician near you
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="border-2 border-surface-deep-foreground/25 text-surface-deep-foreground hover:bg-surface-deep-foreground/10"
                    onClick={() => openAssistant()}
                  >
                    Ask us a question
                  </Button>
                </>
              )}
            </div>

            {isProfessional ? (
              <a
                href={BUSINESS.phoneHref}
                className="mt-7 inline-flex items-center gap-2 text-sm text-surface-deep-foreground/75 underline-offset-4 transition hover:text-surface-deep-foreground hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Or call {BUSINESS.phoneDisplay}
              </a>
            ) : null}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Audience switch — a way back for anyone who scrolled past the hero */}
        {/* ---------------------------------------------------------------- */}
        <aside className="border-t border-border bg-muted/40" aria-label="Switch homepage view">
          <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-5 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
            <p className="text-sm text-muted-foreground">
              {isProfessional
                ? "Looking for glasses, not a supplier? We've made a simpler page for you."
                : "Run an optical practice, clinic, or retail store?"}
            </p>
            <button
              type="button"
              onClick={() => switchAudienceFromFooter(isProfessional ? "visitor" : "professional")}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-secondary/50 hover:text-secondary"
            >
              {isProfessional ? (
                <CircleUserRound className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Glasses className="h-4 w-4" aria-hidden="true" />
              )}
              {isProfessional ? "Switch to the patient view" : "See the trade view"}
            </button>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
