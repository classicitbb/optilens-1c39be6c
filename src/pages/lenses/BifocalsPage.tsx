import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Layers, SplitSquareHorizontal, Sparkles, Cpu } from "lucide-react";
import { Link } from "react-router";

const WHY_PATIENTS_ASK = [
  "What is a bifocal lens — and how does it actually work?",
  "Who are bifocals best suited for, and when are they the right recommendation?",
  "How do digital freeform bifocals outperform conventional flat-tops?",
  "When should a patient upgrade from a traditional to a digital bifocal?",
];

const COMPARISON = [
  {
    title: "Conventional Flat-Top Bifocals",
    icon: <SplitSquareHorizontal className="h-5 w-5" />,
    points: [
      "A trusted, practical, and cost-effective lens format with clear distance and near separation.",
      "Many long-time wearers appreciate the familiar segment and straightforward visual behavior.",
      "That said, this legacy geometry is less versatile than modern digital options and can feel abrupt at the segment edge.",
    ],
  },
  {
    title: "Endless Bifocal (Digital Freeform)",
    icon: <Sparkles className="h-5 w-5" />,
    points: [
      "Entirely digital, point-by-point freeform optics provide dramatically improved lens performance.",
      "Built to be more usable for real patients day to day, with smoother visual behavior and better functional comfort.",
      "Available across materials, treatments, and wearing needs—making it a far more versatile modern bifocal platform.",
    ],
  },
];

const FITTING_GUIDANCE = [
  "Start with what the patient actually does all day (driving, reading, computer, phones, paperwork).",
  "Present flat-top bifocals positively as proven and familiar—but frame them as the older generation of bifocal optics.",
  "Position digital freeform bifocals as the modern standard when better optics and broader versatility are the goal.",
  "If intermediate demands are high, compare office or progressive designs during the same conversation.",
];

const BifocalsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Lens Education</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">Bifocals: What They Are — and Why Digital Is the Smarter Choice</h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Bifocals are corrective lenses with two distinct optical zones — distance vision above and near vision
            below, separated by a visible line. They’ve helped patients for decades. Today, fully digital freeform
            bifocals deliver that same familiar concept with dramatically better optics, comfort, and versatility.
            If your patient needs a bifocal, the digital version is the upgrade worth recommending.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Bifocal Education</Badge>
            <Badge variant="outline">Digital Freeform Optics</Badge>
          </div>
        </section>

        <section className="container mx-auto mt-14 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Understanding bifocals — and when to recommend digital</h2>
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
            <h2 className="text-2xl font-bold text-foreground">Conventional flat-top vs digital freeform bifocals</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              The right conversation is not old vs bad. It is proven legacy design vs modern digital performance.
              Flat-tops remain meaningful; digital freeform is simply the more advanced and adaptable bifocal path.
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
          <Card className="border-border">
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Why Endless Bifocal changes the category</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Endless Bifocal is digitally surfaced from the start. That means the optics are computed and produced
                  with higher precision than conventional molded legacy structures—delivering a clearer, more usable
                  bifocal experience across modern materials and configurations.
                </p>
              </div>
            </CardContent>
          </Card>
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
              <h2 className="text-xl font-semibold text-foreground">Source and transparency</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This page uses guidance from IOT’s Endless Bifocal information and reframes it into a practical,
                patient-first decision guide.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  IOT Lenses — Endless Bifocal:{" "}
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
                  Explore our evidence-based myopia control guide, including spectacles, contacts, ortho-k, and
                  atropine.
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
