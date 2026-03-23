import { Check, X } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import ZenvueFeatureShell from "@/components/zenvue/ZenvueFeatureShell";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

type CellValue = true | false | string;

interface CompareRow {
  feature: string;
  brilliance: CellValue;
  singleVision: CellValue;
}

const ROWS: CompareRow[] = [
  { feature: "Lens Type", brilliance: "Progressive", singleVision: "Single Vision" },
  { feature: "CR-39 (1.50)", brilliance: true, singleVision: true },
  { feature: "Polycarbonate (1.59)", brilliance: true, singleVision: true },
  { feature: "Hi-Index (1.67)", brilliance: true, singleVision: true },
  { feature: "Clear Option", brilliance: true, singleVision: true },
  { feature: "Darkun™ Photochromic", brilliance: true, singleVision: true },
  { feature: "Polarized options", brilliance: false, singleVision: false },
  { feature: "Multi-coat AR", brilliance: true, singleVision: true },
  { feature: "Hard Coat", brilliance: true, singleVision: true },
  { feature: "UV400 Protection", brilliance: true, singleVision: true },
  { feature: "Hydrophobic", brilliance: true, singleVision: true },
  { feature: "Distance Vision", brilliance: true, singleVision: true },
  { feature: "Near Vision", brilliance: true, singleVision: "Dedicated" },
];

const renderCell = (val: CellValue) => {
  if (val === true) return <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-accent"><Check className="h-3 w-3 text-accent-foreground" /></div>;
  if (val === false) return <X className="h-4 w-4 text-muted-foreground/40" />;
  return <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm sm:normal-case sm:tracking-normal">{val}</span>;
};

const RECS = [
  { title: "Best for Presbyopia", product: "Brilliance™ Progressive", desc: "Patients over 40 who need distance, intermediate, and near vision in one lens.", to: "/zenvue/brilliance" },
  { title: "Best All-Rounder", product: "Single Vision + Darkun™", desc: "Young patients who want one pair for indoors and outdoors.", to: "/zenvue/single-vision" },
  { title: "Best for Outdoor", product: "Polarized Lenses", desc: "Patients who spend significant time outdoors, driving, or near water.", to: "/lenses/polarized" },
];

const ZenvueCompare = () => {
  return (
    <ZenvueFeatureShell>
      <ZenvueHero
        badge="Product Comparison"
        title="Compare Products"
        subtitle="Side-by-side comparison of all ZenVue product lines to help you recommend the right lens for every patient."
      />

      {/* Table */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Feature Matrix</h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Compare each product line at a glance while keeping the same recommendation flow.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground sm:text-sm sm:normal-case sm:tracking-normal">Feature</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-foreground sm:text-sm sm:normal-case sm:tracking-normal">Brilliance™</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-foreground sm:text-sm sm:normal-case sm:tracking-normal">Single Vision</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, index) => (
                  <tr key={row.feature} className={`border-b border-border last:border-0 ${index % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{row.feature}</td>
                    <td className="px-4 py-3"><div className="flex justify-center">{renderCell(row.brilliance)}</div></td>
                    <td className="px-4 py-3"><div className="flex justify-center">{renderCell(row.singleVision)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Quick Recommendations */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl">
            Quick Recommendations
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {RECS.map((r) => (
              <Link key={r.title} to={r.to} className="group block">
                <Card
                  variant="feature"
                  className="h-full border-border/60 hover:border-accent/40"
                >
                  <CardContent className="p-6">
                    <span className="text-xs font-medium uppercase tracking-wider text-accent">{r.title}</span>
                    <h3 className="mt-2 text-lg font-semibold text-foreground transition-colors group-hover:text-accent">
                      {r.product}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </ZenvueFeatureShell>
  );
};

export default ZenvueCompare;
