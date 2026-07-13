import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import Seo from "@/components/seo/Seo";
import {
  Trophy,
  Bike,
  Anchor,
  Eye,
  Shield,
  Sun,
  ArrowRight,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const DESIGNS = [
  {
    icon: <Trophy className="h-6 w-6" />,
    label: "For Golfers",
    text: "A stable, wide intermediate-to-distance field that keeps the ball, the fairway, and the scorecard in crisp focus without head-tilt hunting.",
    points: ["Steady distance zone", "Clean scorecard reading", "Minimal swim on the follow-through"],
  },
  {
    icon: <Bike className="h-6 w-6" />,
    label: "For Bikers & Cyclists",
    text: "Rock-steady peripheral vision and minimal swim at speed, engineered for wrap frames and an upright, forward gaze.",
    points: ["Wrap-frame compensated optics", "Wide peripheral awareness", "Stable vision at speed"],
  },
  {
    icon: <Anchor className="h-6 w-6" />,
    label: "For Boaters",
    text: "Optimized distance clarity paired with polarized and mirror treatments to cut glare off the water while holding the horizon sharp.",
    points: ["Glare-cutting polarized pairing", "Sharp horizon clarity", "Mirror-finish ready"],
  },
];

const BENEFITS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Dynamic, Wide-Field Vision",
    text: "Free-form optics tuned for movement — clear vision across the widest possible active field of gaze.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Wrap-Frame Compensation",
    text: "Optically compensated for high base-curve and wrap sport frames so the Rx stays accurate at every angle.",
  },
  {
    icon: <Sun className="h-5 w-5" />,
    title: "Sun & Glare Treatments",
    text: "Available with polarized, photochromic, and mirror finishes to perform in bright, changing outdoor light.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const SportPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Endless Sport Lenses — Wholesale B2B | Classic Visions"
        description="Endless Sport is a specialized progressive lens tuned for golfers, cyclists, and boaters — wrap-frame compensated optics with polarized, photochromic, and mirror treatment options for optical professionals."
        canonicalPath="/lenses/sport"
      />
      <Header />

      <main className="pb-20 pt-24">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Active &amp; Outdoor Vision
          </p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">
            Endless Sport
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            A specialized progressive design tuned for dynamic, outdoor vision —
            pairing our best free-form optics with wrap-friendly geometry and
            sun-ready treatments for players who don't sit still.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-accent text-accent-foreground">Endless Sport</Badge>
            <Badge variant="outline">Wrap-Frame Compensated</Badge>
          </div>
        </section>

        {/* ── Designs ────────────────────────────────────── */}
        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Tuned for the sport
          </h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            The same Endless free-form platform, optimized for the visual demands
            of specific activities.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {DESIGNS.map((d) => (
              <Card key={d.label} className="flex flex-col border-border">
                <CardContent className="flex flex-1 flex-col gap-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                    {d.icon}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {d.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{d.text}</p>
                  <ul className="mt-auto space-y-1.5 pt-3">
                    {d.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Benefits ───────────────────────────────────── */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">Why Endless Sport</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {BENEFITS.map((b) => (
                <Card key={b.title} className="border-border bg-background">
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {b.icon}
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {b.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{b.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold">
                  Fit your active patients with Endless Sport
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Contact us for design availability, materials, and treatment
                  options.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" asChild>
                  <Link to="/#contact">Contact Us</Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to="/lenses/progressive">
                    Progressive Range <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SportPage;
