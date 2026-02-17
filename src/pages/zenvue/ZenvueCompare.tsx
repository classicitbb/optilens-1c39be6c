import { Check, X, Minus } from "lucide-react";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import ZenvueCTA from "@/components/zenvue/ZenvueCTA";
import { Link } from "react-router-dom";

type CellValue = true | false | string;

interface CompareRow {
  feature: string;
  brilliance: CellValue;
  singleVision: CellValue;
  sundun: CellValue;
}

const ROWS: CompareRow[] = [
  { feature: "Lens Type", brilliance: "Progressive", singleVision: "Single Vision", sundun: "Single Vision" },
  { feature: "CR-39 (1.50)", brilliance: true, singleVision: true, sundun: true },
  { feature: "Polycarbonate (1.59)", brilliance: true, singleVision: true, sundun: true },
  { feature: "Hi-Index (1.67)", brilliance: true, singleVision: true, sundun: false },
  { feature: "Clear Option", brilliance: true, singleVision: true, sundun: false },
  { feature: "Darkun™ Photochromic", brilliance: true, singleVision: true, sundun: false },
  { feature: "Polarized", brilliance: false, singleVision: false, sundun: true },
  { feature: "Multi-coat AR", brilliance: true, singleVision: true, sundun: "Optional" },
  { feature: "Hard Coat", brilliance: true, singleVision: true, sundun: true },
  { feature: "UV400 Protection", brilliance: true, singleVision: true, sundun: true },
  { feature: "Hydrophobic", brilliance: true, singleVision: true, sundun: false },
  { feature: "Distance Vision", brilliance: true, singleVision: true, sundun: true },
  { feature: "Near Vision", brilliance: true, singleVision: "Dedicated", sundun: false },
];

const renderCell = (val: CellValue) => {
  if (val === true) return <div className="flex h-5 w-5 items-center justify-center bg-accent"><Check className="h-3 w-3 text-accent-foreground" /></div>;
  if (val === false) return <X className="h-4 w-4 text-muted-foreground/40" />;
  return <span className="text-sm text-muted-foreground">{val}</span>;
};

const RECS = [
  { title: "Best for Presbyopia", product: "Brilliance™ Progressive", desc: "Patients over 40 who need distance, intermediate, and near vision in one lens.", to: "/zenvue/brilliance" },
  { title: "Best All-Rounder", product: "Single Vision + Darkun™", desc: "Young patients who want one pair for indoors and outdoors.", to: "/zenvue/single-vision" },
  { title: "Best for Outdoor", product: "SunDun™ Polarized", desc: "Patients who spend significant time outdoors, driving, or near water.", to: "/zenvue/sundun" },
];

const ZenvueCompare = () => {
  return (
    <>
      <ZenvueHero
        badge="Product Comparison"
        title="Compare Products"
        subtitle="Side-by-side comparison of all ZenVue product lines to help you recommend the right lens for every patient."
      />

      {/* Table */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Brilliance™</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Single Vision</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">SunDun™</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-foreground">{row.feature}</td>
                    <td className="px-4 py-3"><div className="flex justify-center">{renderCell(row.brilliance)}</div></td>
                    <td className="px-4 py-3"><div className="flex justify-center">{renderCell(row.singleVision)}</div></td>
                    <td className="px-4 py-3"><div className="flex justify-center">{renderCell(row.sundun)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Quick Recommendations */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            Quick Recommendations
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {RECS.map((r) => (
              <Link key={r.title} to={r.to} className="group border border-border bg-card p-6 transition-colors hover:border-accent/40">
                <span className="text-xs font-medium uppercase tracking-wider text-accent">{r.title}</span>
                <h3 className="mt-2 text-lg font-semibold text-foreground group-hover:text-accent transition-colors" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {r.product}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ZenvueCTA />
    </>
  );
};

export default ZenvueCompare;
