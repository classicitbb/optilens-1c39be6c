import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { LABLINK_PORTAL_URL, LABLINK_TRACKING_URL } from "@/config/externalLinks";
import Seo from "@/components/seo/Seo";

const tradeBenefits = [
  {
    title: "Reliable turnaround",
    description: "Keep your team informed with clearer production flow, order tracking, and support resources that help reduce avoidable delays.",
  },
  {
    title: "Caribbean-specialist partner",
    description: "Work with a lab partner that understands island logistics, regional retail realities, and the everyday demands of optical practices across the Caribbean.",
  },
  {
    title: "Broad product range",
    description: "Access prescription lenses, coatings, specialty options, technical guidance, and wholesale programs through one professional relationship.",
  },
];

const whyClassicVisions = [
  "We support independent opticians, clinics, and multi-location retailers with tools that help staff sell more confidently and serve patients faster.",
  "We combine trade account onboarding, LabLink ordering, technical education, and service support in one place so practices are not left piecing the relationship together themselves.",
  "We position the partnership around consistency, responsiveness, and practical regional knowledge rather than a generic wholesale catalog experience.",
];

const sections = [
  {
    title: "For Optical Stores & Clinics",
    links: [
      { label: "Apply for a Trade Account", to: "/professionals/trade-account" },
      { label: "Online Ordering Portal (LabLink)", href: LABLINK_PORTAL_URL, external: true },
      { label: "Order Tracking (LabLink)", href: LABLINK_TRACKING_URL, external: true },
      { label: "Price List Request", to: "/professionals/price-list-request" },
    ],
  },
  {
    title: "Technical Resources",
    links: [
      { label: "Dispensing Tips & Guide", to: "/dispensing-tips" },
      { label: "Lab Process Overview", to: "/professionals/lab-process-overview" },
      { label: "Tracing & Cutting Guide", to: "/professionals/tracing-cutting-guide" },
      { label: "Lens Ordering Tips", to: "/professionals/lens-ordering-tips" },
      { label: "Chemistrie Lens System", to: "/professionals/chemistrie-lens-system" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Customer Service", to: "/professionals/customer-service" },
      { label: "Freight & Delivery Policy", to: "/professionals/freight-delivery-policy" },
      { label: "Returns / Replacements", to: "/professionals/returns-replacements" },
    ],
  },
];

const ProfessionalsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Trade Account & Professional Resources | Classic Visions"
        description="Access trade account onboarding, LabLink ordering, order tracking, pricing requests, and technical resources built for optical stores and clinics."
        canonicalPath="/professionals"
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="text-4xl font-bold text-foreground">Professionals Hub</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Classic Visions serves optical stores, eye clinics, and dispensing teams that need a dependable Caribbean lab partner, not just a supplier list. This hub brings together trade onboarding, ordering access, technical resources, and service support so practices can move from inquiry to daily ordering with more confidence.
            </p>
            <p className="mt-3 max-w-3xl text-base text-muted-foreground">
              If you are evaluating who to trust with your prescription lens workflow, this page is meant to show the relationship, the resources, and the day-to-day value behind opening a trade account with us.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/professionals/trade-account">Apply for a Trade Account</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={LABLINK_PORTAL_URL} target="_blank" rel="noopener noreferrer">Open LabLink (External)</a>
              </Button>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Trade Account Benefits</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Opening a trade account gives your practice a clearer path to ordering, pricing access, technical guidance, and ongoing support.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {tradeBenefits.map((benefit) => (
                <div key={benefit.title} className="rounded-xl border border-border/70 bg-background p-5">
                  <h3 className="text-lg font-semibold text-foreground">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Why Classic Visions?</h2>
            <div className="mt-5 space-y-4">
              {whyClassicVisions.map((point) => (
                <p key={point} className="max-w-4xl text-sm leading-6 text-muted-foreground">
                  {point}
                </p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/professionals/trade-account">Apply for a Trade Account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/professionals/price-list-request">Request a Price List</Link>
              </Button>
            </div>
          </section>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {sections.map((section) => (
              <div key={section.title} className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <div className="mt-4 space-y-2">
                  {section.links.map((link) => (
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        to={link.to || "/professionals"}
                        className="block rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfessionalsPage;
