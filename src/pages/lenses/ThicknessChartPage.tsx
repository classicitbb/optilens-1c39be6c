import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  Ruler,
  ScanLine,
  Glasses,
  Info,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Thickness data (optically derived)                                 */
/* ------------------------------------------------------------------ */

/**
 * Edge thickness for minus lenses & center thickness for plus lenses
 * calculated from the lensmaker's equation for a 70 mm round blank
 * with a 1.2 mm minimum center (minus) or 1.5 mm minimum edge (plus).
 *
 * Formula (simplified plano-concave / plano-convex):
 *   sag = r − √(r² − y²)   where r = (n−1)/D (metres), y = half-diameter
 *   edge (minus) = center_min + sag
 *   center (plus) = edge_min + sag
 *
 * Values rounded to one decimal, matching industry reference charts.
 */

type ThicknessRow = {
  power: string;        // e.g. "−2.00" or "+2.00"
  values: Record<string, number>; // keyed by material index
};

const MATERIAL_KEYS = ["1.50", "POLY", "Trivex", "1.60", "1.67", "1.74"] as const;
const MATERIAL_LABELS: Record<string, string> = {
  "1.50": "1.50",
  POLY: "Poly 1.59",
  Trivex: "Trivex 1.53",
  "1.60": "1.60",
  "1.67": "1.67",
  "1.74": "1.74",
};
const REFRACTIVE: Record<string, number> = {
  "1.50": 1.5,
  POLY: 1.586,
  Trivex: 1.53,
  "1.60": 1.6,
  "1.67": 1.67,
  "1.74": 1.74,
};

const BLANK_DIA = 70; // mm
const HALF_DIA = BLANK_DIA / 2; // 35 mm
const CT_MIN = 1.2; // mm minimum center for minus
const ET_MIN = 1.5; // mm minimum edge for plus

function sag(diopters: number, n: number): number {
  // r = (n-1)/|D| in metres → convert to mm
  const rMm = ((n - 1) / Math.abs(diopters)) * 1000;
  const s = rMm - Math.sqrt(rMm * rMm - HALF_DIA * HALF_DIA);
  return s;
}

function buildMinusRows(): ThicknessRow[] {
  const powers = [2, 3, 4, 5, 6, 8, 10];
  return powers.map((p) => {
    const values: Record<string, number> = {};
    MATERIAL_KEYS.forEach((k) => {
      const s = sag(p, REFRACTIVE[k]);
      values[k] = Math.round((CT_MIN + s) * 10) / 10;
    });
    return { power: `−${p.toFixed(2)}`, values };
  });
}

function buildPlusRows(): ThicknessRow[] {
  const powers = [2, 3, 4, 5, 6, 8];
  return powers.map((p) => {
    const values: Record<string, number> = {};
    MATERIAL_KEYS.forEach((k) => {
      const s = sag(p, REFRACTIVE[k]);
      values[k] = Math.round((ET_MIN + s) * 10) / 10;
    });
    return { power: `+${p.toFixed(2)}`, values };
  });
}

const MINUS_ROWS = buildMinusRows();
const PLUS_ROWS = buildPlusRows();

/* ------------------------------------------------------------------ */
/*  Lens cross-section SVG (optically proportional)                    */
/* ------------------------------------------------------------------ */

/**
 * Renders a simplified lens cross-section.
 * minus → thicker at edge, thinner at center (meniscus concave)
 * plus  → thicker at center, thinner at edge (meniscus convex)
 */
const LensCrossSection = ({
  type,
  label,
  edgeMm,
  centerMm,
}: {
  type: "minus" | "plus";
  label: string;
  edgeMm: number;
  centerMm: number;
}) => {
  const W = 180;
  const H = 100;
  const cx = W / 2;
  const maxThick = Math.max(edgeMm, centerMm);
  const scale = 60 / maxThick; // scale so thickest = 60px
  const edgePx = edgeMm * scale;
  const centerPx = centerMm * scale;

  // We draw two curves: front surface and back surface
  const topY = (H - Math.max(edgePx, centerPx)) / 2;

  // Front curve (convex for both, slight)
  const frontEdgeY = topY;
  const frontCenterY = topY + (type === "plus" ? -4 : 4);

  // Back curve
  const backEdgeY = topY + edgePx;
  const backCenterY = topY + centerPx;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Front surface */}
        <path
          d={`M 20,${frontEdgeY} Q ${cx},${frontCenterY} ${W - 20},${frontEdgeY}`}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
        {/* Back surface */}
        <path
          d={`M 20,${backEdgeY} Q ${cx},${backCenterY} ${W - 20},${backEdgeY}`}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
        {/* Fill between curves */}
        <path
          d={`M 20,${frontEdgeY} Q ${cx},${frontCenterY} ${W - 20},${frontEdgeY} L ${W - 20},${backEdgeY} Q ${cx},${backCenterY} 20,${backEdgeY} Z`}
          fill="hsl(var(--primary) / 0.08)"
          stroke="none"
        />
        {/* Edge lines */}
        <line x1={20} y1={frontEdgeY} x2={20} y2={backEdgeY} stroke="hsl(var(--primary))" strokeWidth={2} />
        <line x1={W - 20} y1={frontEdgeY} x2={W - 20} y2={backEdgeY} stroke="hsl(var(--primary))" strokeWidth={2} />

        {/* Dimension arrows — edge */}
        <line x1={10} y1={frontEdgeY} x2={10} y2={backEdgeY} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2,2" />
        <text x={6} y={(frontEdgeY + backEdgeY) / 2 + 3} fontSize={8} fill="hsl(var(--muted-foreground))" textAnchor="end">
          {edgeMm.toFixed(1)}
        </text>

        {/* Dimension arrows — center */}
        <line x1={cx} y1={frontCenterY} x2={cx} y2={backCenterY} stroke="hsl(var(--accent))" strokeWidth={1.5} strokeDasharray="2,2" />
        <text x={cx} y={backCenterY + 12} fontSize={8} fill="hsl(var(--accent))" textAnchor="middle" fontWeight={600}>
          {centerMm.toFixed(1)} mm
        </text>
      </svg>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Thickness table component                                          */
/* ------------------------------------------------------------------ */

const ThicknessTable = ({
  title,
  subtitle,
  description,
  rows,
  thicknessLabel,
}: {
  title: string;
  subtitle: string;
  description: string;
  rows: ThicknessRow[];
  thicknessLabel: string;
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-sm text-accent font-medium">{subtitle}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">Power (D)</th>
            {MATERIAL_KEYS.map((k) => (
              <th key={k} className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">
                {MATERIAL_LABELS[k]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.power} className={`border-b border-border ${ri % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
              <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{row.power}</td>
              {MATERIAL_KEYS.map((k) => {
                // highlight the thinnest value in the row
                const vals = Object.values(row.values);
                const min = Math.min(...vals);
                const isMin = row.values[k] === min;
                return (
                  <td
                    key={k}
                    className={`px-4 py-2.5 text-center whitespace-nowrap ${isMin ? "font-bold text-secondary" : "text-muted-foreground"}`}
                  >
                    {row.values[k].toFixed(1)} mm
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30">
            <td colSpan={MATERIAL_KEYS.length + 1} className="px-4 py-2 text-xs text-muted-foreground italic">
              {thicknessLabel} · 70 mm round blank · Green = thinnest option
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const ThicknessChartPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero pb-16 pt-28">
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-secondary/8 blur-3xl" />
        <div className="container relative mx-auto max-w-5xl px-4 text-center lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">Technical Reference</p>
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
            Edge &amp; Center Thickness Chart
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Understand how lens power, material index, and blank size interact to determine 
            edge and center thickness — and why providing frame shapes matters.
          </p>
        </div>
      </section>

      <main className="container mx-auto max-w-5xl space-y-20 px-4 py-16 lg:px-8">

        {/* Visual cross-sections */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">How Lens Power Affects Thickness</h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              Minus (concave) lenses are thicker at the edge; plus (convex) lenses are thicker at the center.
              Higher-index materials bend light more efficiently, producing thinner profiles.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Minus lens examples */}
            <Card variant="glass">
              <CardContent className="space-y-6 p-6">
                <div>
                  <Badge variant="outline" className="mb-2">Minus Lens (−4.00 D)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Edge thickness decreases as index rises — same prescription, thinner edges.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                  <LensCrossSection type="minus" label="1.50" edgeMm={4.5} centerMm={1.2} />
                  <LensCrossSection type="minus" label="1.60" edgeMm={3.5} centerMm={1.2} />
                  <LensCrossSection type="minus" label="1.74" edgeMm={2.6} centerMm={1.2} />
                </div>
              </CardContent>
            </Card>

            {/* Plus lens examples */}
            <Card variant="glass">
              <CardContent className="space-y-6 p-6">
                <div>
                  <Badge variant="outline" className="mb-2">Plus Lens (+4.00 D)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Center thickness decreases as index rises — same prescription, thinner overall.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                  <LensCrossSection type="plus" label="1.50" edgeMm={1.5} centerMm={5.0} />
                  <LensCrossSection type="plus" label="1.60" edgeMm={1.5} centerMm={3.9} />
                  <LensCrossSection type="plus" label="1.74" edgeMm={1.5} centerMm={3.0} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Minus thickness chart */}
        <ThicknessTable
          title="Minus Lens — Edge Thickness"
          subtitle="Thicker at the edges, thinner at center"
          description="Edge thickness for a 70 mm round uncut blank with 1.2 mm minimum center thickness. Higher-index materials produce progressively thinner edges."
          rows={MINUS_ROWS}
          thicknessLabel="Edge thickness shown"
        />

        {/* Plus thickness chart */}
        <ThicknessTable
          title="Plus Lens — Center Thickness"
          subtitle="Thicker at the center, thinner at edges"
          description="Center thickness for a 70 mm round uncut blank with 1.5 mm minimum edge thickness. Higher-index materials reduce center bulge."
          rows={PLUS_ROWS}
          thicknessLabel="Center thickness shown"
        />

        {/* Why shapes matter */}
        <section className="space-y-8">
          <div className="text-center">
            <ScanLine className="mx-auto mb-3 h-8 w-8 text-accent" />
            <h2 className="text-3xl font-bold text-foreground">
              Why Providing Frame Shapes Matters
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              The charts above assume a full 70 mm round blank. In reality, the lab cuts the lens 
              to match your frame — and that changes everything.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card variant="feature">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Ruler className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Smaller Blank = Thinner Lens</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When the lab knows the exact frame shape (via a tracer file or frame template), 
                  it can calculate the <strong>minimum blank diameter (MBS)</strong> needed. 
                  A smaller blank means less material at the edges for minus lenses, and less 
                  material at the center for plus lenses — resulting in a noticeably thinner, 
                  lighter finished lens.
                </p>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Example: −6.00 D in 1.60</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="block font-semibold text-destructive">70 mm blank</span>
                      <span>Edge: ~6.5 mm</span>
                    </div>
                    <div className="border-l border-border pl-4">
                      <span className="block font-semibold text-secondary">58 mm blank (shaped)</span>
                      <span>Edge: ~4.3 mm</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="feature">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Glasses className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Accurate Cutout, Better Cosmetics</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Without a shape, the lab must surface the lens on the largest standard blank to 
                  guarantee coverage. With a shape file, the surfacing center can:
                </p>
                <ul className="space-y-2">
                  {[
                    "Optimise decentration to position the optical center precisely",
                    "Select the smallest suitable blank for minimum thickness",
                    "Ensure the lens edge profile is even around the frame",
                    "Avoid unnecessary thickness in high-wrap or curved frames",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* How to provide shapes */}
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">How to Provide Frame Shapes</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Use your tracer (Briot, Nidek, Huvitz, etc.) to capture the frame shape and 
                    transmit the <strong>.oma / VCA file</strong> with your order. Alternatively, 
                    send the frame to the lab for tracing. Most modern tracers can export directly 
                    to our ordering system via LabLink.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>Tip:</strong> Even for stock lens orders, providing the shape allows 
                    the lab to verify edge thickness and flag potential fit issues before cutting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Material selection guide */}
        <section className="rounded-2xl border border-border bg-card p-8 lg:p-10">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground">Choosing Material for Optimal Thickness</h2>
            <p className="mt-2 text-muted-foreground">Quick guidelines based on prescription range</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                range: "± 0.00 – 2.00 D",
                material: "1.50 or Poly",
                note: "Thickness differences are minimal. Choose Poly for impact resistance or 1.50 for the best optics at the lowest cost.",
              },
              {
                range: "± 2.25 – 4.00 D",
                material: "1.60 recommended",
                note: "Noticeable thickness reduction over 1.50, especially in larger frames. Best balance of cost vs. cosmetics.",
              },
              {
                range: "± 4.25 – 6.00 D",
                material: "1.67 recommended",
                note: "Up to 40 % thinner edges (minus) or center (plus) compared to 1.50. A meaningful upgrade for patient satisfaction.",
              },
              {
                range: "± 6.25 – 8.00 D",
                material: "1.67 or 1.74",
                note: "1.74 delivers the thinnest possible result. Pair with a compact frame shape for dramatic improvement.",
              },
              {
                range: "Above ± 8.00 D",
                material: "1.74 strongly recommended",
                note: "At these powers, every fraction of a millimeter matters. Always provide shape data for optimum blank selection.",
              },
              {
                range: "Safety / Children",
                material: "Poly or Trivex",
                note: "Impact resistance is the priority. Trivex offers superior optics (higher Abbe) with the same safety rating.",
              },
            ].map((item) => (
              <div key={item.range} className="space-y-2">
                <h3 className="font-semibold text-foreground">{item.range}</h3>
                <Badge variant="secondary" className="text-xs">{item.material}</Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Explore Our Lens Materials</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            See detailed specs, best-use cases, and side-by-side comparisons for every material we offer.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button variant="hero" size="lg" asChild>
              <Link to="/lenses/materials" className="group">
                View Materials
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ThicknessChartPage;
