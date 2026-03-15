import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Eye,
  Focus,
  Monitor,
  Zap,
  ArrowRight,
  Check,
  ScanLine,
  Layers,
  GraduationCap,
  Laptop,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const POWER_BOOSTS = [
  {
    value: "0.50 D",
    label: "Light Boost",
    description:
      "Gentle near support for early pre-presbyopes and younger digital device users who experience occasional fatigue.",
  },
  {
    value: "0.75 D",
    label: "Medium Boost",
    description:
      "Balanced near support for moderate screen users and emerging presbyopes who need noticeable fatigue relief.",
  },
  {
    value: "1.00 D",
    label: "Full Boost",
    description:
      "Maximum near support for heavy digital users or advanced pre-presbyopes who require significant accommodative relief.",
  },
];

const BENEFITS = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "More Relaxed Vision",
    text: "Reduces accommodative effort to provide noticeably more comfortable vision throughout the day.",
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    title: "Improved Digital Reading Speed",
    text: "Designed to significantly improve reading speed on digital devices by reducing strain.",
  },
  {
    icon: <Focus className="h-5 w-5" />,
    title: "Comfortable & Precise Focus",
    text: "Comfortable and precise focus at all distances — near, intermediate, and far.",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Excellent Distance & Peripheral Vision",
    text: "Near elimination of peripheral blur with excellent distance zone clarity.",
  },
  {
    icon: <ScanLine className="h-5 w-5" />,
    title: "Superior Digital Quality",
    text: "Impeccable visual quality and precise focus when using digital screens.",
  },
];

const TECHNOLOGIES = [
  {
    icon: <ScanLine className="h-6 w-6" />,
    name: "IOT Digital Ray-Path 2",
    description:
      "Point-by-point ray-tracing optimization over the entire lens surface for precise vision at every distance.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    name: "Personalized Design",
    description:
      "Each lens is fully customized to the individual wearer's prescription, frame, and fitting parameters.",
  },
];

const IDEAL_FOR = [
  {
    icon: <Users className="h-6 w-6" />,
    label: "Pre-Presbyopes",
    description:
      "Wearers in their late 30s to early 40s beginning to notice difficulty with near focus and screen work.",
  },
  {
    icon: <Laptop className="h-6 w-6" />,
    label: "Digital Device Users",
    description:
      "Anyone spending extended hours on screens who experiences eye strain, headaches, or tired eyes.",
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    label: "Students & Young Professionals",
    description:
      "Younger wearers who read extensively or use devices for long periods and need accommodative support.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const AntiFatiguePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Everyday Vision
          </p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">
            Endless Anti-Fatigue Lenses
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Personalized single-vision lenses featuring a unique power boost to
            combat visual fatigue — designed to significantly improve reading
            speed on digital devices while maintaining excellent distance
            vision.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Personalized</Badge>
            <Badge variant="outline">MFH: 14, 18 mm</Badge>
          </div>
        </section>

        {/* ── How It Works — Power Boosts ─────────────────── */}
        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            A subtle near-support zone is added to the lower portion of a
            single-vision lens, providing a small boost in power that reduces
            accommodative effort. Choose from three boost levels.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {POWER_BOOSTS.map((pb) => (
              <Card
                key={pb.value}
                className="relative flex flex-col border-border"
              >
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-sm">
                    {pb.value}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {pb.label}
                  </h3>
                </div>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">
                    {pb.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Benefits ───────────────────────────────────── */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">Key Benefits</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {b.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {b.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Technologies ───────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Technology Inside
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {TECHNOLOGIES.map((t) => (
              <Card key={t.name} className="border-border">
                <CardContent className="flex flex-col gap-2 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {t.icon}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Ideal For ──────────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Ideal For</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {IDEAL_FOR.map((w) => (
              <Card key={w.label} className="border-border">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {w.icon}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {w.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {w.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold">
                  Relief from digital eye strain
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Contact us or browse our store to find the right anti-fatigue
                  solution.
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
                  <Link to="/store">
                    Shop Lenses <ArrowRight className="ml-2 h-4 w-4" />
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

export default AntiFatiguePage;

