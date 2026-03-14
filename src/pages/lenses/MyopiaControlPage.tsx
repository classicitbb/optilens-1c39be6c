import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CircleCheckBig,
  Compass,
  Microscope,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const WHAT_IS_MYOPIA_CONTROL = [
  "Myopia control means slowing prescription progression and eye elongation in children and teens.",
  "No single method works best for every child; treatment should match age, risk, lifestyle, and tolerance.",
  "Good outcomes usually come from regular follow-up and objective tracking (refraction and axial length where available).",
];

const OPTIONS = [
  {
    title: "Specialized myopia-control spectacle lenses",
    icon: <ShieldCheck className="h-5 w-5" />,
    details:
      "A strong first-line option for families that prefer glasses. Designs differ by optical strategy, but the goal is to reduce progression while maintaining daily comfort and compliance.",
  },
  {
    title: "Soft myopia-control contact lenses",
    icon: <CircleCheckBig className="h-5 w-5" />,
    details:
      "Dual-focus or multifocal soft lenses can reduce progression when worn consistently. They can work well for active children ready for contact lens hygiene and handling.",
  },
  {
    title: "Orthokeratology (ortho-k)",
    icon: <Compass className="h-5 w-5" />,
    details:
      "Overnight rigid lenses reshape the cornea temporarily for daytime unaided vision and can slow myopia progression in many children. Requires strict hygiene and close clinical monitoring.",
  },
  {
    title: "Low-dose atropine eye drops",
    icon: <Microscope className="h-5 w-5" />,
    details:
      "Nightly atropine (commonly low concentrations) can slow progression. Dose selection should be individualized by the prescriber due to efficacy and side-effect trade-offs.",
  },
];

const PRACTICAL_COUNSELING = [
  "Increase outdoor time (target around 2 hours/day when practical).",
  "Reduce prolonged near work and encourage regular visual breaks.",
  "Treat dry eye/allergy issues that can undermine contact lens wear and compliance.",
  "Set expectations: control means slowing progression, not curing myopia.",
];

const STUDIES = [
  {
    citation:
      "Chamberlain P, et al. A 3-year Randomized Clinical Trial of MiSight Lenses for Myopia Control. Optometry and Vision Science. 2019;96(8):556-567.",
    link: "https://pubmed.ncbi.nlm.nih.gov/31343513/",
    finding:
      "MiSight soft contact lenses significantly slowed myopia progression and axial elongation versus single-vision controls over 3 years.",
  },
  {
    citation:
      "Walline JJ, et al. Multifocal Contact Lens Myopia Control (BLINK) Study. JAMA. 2020;324(6):571-580.",
    link: "https://pubmed.ncbi.nlm.nih.gov/32780139/",
    finding:
      "High-add multifocal soft lenses slowed myopia progression compared with single-vision contact lenses.",
  },
  {
    citation:
      "Cho P, et al. Retardation of Myopia in Orthokeratology (ROMIO) Study. Investigative Ophthalmology & Visual Science. 2012;53(11):7077-7085.",
    link: "https://pubmed.ncbi.nlm.nih.gov/22969068/",
    finding: "Orthokeratology reduced axial elongation compared with single-vision spectacles in children.",
  },
  {
    citation:
      "Yam JC, et al. Low-Concentration Atropine for Myopia Progression (LAMP Study). Ophthalmology. 2019;126(1):113-124.",
    link: "https://pubmed.ncbi.nlm.nih.gov/30121150/",
    finding:
      "Atropine showed a concentration-dependent effect, with stronger control at higher low-dose concentrations.",
  },
];

const MyopiaControlPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">They Ask, You Answer</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">
            Myopia Control: Honest Guide for Parents and Patients
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            If a child’s prescription is increasing each year, the key question is not "glasses or contacts?" It is
            "which evidence-based strategy fits this child best right now?" This page gives the real options,
            including glasses, soft contacts, orthokeratology, and atropine.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Evidence-based</Badge>
            <Badge variant="outline">All Working Options</Badge>
            <Badge variant="outline">Parent-Friendly</Badge>
          </div>
        </section>

        <section className="container mx-auto mt-14 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">What myopia control actually means</h2>
          <div className="mt-6 space-y-3">
            {WHAT_IS_MYOPIA_CONTROL.map((point) => (
              <div key={point} className="flex gap-3 rounded-lg border border-border p-4">
                <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">
              All validated options (including ortho-k and contacts)
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {OPTIONS.map((option) => (
                <Card key={option.title} className="border-border bg-background">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-center gap-2 text-primary">
                      {option.icon}
                      <h3 className="text-base font-semibold text-foreground">{option.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.details}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto mt-12 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Need a lens-based plan tailored to your patient profile?</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  We can supply lens-based myopia-control solutions matched to age, lifestyle, dispensing goals, and
                  clinical workflow.
                </p>
              </div>
              <Button variant="secondary" asChild>
                <Link to="/#contact">
                  Contact Us <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 p-5 dark:border-amber-500/30 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Truth over hype</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  No treatment guarantees zero progression. The right plan is the one a child can wear consistently,
                  safely, and long term—with review intervals set by the prescribing eye care professional.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Lifestyle support that still matters</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PRACTICAL_COUNSELING.map((point) => (
              <div key={point} className="flex gap-3 rounded-lg border border-border p-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground">Research references used on this page</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We used IOT’s overview as a starting point, then linked original peer-reviewed studies so families and
                practitioners can evaluate the evidence directly.
              </p>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li>
                  IOT Lenses — Myopia Management Lenses:{" "}
                  <a
                    href="https://iotlenses.com/Discover-our-lenses/Myopia-Management-Lenses.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    https://iotlenses.com/Discover-our-lenses/Myopia-Management-Lenses.html
                  </a>
                </li>
                {STUDIES.map((study) => (
                  <li key={study.citation}>
                    <p>{study.citation}</p>
                    <p className="mt-1">Key finding: {study.finding}</p>
                    <a
                      href={study.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {study.link}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MyopiaControlPage;
