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
  Glasses,
  BookOpen,
  ArrowRight,
  Check,
  ScanLine,
  Layers,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const BENEFITS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Impeccable Visual Quality",
    text: "Superior clarity especially for high prescriptions and wrapped frames, thanks to point-by-point ray-tracing optimization.",
  },
  {
    icon: <Focus className="h-5 w-5" />,
    title: "Comfortable & Accurate Focus",
    text: "Precise focusing at all distances — near, intermediate, and far — in every direction of gaze.",
  },
  {
    icon: <ScanLine className="h-5 w-5" />,
    title: "Peripheral Blur Elimination",
    text: "Near elimination of unwanted peripheral blur for a wider, more comfortable field of clear vision.",
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    title: "Digital Device Quality",
    text: "Superior visual quality when viewing smartphones, tablets, and monitors — reducing digital eye strain.",
  },
];

const TECHNOLOGIES = [
  {
    icon: <ScanLine className="h-6 w-6" />,
    name: "IOT Digital Ray-Path 2",
    description:
      "Point-by-point optimization over the entire lens surface using advanced ray-tracing to provide precise vision at every distance and direction of gaze.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    name: "Spatial Vision",
    description:
      "99.5% of gaze directions are optimized, delivering clear vision from edge to edge across virtually every viewing angle.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    name: "Personalized Design",
    description:
      "Each lens is customized to the individual wearer's prescription and frame parameters for maximum visual performance.",
  },
];

const IDEAL_FOR = [
  {
    icon: <Eye className="h-6 w-6" />,
    label: "Distance Wearers",
    description:
      "Patients needing full-time distance correction with the widest, clearest field of vision possible.",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    label: "Reading & Near Tasks",
    description:
      "Dedicated near-vision prescriptions for reading, crafts, and close-up hobbies with edge-to-edge clarity.",
  },
  {
    icon: <Monitor className="h-6 w-6" />,
    label: "Computer & Digital Use",
    description:
      "Single-vision wearers who spend significant time on screens and need optimized digital vision support.",
  },
];

const MATERIALS = [
  { index: "1.50", name: "CR-39", abbe: "58", density: "Low", best: "Economy" },
  { index: "1.56", name: "Mid-Index", abbe: "42", density: "Low", best: "Value / Thinner" },
  { index: "1.60", name: "MR-8", abbe: "42", density: "Medium", best: "Moderate Rx" },
  { index: "1.67", name: "MR-7", abbe: "32", density: "Medium", best: "Higher Rx" },
  { index: "1.74", name: "MR-174", abbe: "33", density: "Medium", best: "Highest Rx / Thinnest" },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const SingleVisionPage = () => {
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
            Endless Single Vision
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Personalized free-form single vision lenses delivering impeccable
            visual quality for every prescription — powered by IOT Digital
            Ray-Path&nbsp;2 technology.
          </p>
          <Badge variant="outline" className="mt-4">
            Personalized
          </Badge>
        </section>

        {/* ── Key Benefits ───────────────────────────────── */}
        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
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

        {/* ── Technologies ───────────────────────────────── */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">
              Technology Inside
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {TECHNOLOGIES.map((t) => (
                <Card key={t.name} className="border-border bg-background">
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

        {/* ── Materials Table ────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Available Materials
          </h2>
          <p className="mt-1 text-muted-foreground">
            All materials are available in clear, photochromic, and tinted
            options.
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Index
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Abbe Value
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Density
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Best For
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATERIALS.map((m) => (
                  <tr
                    key={m.index}
                    className="border-t border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {m.index}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.abbe}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.density}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.best}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold">
                  Superior single vision starts here
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Contact us for pricing or browse our online store.
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

export default SingleVisionPage;
