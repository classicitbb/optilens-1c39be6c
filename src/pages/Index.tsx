import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Building2, CircleHelp, MessageSquareHeart, Users } from "lucide-react";
import Header from "@/components/Header";
import AccountRequestBanner from "@/components/AccountRequestBanner";
import Footer from "@/components/Footer";
import PublicSearchPanel from "@/components/PublicSearchPanel";

const businessPillars = [
  {
    title: "Outcome-led portfolio",
    description:
      "Frame products by the result people care about first—daily comfort, night clarity, digital stamina, and clinical confidence at handoff.",
    icon: BadgeCheck,
  },
  {
    title: "Role-specific messaging",
    description:
      "Present one clear path for patients, one for optical professionals, and one for trade partners so every audience gets actionable next steps.",
    icon: Users,
  },
  {
    title: "Operational consistency",
    description:
      "Keep guidance, materials, and fulfillment promises aligned from campaign to chair to lab to protect trust and repeat demand.",
    icon: Building2,
  },
];

const questionAnswerFlow = [
  {
    question: "How do I choose the right lens path quickly?",
    answer: "Start with lifestyle and clinical need, then map to lens design, material, and coating stack with transparent trade-offs.",
  },
  {
    question: "How do I explain value without overwhelming detail?",
    answer: "Lead with the everyday problem first, then provide concise proof points and one clear recommendation per use-case.",
  },
  {
    question: "How do teams convert intent into orders confidently?",
    answer: "Use one shared recommendation flow across website, retail conversations, and partner tooling so handoffs are frictionless.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <AccountRequestBanner />
      <main id="main-content">
        <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background px-4 py-16 lg:px-8 lg:py-24">
          <div className="container mx-auto max-w-6xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Classic Visions</p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Better visual outcomes begin with clear purpose and practical guidance.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
              We help eye-care businesses choose, explain, and deliver premium lens solutions with confidence—so patients understand the value and teams move faster from recommendation to fulfillment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/professionals" className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
                For Professionals <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link to="/find-a-retailer" className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted">
                Find a Retailer
              </Link>
            </div>
          </div>
        </section>
        <section id="site-search" className="px-4 py-10 lg:px-8 scroll-mt-24">
          <div className="container mx-auto rounded-2xl border bg-card/90 p-6 shadow-soft backdrop-blur">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Intelligent Site Search</p>
            <h2 className="mb-2 text-2xl font-bold">Find the answer where the question starts</h2>
            <p className="mb-4 text-sm text-muted-foreground">Search pages, products, knowledge base articles, forms, and anchored sections.</p>
            <PublicSearchPanel />
          </div>
        </section>
        <section className="px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Business principles built into the customer experience</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {businessPillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <article key={pillar.title} className="rounded-xl border bg-card p-6 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-semibold">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
        <section className="bg-muted/40 px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Questions teams ask every day, answered with a lean flow</h2>
            <div className="mt-6 space-y-4">
              {questionAnswerFlow.map((item) => (
                <article key={item.question} className="rounded-xl border bg-background p-5">
                  <div className="flex items-start gap-3">
                    <CircleHelp className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-4xl rounded-2xl border bg-card p-8 text-center shadow-soft">
            <MessageSquareHeart className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">One clear next step for every audience</h2>
            <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
              Whether the visitor is a patient, retailer, or optical professional, the experience should quickly route them to the right knowledge, the right product path, and the right action.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/patients" className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">For Patients</Link>
              <Link to="/professionals" className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">For Professionals</Link>
              <Link to="/knowledge" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Browse Knowledge Hub <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
