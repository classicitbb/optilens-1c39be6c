import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import Seo from "@/components/seo/Seo";
import {
  Eye,
  Focus,
  Layers,
  ScanLine,
  Monitor,
  Shield,
  ArrowRight,
  Check,
  Star,
  Zap,
  Users,
  Laptop,
  BookOpen,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const PRODUCTS = [
  {
    name: "Endless Steady",
    tier: "Best",
    tierColor: "bg-accent text-accent-foreground",
    personalized: true,
    tagline: "Optimized to ensure impeccable vision quality",
    description:
      "Fully personalized progressive lens with an advanced design that considers the wearer's accommodative ability to focus at different distances, ensuring exceptional clarity and comfort.",
    mfh: "14, 15, 16, 17, 18 mm",
    features: [
      "Precise, comfortable focus for all working distances and directions",
      "Near elimination of peripheral blur",
      "Higher image stability for reduced swim effect",
      "Superior visual quality for digital devices",
      "Improved peripheral acuity in the distance zone",
    ],
    technologies: ["IOT Digital Ray-Path 2", "Steady Methodology"],
  },
  {
    name: "Essential Steady",
    tier: "Better",
    tierColor: "bg-secondary text-secondary-foreground",
    personalized: false,
    tagline: "High quality and affordable progressive lens",
    description:
      "Non-compensated free-form progressive lens offering a larger field of vision and greater comfort than others in its class.",
    mfh: "14, 15, 16, 17, 18 mm",
    features: [
      "Higher image stability for reduced swim effect",
      "Improved peripheral acuity in the distance zone",
      "Good balance between near and distance fields",
      "Variable inset for improved binocular vision",
    ],
    technologies: ["Steady Methodology"],
  },
  {
    name: "Classic",
    tier: "Good",
    tierColor: "bg-primary text-primary-foreground",
    personalized: false,
    tagline: "Entry-level digital progressive lens",
    description:
      "Non-compensated progressive lens made with free-form technology, offering superior vision to a conventional lens.",
    mfh: "14, 15, 16, 17, 18 mm",
    features: [
      "Balanced near and distance fields",
      "Variable inset for improved binocular vision and wider near area",
      "Free-form digital surfacing",
    ],
    technologies: ["Digital Surfacing"],
  },
  {
    name: "Adapt",
    tier: "Basic",
    tierColor: "bg-muted text-muted-foreground",
    personalized: false,
    tagline: "Basic conventional progressive lens",
    description:
      "Traditional progressive design for wearers seeking an affordable, reliable multifocal solution.",
    mfh: "14, 17 mm",
    features: ["Balanced near and distance fields", "Fixed inset"],
    technologies: ["Conventional Design"],
  },
];

const TECHNOLOGIES = [
  {
    icon: <Eye className="h-6 w-6" />,
    name: "Spatial Vision",
    stat: "99.5% of gaze directions optimized",
    description:
      "Optimizes the lens across virtually every direction of gaze, delivering clear vision from edge to edge.",
  },
  {
    icon: <Focus className="h-6 w-6" />,
    name: "Eye Focus",
    stat: null,
    description:
      "Maximizes the clear viewing area and significantly reduces perceived peripheral blur, achieving an absolute reduction in defocus.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    name: "Visual Stability",
    stat: null,
    description:
      "Significantly reduces swim effect when moving. Virtually eliminates image distortion for a comfortable and clear visual experience.",
  },
  {
    icon: <ScanLine className="h-6 w-6" />,
    name: "Ray Tracing",
    stat: null,
    description:
      "Point-by-point optimization over the entire lens surface provides precise vision at every distance and in every direction of gaze.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    name: "Digital Surfacing",
    stat: null,
    description:
      "Calculates the back surface using a pure geometrical method that produces lenses with the advantages of the digital process, like flexible designs.",
  },
  {
    icon: <Monitor className="h-6 w-6" />,
    name: "Digital Vision",
    stat: null,
    description:
      "Designed to alleviate eyestrain caused by frequent use of digital devices to provide optimal support when viewing digital screens.",
  },
];

const BENEFITS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Peripheral Blur Reduction",
    text: "Near elimination of unwanted blur at the edges of the lens for uninterrupted peripheral awareness.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Image Stability",
    text: "Reduced swim effect for a smoother, more natural visual experience when moving your head.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Binocular Vision",
    text: "Variable inset technology for improved binocular performance and wider usable near area.",
  },
  {
    icon: <Laptop className="h-5 w-5" />,
    title: "Digital Device Comfort",
    text: "Optimized support when viewing smartphones, tablets, and monitors to reduce digital eye strain.",
  },
];

const IDEAL_WEARERS = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    label: "Near Vision",
    description:
      "Expert or novice progressive lens wearers who have visual demands that call for a larger, more usable near area.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    label: "Distance Vision",
    description:
      "Expert or novice progressive wearers who have visual demands that call for a larger, more usable distance area.",
  },
  {
    icon: <Monitor className="h-6 w-6" />,
    label: "Intermediate Vision",
    description:
      "First-time wearers, those who have experienced non-adapts, and those who need a larger, more usable intermediate area.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const ProgressivePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Progressive Lenses — Wholesale B2B | Classic Visions"
        description="Explore wholesale progressive lenses from Classic Visions, including personalized and digital free-form options for B2B optical practices across the Caribbean."
        canonicalPath="/lenses/progressive"
      />
      <Header />

      <main className="pb-20 pt-24">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Everyday Vision
          </p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">
            Progressive Lenses
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Personalized, digital free-form progressive lenses made to every
            patient's specific needs using the latest innovations in lens
            optimization technology. See&nbsp;the&nbsp;difference.
          </p>
        </section>

        {/* ── Product Lineup ─────────────────────────────── */}
        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Product Lineup
          </h2>
          <p className="mt-1 text-muted-foreground">
            Choose the progressive design that best fits your patient's needs
            and budget.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <Card
                key={p.name}
                className="relative flex flex-col overflow-hidden border-border"
              >
                <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                  <Badge className={p.tierColor}>{p.tier}</Badge>
                  {p.personalized && (
                    <Badge variant="outline" className="text-xs">
                      Personalized
                    </Badge>
                  )}
                </div>
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-lg font-semibold text-foreground">
                    {p.name}
                  </h3>
                  <p className="text-xs italic text-muted-foreground">
                    "{p.tagline}"
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {p.description}
                  </p>

                  <ul className="mt-auto space-y-1.5 pt-3">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">MFH:</span>{" "}
                      {p.mfh}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Tech:</span>{" "}
                      {p.technologies.join(", ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Key Technologies ───────────────────────────── */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">
              Groundbreaking Technology
            </h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              These principles underpin IOT's cutting-edge lens optimization
              technologies — IOT Digital Ray-Path&nbsp;2 and Steady
              Methodology.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TECHNOLOGIES.map((t) => (
                <Card key={t.name} className="border-border bg-background">
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {t.icon}
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {t.name}
                    </h3>
                    {t.stat && (
                      <p className="text-xs font-medium text-accent">
                        {t.stat}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Benefits ───────────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Key Benefits</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  {b.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Ideal Wearers ──────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Ideal Wearer Profiles
          </h2>
          <p className="mt-1 text-muted-foreground">
            Each Endless Steady option is available in three performance
            variants to match the wearer's primary visual demand.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {IDEAL_WEARERS.map((w) => (
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
                  Ready to find the right progressive?
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Contact us or browse our store for personalized
                  recommendations.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" asChild>
                  <Link to="/#contact">
                    Contact Us
                  </Link>
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

export default ProgressivePage;
