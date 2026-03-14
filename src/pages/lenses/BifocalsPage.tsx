import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Layers, SplitSquareHorizontal, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const WHY_PATIENTS_ASK = [
  "What exactly is a bifocal lens and who is it for?",
  "Why do traditional flat-top bifocals feel abrupt for some wearers?",
  "Is there a modern bifocal option before jumping to progressives?",
  "Can I still get a visible segment if I prefer it?",
];

const COMPARISON = [
  {
    title: "Traditional Flat-Top Bifocals",
    icon: <SplitSquareHorizontal className="h-5 w-5" />,
    points: [
      "Visible segment line with a clear distance zone and dedicated near segment.",
      "Reliable and familiar for experienced bifocal users.",
      "Can produce image jump at the segment edge and narrower transition comfort.",
    ],
  },
  {
    title: "Freeform Endless Bifocal",
    icon: <Sparkles className="h-5 w-5" />,
    points: [
      "Built from modern freeform surfacing and digital optimization for smoother visual behavior.",
      "Maintains bifocal functionality while improving balance, personalization, and overall comfort.",
      "Designed as a fresh alternative when wearers want bifocal simplicity with better lens performance.",
    ],
  },
];

const FITTING_GUIDANCE = [
  "Confirm visual priorities first: driving, reading, phone, paperwork, and work distance.",
  "Measure fitting height carefully; segment placement still drives success.",
  "Discuss adaptation expectations honestly, especially for patients coming from single-vision readers.",
  "If a patient needs more intermediate support, compare progressive or office designs as alternatives.",
];

const BifocalsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">They Ask, You Answer</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">Bifocals: Classic Design, Modern Freeform Upgrade</h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Bifocals remain a practical option for patients who want one lens with dedicated distance and near vision.
            Today, freeform designs like Endless Bifocal offer a new way to think about bifocals beyond the old
            flat-top-only conversation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Bifocal Education</Badge>
            <Badge variant="outline">Freeform Alternative</Badge>
          </div>
        </section>

        <section className="container mx-auto mt-14 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">What patients usually ask first</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {WHY_PATIENTS_ASK.map((question) => (
              <Card key={question}>
                <CardContent className="flex items-start gap-3 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">{question}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">Flat-top vs freeform bifocals</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Traditional flat-top designs still work well for many wearers, but freeform bifocals are worth discussing
              whenever comfort, smoother viewing behavior, or personalization is a priority.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {COMPARISON.map((item) => (
                <Card key={item.title} className="border-border bg-background">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-center gap-2 text-primary">
                      {item.icon}
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {item.points.map((point) => (
                        <li key={point} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">How to guide the conversation in practice</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FITTING_GUIDANCE.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-border p-4">
                <Layers className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground">Sources and transparency</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This page was developed using guidance from the IOT Endless Bifocal overview and translated into a
                patient-first, decision-support format.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  IOT Lenses — Endless Bifocal: {" "}
                  <a
                    href="https://iotlenses.com/Discover-our-lenses/Bifocal-solutions/Endless-Bifocal.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    https://iotlenses.com/Discover-our-lenses/Bifocal-solutions/Endless-Bifocal.html
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Need options beyond bifocals for younger patients?</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Explore our evidence-based myopia control guide, including spectacles, contacts, ortho-k, and atropine.
                </p>
              </div>
              <Button variant="secondary" asChild>
                <Link to="/lenses/myopia-control">
                  Go to Myopia Control <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BifocalsPage;
