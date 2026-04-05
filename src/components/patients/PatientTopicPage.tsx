import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

type TopicSection = {
  title: string;
  body: string;
};

type TopicHighlight = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type TopicAction = {
  label: string;
  to: string;
  variant?: "default" | "outline";
};

type TopicFaq = {
  question: string;
  answer: string;
};

type PatientTopicPageProps = {
  title: string;
  description: string;
  canonicalPath: string;
  eyebrow: string;
  intro: string;
  sections: TopicSection[];
  highlights: TopicHighlight[];
  faqs: TopicFaq[];
  primaryAction: TopicAction;
  secondaryAction?: TopicAction;
  backLabel?: string;
  backTo?: string;
};

const PatientTopicPage = ({
  title,
  description,
  canonicalPath,
  eyebrow,
  intro,
  sections,
  highlights,
  faqs,
  primaryAction,
  secondaryAction,
  backLabel = "Back to Patients Hub",
  backTo = "/patients",
}: PatientTopicPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Seo title={`${title} | Classic Visions`} description={description} canonicalPath={canonicalPath} />
      <Header />

      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <section className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold text-foreground md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant={primaryAction.variant ?? "default"}>
                <Link to={primaryAction.to}>{primaryAction.label}</Link>
              </Button>
              {secondaryAction ? (
                <Button asChild variant={secondaryAction.variant ?? "outline"}>
                  <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
                </Button>
              ) : null}
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-2xl font-semibold text-foreground">What to know</h2>
              <div className="mt-5 space-y-5">
                {sections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
                  </div>
                ))}
              </div>
            </article>

            <aside className="space-y-6">
              <Card variant="glass">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-foreground">Quick takeaways</h2>
                  <div className="mt-4 space-y-4">
                    {highlights.map((highlight) => (
                      <div key={highlight.title} className="rounded-xl border border-border/60 bg-background/70 p-4">
                        <highlight.icon className="h-5 w-5 text-primary" />
                        <h3 className="mt-3 text-sm font-semibold text-foreground">{highlight.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{highlight.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">Common questions</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-xl border border-border/60 p-4">
                  <h3 className="text-sm font-semibold text-foreground">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-muted/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Want help applying this to your routine?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bring your screen time, driving, reading, and outdoor habits to your next appointment so your optician can recommend the best combination.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to={backTo}>{backLabel}</Link>
                </Button>
                <Button asChild>
                  <Link to="/find-a-retailer">
                    Find a Retailer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PatientTopicPage;
