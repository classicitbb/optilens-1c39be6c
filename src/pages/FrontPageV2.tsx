import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, LineChart, Megaphone, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const principles = [
  {
    title: "Start with why",
    description:
      "Lead with purpose before product details: clearer vision outcomes, trusted clinical collaboration, and measurable business value.",
    icon: CheckCircle2,
  },
  {
    title: "Segment by audience",
    description:
      "Build one narrative for patients, one for eye-care professionals, and one for trade partners so each message is practical and relevant.",
    icon: Users,
  },
  {
    title: "Prove value with evidence",
    description:
      "Use clear comparisons, treatment outcomes, and service levels to support confident decisions at the point of recommendation.",
    icon: LineChart,
  },
  {
    title: "Create one consistent story",
    description:
      "Align digital, in-store, and trade messaging around one premium brand standard so every touchpoint feels dependable.",
    icon: Megaphone,
  },
];

const flowSteps = [
  "Why this matters to modern optical businesses",
  "How Classic Visions solves real-world dispensing and patient needs",
  "What offer architecture and proof points are required to convert",
  "Where teams execute: retail floor, clinic, and partner channels",
];

const FrontPageV2 = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content">
        <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background px-4 py-16 lg:px-8 lg:py-24">
          <div className="container mx-auto max-w-6xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Draft front page / v2</p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Start with why: a classic marketing vision for premium optical growth.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
              This concept frames Classic Visions around business principles used by mainstream leaders: strong purpose, disciplined positioning, evidence-led presentation, and operational consistency.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/professionals" className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
                Explore Professional Value <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link to="/knowledge" className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted">
                Review Knowledge Framework
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Core business principles for marketing and presentation</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              The page narrative is designed for a lean executive flow: answer the customer problem first, show structured proof second, then guide action with clear role-based next steps.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {principles.map((principle) => {
                const Icon = principle.icon;
                return (
                  <article key={principle.title} className="rounded-xl border bg-card p-6 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-semibold">{principle.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{principle.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-muted/40 px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Lean story flow for conversion and trust</h2>
            <ol className="mt-6 space-y-3">
              {flowSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 rounded-lg border bg-background p-4">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-4xl rounded-2xl border bg-card p-8 text-center shadow-soft">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Draft positioning statement</h2>
            <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
              Classic Visions helps eye-care businesses deliver premium visual outcomes through trusted lens technology, repeatable service quality, and market-ready partner support.
            </p>
            <div className="mt-8">
              <Link to="/find-a-retailer" className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                Find a Retail Partner <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FrontPageV2;
