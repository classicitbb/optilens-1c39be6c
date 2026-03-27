import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUp,
  CheckCircle2,
  Truck,
  DollarSign,
  Clock,
  ScanLine,
  Scissors,
  Package,
  AlertTriangle,
  Lightbulb,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const SECTIONS = [
  { id: "the-problem", label: "The Shipping Problem", icon: <Truck className="h-4 w-4" /> },
  { id: "remote-tracing", label: "Remote Tracing", icon: <ScanLine className="h-4 w-4" /> },
  { id: "order-paths", label: "Uncut vs. Edged", icon: <Scissors className="h-4 w-4" /> },
  { id: "roi", label: "Cost & ROI", icon: <DollarSign className="h-4 w-4" /> },
  { id: "best-practices", label: "Tracing Best Practices", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "file-formats", label: "File Formats", icon: <Monitor className="h-4 w-4" /> },
  { id: "getting-started", label: "Getting Started", icon: <Package className="h-4 w-4" /> },
];

const TracingCuttingGuidePage = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" className="pb-20 pt-24">
        {/* Hero */}
        <section className="container mx-auto max-w-5xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Technical Resources</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Tracing & Cutting Guide
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Stop shipping frames back and forth. Invest in remote tracing technology, eliminate transit delays and
            freight costs, and choose between uncut or fully edged lens orders with confidence.
          </p>
        </section>

        {/* Jump nav */}
        <nav className="container mx-auto mt-8 max-w-5xl px-4 lg:px-8" aria-label="Page sections">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Jump to section
            </p>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {s.icon}
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <div className="container mx-auto max-w-5xl space-y-20 px-4 pt-12 lg:px-8">

          {/* ── 1. The Shipping Problem ── */}
          <section id="the-problem" className="scroll-mt-32">
            <SectionHeading badge="The Problem" title="Why Shipping Frames Costs You More Than You Think" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The traditional workflow — patient selects frame → practice ships frame to lab → lab traces, edges, fits → lab ships finished job back —
              introduces unnecessary cost, risk, and delay at every stage.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: <DollarSign className="h-5 w-5 text-destructive" />, title: "Freight costs both ways", desc: "Two courier legs per job. At $8–15 per shipment, that's $16–30 added to every edged order — often absorbed silently by the practice." },
                { icon: <Clock className="h-5 w-5 text-destructive" />, title: "2–4 days added turnaround", desc: "Transit time each way adds days to the patient promise. Rush fees compound the cost further." },
                { icon: <AlertTriangle className="h-5 w-5 text-destructive" />, title: "Damage & loss risk", desc: "Frames damaged in transit mean replacement costs, patient delays, and lost goodwill." },
                { icon: <Truck className="h-5 w-5 text-destructive" />, title: "Inventory tied up in transit", desc: "Frames sitting in courier vans can't be shown to other patients. Your display stock is reduced." },
                { icon: <Package className="h-5 w-5 text-destructive" />, title: "Packaging overhead", desc: "Bubble wrap, boxes, labels, and staff time to pack and process pickups — hours lost weekly." },
                { icon: <DollarSign className="h-5 w-5 text-destructive" />, title: "Hidden insurance costs", desc: "High-value designer frames in transit without adequate cover create uninsured liability." },
              ].map((item, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── 2. Remote Tracing ── */}
          <section id="remote-tracing" className="scroll-mt-32">
            <SectionHeading badge="The Solution" title="Remote Tracing — Eliminate Frame Shipments Entirely" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
              A remote tracer is a compact device that sits in your practice and captures the exact 3D geometry of any frame in seconds.
              The trace file is transmitted electronically to the lab — no frame shipment required.
            </p>

            <Card className="mt-6 border-accent/30 bg-accent/5">
              <CardContent className="p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  How It Works
                </h3>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Place the frame (or demo lens) into the tracer cradle. The device captures the exact shape contour, A/B dimensions, DBL, and circumference.",
                    "The trace data is saved as a .OMA or .VCA file — the industry-standard digital shape format.",
                    "The file is attached to your lens order (via your ordering portal or emailed to the lab). The lab uses this data to edge the lenses to an exact match.",
                    "The finished lenses arrive ready to fit. The frame never left your practice.",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card className="border-border">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-foreground">Popular Remote Tracers</h4>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />National Optronics OptiShapes® — compact, USB/network connected</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Briot Scan 5 — fast cycle time, OMA/VCA output</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Takubomatic ALE-600 — high-precision 3D capture</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Huvitz CAB-4000 — affordable entry-level option</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-foreground">What You Need From Your Lab</h4>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• Confirmation they accept .OMA / .VCA trace files electronically</li>
                    <li>• A portal upload option or dedicated email for trace file attachment</li>
                    <li>• Clear policy on edging responsibility (lab edges to your trace data)</li>
                    <li>• SLA for turnaround on edged orders with remote trace</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── 3. Uncut vs. Edged ── */}
          <section id="order-paths" className="scroll-mt-32">
            <SectionHeading badge="Order Options" title="Two Paths: Uncut Lenses or Edged Orders" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
              With remote tracing, you unlock both ordering paths. Choose based on your practice setup, volume, and capability.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card className="border-border">
                <CardContent className="p-6">
                  <Badge variant="secondary" className="mb-3">Option A</Badge>
                  <h3 className="text-xl font-bold text-foreground">Order Uncut Lenses</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Receive round, unfinished blanks and edge them in-house using your own edger.
                  </p>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-semibold text-foreground">Best for:</h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />High-volume practices with in-house edging equipment</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Same-day or next-day turnaround requirements</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Practices wanting full control over edge finish and fit</li>
                  </ul>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-semibold text-foreground">Considerations:</h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    <li>• Requires capital investment in edging equipment</li>
                    <li>• Trained technician needed for bevel placement and drill mounts</li>
                    <li>• You assume responsibility for edge quality and fit</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <Badge variant="secondary" className="mb-3">Option B</Badge>
                  <h3 className="text-xl font-bold text-foreground">Order Edged (with Remote Trace)</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Send your trace file to the lab. Receive lenses edged, bevelled, and ready to fit — without shipping the frame.
                  </p>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-semibold text-foreground">Best for:</h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Practices without edging equipment</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Complex jobs (drill mounts, rimless, high-wrap)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />Anyone wanting lab-guaranteed edge quality</li>
                  </ul>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-semibold text-foreground">Considerations:</h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    <li>• Small edging fee from the lab (but you save freight both ways)</li>
                    <li>• Trace accuracy is critical — measure twice, trace once</li>
                    <li>• Minor fit adjustments may still be needed at insertion</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── 4. Cost & ROI ── */}
          <section id="roi" className="scroll-mt-32">
            <SectionHeading badge="Business Case" title="Cost Comparison & Return on Investment" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The numbers speak for themselves. Here is a conservative comparison for a practice processing 20 edged orders per week.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Cost Factor</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Ship Frames (Traditional)</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Remote Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { factor: "Outbound freight (per job)", trad: "$8–15", remote: "$0" },
                    { factor: "Return freight (per job)", trad: "$8–15", remote: "$0" },
                    { factor: "Packaging materials (per job)", trad: "$1–2", remote: "$0" },
                    { factor: "Staff time packing/processing (per job)", trad: "~10 min", remote: "~1 min" },
                    { factor: "Weekly freight cost (20 jobs)", trad: "$320–600", remote: "$0" },
                    { factor: "Annual freight cost", trad: "$16,600–31,200", remote: "$0" },
                    { factor: "Tracer device (one-time)", trad: "N/A", remote: "$2,500–6,000" },
                    { factor: "Payback period", trad: "—", remote: "2–5 months" },
                  ].map((row, i) => (
                    <tr key={i} className={i === 7 ? "bg-accent/5 font-semibold" : ""}>
                      <td className="px-4 py-3 text-muted-foreground">{row.factor}</td>
                      <td className="px-4 py-3 text-right text-foreground">{row.trad}</td>
                      <td className="px-4 py-3 text-right text-foreground">{row.remote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Card className="mt-6 border-accent/30 bg-accent/5">
              <CardContent className="flex items-start gap-3 p-5">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Bottom line:</strong> A remote tracer typically pays for itself within 2–5 months.
                  After that, every dollar you were spending on freight goes straight back to your bottom line — plus faster turnaround and zero frame damage risk.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── 5. Best Practices ── */}
          <section id="best-practices" className="scroll-mt-32">
            <SectionHeading badge="Quality" title="Tracing Best Practices for Accurate Results" />
            <div className="mt-6 space-y-3">
              {[
                { title: "Clean the frame before tracing", desc: "Debris, nose pad residue, or lens fragments in the groove produce noisy traces and inaccurate contours." },
                { title: "Use the correct tracing mode", desc: "Select 'frame' for full-rim, 'demo lens' for rimless/drill-mount, or 'lens' if tracing an existing pair for duplication." },
                { title: "Verify A, B, DBL, and circumference", desc: "Compare tracer output against manual caliper measurements. If any dimension is >0.5 mm off, re-trace." },
                { title: "Check for asymmetry", desc: "Warped or bent frames produce asymmetrical traces. Adjust the frame before tracing, not after." },
                { title: "Specify bevel position and type", desc: "Standard bevel, mini-bevel, flat edge, or grooved — communicate clearly on the order. Default assumptions cause remakes." },
                { title: "Include fitting heights and PD", desc: "Trace data gives the lab the shape. They still need monocular PDs, fitting heights, and OC position for proper lens layout." },
                { title: "Test with a trial order first", desc: "Before committing to full remote-trace workflow, send 2–3 trial orders to verify your lab processes the files correctly." },
              ].map((item, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="flex items-start gap-4 p-5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── 6. File Formats ── */}
          <section id="file-formats" className="scroll-mt-32">
            <SectionHeading badge="Technical" title="Trace File Formats Explained" />
            <p className="mt-4 text-muted-foreground leading-relaxed">
              All modern tracers export in one or both of these standard formats. Labs accept them interchangeably.
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card className="border-border">
                <CardContent className="p-5">
                  <h4 className="text-lg font-bold text-foreground">.OMA (Optical Manufacturers Association)</h4>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• The original industry-standard frame shape format</li>
                    <li>• Contains contour data points, A/B/DBL, circumference</li>
                    <li>• Universally accepted by all major edging systems</li>
                    <li>• Plain-text file — can be opened and inspected in any text editor</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-5">
                  <h4 className="text-lg font-bold text-foreground">.VCA (Vision Council of America)</h4>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• Extended format with additional data fields</li>
                    <li>• Supports 3D contour (Z-axis depth) for wrap and tilt</li>
                    <li>• Includes bevel and edge profile information</li>
                    <li>• Preferred for complex jobs (high-wrap sport frames, drill mounts)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── 7. Getting Started ── */}
          <section id="getting-started" className="scroll-mt-32">
            <SectionHeading badge="Action Plan" title="Getting Started with Remote Tracing" />
            <div className="mt-6 space-y-3">
              {[
                { step: "Evaluate your volume", desc: "If you process more than 5–10 edged jobs per week, the ROI on a remote tracer is immediate. Even lower-volume practices benefit from reduced hassle." },
                { step: "Contact us for tracer recommendations", desc: "We can advise on the best device for your practice size, budget, and ordering portal compatibility." },
                { step: "Confirm file acceptance with your lab", desc: "Verify your lab accepts .OMA/.VCA files via portal upload or email. Ask about their edging SLA for remote-trace orders." },
                { step: "Train your team", desc: "Most tracers are simple to operate. Budget 30–60 minutes for initial training. The key skill is verifying measurements against manual checks." },
                { step: "Run a parallel test period", desc: "For your first 5–10 orders, trace AND ship the frame. Compare the lab's edge result from trace data vs. physical frame. Once confident, switch fully." },
                { step: "Enjoy the savings", desc: "No more packing, no more freight invoices, no more frames in transit. Faster turnaround, happier patients, better margins." },
              ].map((item, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="flex items-start gap-4 p-5">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">{item.step}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-8 border-primary/30 bg-primary/5">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold text-foreground">Ready to eliminate frame shipments?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Contact our team for personalised tracer recommendations and to set up remote trace ordering on your account.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/#contact"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Contact Us
                  </Link>
                  <a
                    href="tel:+12464334928"
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Call +1 246 433-4928
                  </a>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="floating-action-btn"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4 text-foreground" />
        </button>
      )}

      <Footer />
    </div>
  );
};

function SectionHeading({ badge, title }: { badge: string; title: string }) {
  return (
    <div>
      <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider">
        {badge}
      </Badge>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

export default TracingCuttingGuidePage;
