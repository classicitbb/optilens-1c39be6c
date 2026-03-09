import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Search,
  Layers,
  Paintbrush,
  Scissors,
  ShieldCheck,
  Truck,
  Clock,
  ChevronRight,
  BookOpen,
  ArrowUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Section data                                                       */
/* ------------------------------------------------------------------ */

type Section = {
  id: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  intro: string;
  cards: { heading: string; body: string[] }[];
};

const SECTIONS: Section[] = [
  {
    id: "order-entry",
    icon: <ClipboardList className="h-5 w-5" />,
    label: "Order Entry",
    title: "Order Entry & Submission",
    intro:
      "Every pair of lenses begins with a clean, complete order. Accurate submission prevents holds, remakes, and delays downstream.",
    cards: [
      {
        heading: "Submission Channels",
        body: [
          "LabLink (recommended): digital entry with real-time validation, trace file attachment, and instant order confirmation.",
          "Phone orders: accepted for rush or exception cases — the CSR will read back the Rx for verbal confirmation.",
          "Email/fax: attach a legible Rx image or scan; include patient name, frame brand/model, and PDs.",
        ],
      },
      {
        heading: "Required Fields",
        body: [
          "Full Rx: sphere, cylinder, axis per eye. Add power for multifocals. Prism (amount, base direction) if prescribed.",
          "Patient data: name, monocular PDs (distance and near if bifocal/PAL), seg or fitting height.",
          "Frame info: brand, model, colour, eye size (A), bridge (DBL), temple length — or attach a .OMA/.VCA trace file.",
        ],
      },
      {
        heading: "Digital vs. Paper Orders",
        body: [
          "Digital orders via LabLink reduce data-entry errors by 85 % compared to handwritten Rx forms.",
          "Built-in validation flags impossible combinations (e.g., cylinder without axis) before the order reaches the lab.",
          "Paper orders are manually keyed — allow an additional 2–4 hours in the workflow for transcription and QC review.",
        ],
      },
      {
        heading: "Order Confirmation",
        body: [
          "Every submitted order receives a confirmation number within minutes (digital) or by end of day (paper/fax).",
          "Review the confirmation for accuracy — catching an error at this stage avoids a remake later.",
          "Add special instructions (e.g., match base curve, decentre for wrap) in the notes field, not verbally.",
        ],
      },
    ],
  },
  {
    id: "rx-verification",
    icon: <Search className="h-5 w-5" />,
    label: "Rx Verification",
    title: "Rx Verification & Pre-Production Review",
    intro:
      "Before any lens is surfaced, the lab's Rx verification team checks every parameter. Understanding this step helps you submit orders that sail through without holds.",
    cards: [
      {
        heading: "Validation Checks",
        body: [
          "Sphere/cylinder/axis consistency: axis must be present when cylinder is specified; transposition is applied if needed.",
          "Add power range check: flags adds outside +0.50 to +4.00 for manual review.",
          "PD plausibility: monocular PDs typically range 28–38 mm; values outside this trigger a hold for confirmation.",
        ],
      },
      {
        heading: "Transposition",
        body: [
          "If the Rx is written in minus-cylinder form and the surfacing system requires plus-cylinder (or vice versa), the lab transposes automatically.",
          "The transposed Rx is optically identical — sphere changes, cylinder sign flips, axis rotates 90°.",
          "Always note the original form on the order so the lab can cross-check.",
        ],
      },
      {
        heading: "Base Curve Selection",
        body: [
          "The lab selects the optimal base curve using Vogel's rule or the manufacturer's recommended chart.",
          "For re-glazes, matching the previous base curve is preferred to avoid adaptation issues.",
          "Specify 'match BC' in the order notes if you want the lab to replicate the patient's current lens curvature.",
        ],
      },
      {
        heading: "Common Hold Reasons",
        body: [
          "Missing or illegible axis value — the most common single reason for order holds.",
          "Seg height exceeds frame B dimension minus minimum lower clearance.",
          "Frame trace not attached for edged orders — the lab cannot cut without shape data.",
          "Unusual prism amounts (> 3Δ) require doctor verification before processing.",
        ],
      },
    ],
  },
  {
    id: "surfacing",
    icon: <Layers className="h-5 w-5" />,
    label: "Surfacing",
    title: "Surfacing & Lens Generation",
    intro:
      "Surfacing transforms a semi-finished blank into a lens with the prescribed power. Modern freeform generators create complex surfaces point-by-point for superior optics.",
    cards: [
      {
        heading: "Blocking",
        body: [
          "The semi-finished blank is mounted (blocked) onto a metal alloy block using a low-melt alloy or adhesive pad.",
          "Block position determines the optical centre location — accuracy here is critical for correct PD alignment.",
          "Freeform jobs use CNC-controlled blocking for sub-millimetre positioning.",
        ],
      },
      {
        heading: "Freeform vs. Conventional",
        body: [
          "Conventional surfacing uses fixed tooling (lap/mould) to cut a spherical or toric back surface.",
          "Freeform (digital) surfacing uses a diamond-tipped CNC generator to cut a point-by-point optimised surface.",
          "Freeform allows personalised designs that account for position-of-wear: pantoscopic tilt, vertex distance, and frame wrap.",
        ],
      },
      {
        heading: "Fine & Polish",
        body: [
          "After rough generation, the surface is fined (smoothed) using progressively finer abrasive pads.",
          "Polishing brings the surface to optical clarity — any residual tool marks would scatter light and degrade vision.",
          "The finished surface is inspected under high-intensity light for scratches, pits, or orange-peel texture.",
        ],
      },
      {
        heading: "Power Verification",
        body: [
          "A focimeter reading is taken immediately after surfacing to confirm sphere, cylinder, and axis match the Rx.",
          "ANSI Z80.1 allows ±0.13 D tolerance for powers up to ±6.50 D; tighter tolerances apply to premium freeform.",
          "Out-of-tolerance lenses are rejected and resurfaced — they never proceed to coating.",
        ],
      },
    ],
  },
  {
    id: "coatings",
    icon: <Paintbrush className="h-5 w-5" />,
    label: "Coating & Treatments",
    title: "Coating & Surface Treatments",
    intro:
      "Coatings add durability, clarity, and comfort. The coating stack is applied in a precise sequence inside vacuum chambers and UV ovens.",
    cards: [
      {
        heading: "Hard Coat",
        body: [
          "Applied first (directly on the lens surface) via dip or spin coating, then UV-cured.",
          "Increases scratch resistance by 4–10× compared to uncoated CR-39.",
          "Must cure fully before the next layer — incomplete cure causes adhesion failure and premature peeling.",
        ],
      },
      {
        heading: "Anti-Reflective (AR) Stack",
        body: [
          "Multiple thin-film layers of metal oxides (e.g., MgF₂, ZrO₂, TiO₂) deposited in a vacuum chamber.",
          "Each layer is nanometres thick — precise thickness controls the reflected colour (green, blue, or gold residual).",
          "Premium AR reduces reflections from ~8 % to < 0.5 %, dramatically improving clarity and cosmetics.",
        ],
      },
      {
        heading: "Hydrophobic & Oleophobic Top Coat",
        body: [
          "Applied as the outermost layer to repel water, oil, and fingerprints.",
          "Makes cleaning easier and extends the life of the AR stack beneath.",
          "Wears over time — advise patients that lens cleaning cloths (not paper towels) preserve this layer.",
        ],
      },
      {
        heading: "Tint, Mirror & Photochromic",
        body: [
          "Tinting is done before AR coating — the lens is immersed in heated dye baths for controlled colour and density.",
          "Mirror coatings are applied as part of the vacuum deposition process, after AR layers.",
          "Photochromic lenses use embedded molecules (in-mass) or a surface-applied photochromic layer activated by UV.",
        ],
      },
    ],
  },
  {
    id: "edging",
    icon: <Scissors className="h-5 w-5" />,
    label: "Edging & Mounting",
    title: "Edging & Frame Mounting",
    intro:
      "Edging shapes the finished lens to fit the patient's frame. Precision here determines fit, alignment, and aesthetics.",
    cards: [
      {
        heading: "Trace-to-Edge",
        body: [
          "The frame shape (from a .OMA/.VCA trace file or manual tracer reading) is loaded into the edger's CNC controller.",
          "The edger maps the lens blank to the shape, calculates decentration for PD, and determines minimum blank size.",
          "If the blank is too small for the frame shape + decentration, the order is flagged before cutting begins.",
        ],
      },
      {
        heading: "Bevel Types",
        body: [
          "Standard V-bevel: fits into the groove of a full-rim plastic or metal frame.",
          "Mini/hidden bevel: a shallower bevel for semi-rimless (nylon cord) frames — sits in a narrow channel.",
          "Flat edge / polish: used for rimless and drill-mount frames; edges are polished smooth for a clean cosmetic finish.",
        ],
      },
      {
        heading: "Drill Mount & Rimless",
        body: [
          "Rimless lenses require precision drilling — hole position, angle, and depth must match the frame's mounting hardware.",
          "Trivex and polycarbonate are preferred materials for drill-mount due to superior impact resistance and flexibility.",
          "CR-39 and glass are generally avoided — they chip or crack at drill sites under stress.",
        ],
      },
      {
        heading: "Safety & Compliance",
        body: [
          "Safety eyewear must meet ANSI Z87.1 impact standards — minimum 2.0 mm centre thickness for plano, 3.0 mm for Rx.",
          "Polycarbonate or Trivex is mandatory for safety-rated lenses; other materials do not pass high-velocity impact tests.",
          "Every safety lens is drop-ball tested or batch-certified before release.",
        ],
      },
    ],
  },
  {
    id: "qc",
    icon: <ShieldCheck className="h-5 w-5" />,
    label: "Quality Control",
    title: "Quality Control & Inspection",
    intro:
      "Final QC is the last gate before lenses reach the patient. Every pair is verified for optical accuracy, cosmetic quality, and frame fit.",
    cards: [
      {
        heading: "Focimeter Verification",
        body: [
          "Sphere, cylinder, and axis are re-confirmed on a digital focimeter.",
          "Add power is checked in the near zone; the corridor length is verified against the design specification.",
          "Prism is measured — both prescribed prism and any unwanted induced prism from decentration.",
        ],
      },
      {
        heading: "Cosmetic Inspection",
        body: [
          "Lenses are inspected under a high-intensity inspection lamp for surface defects: scratches, pits, bubbles, coating flaws.",
          "Edge quality is checked — chips, feathering, or uneven polish are grounds for rejection.",
          "AR coating colour and uniformity are visually confirmed against the specified product standard.",
        ],
      },
      {
        heading: "ANSI Z80.1 Tolerances",
        body: [
          "Sphere power: ±0.13 D for Rx ≤ ±6.50 D; ±2 % for higher powers.",
          "Cylinder power: ±0.13 D for cyl ≤ 2.00 D; ±0.15 D for 2.00–3.50 D; ±4 % above 3.50 D.",
          "Axis tolerance: ±7° for cyl 0.25 D; ±3° for cyl 0.50–0.75 D; ±2° for cyl > 0.75 D.",
          "Prism tolerance: 1/3 Δ per eye or per ANSI table — whichever is more restrictive.",
        ],
      },
      {
        heading: "Reject & Rework Criteria",
        body: [
          "Any lens outside ANSI tolerance is rejected — no exceptions, no 'close enough'.",
          "Cosmetic defects in the central 30 mm optical zone are always rejected; peripheral defects are evaluated case-by-case.",
          "Rejected lenses are logged with the failure reason to drive continuous improvement in upstream processes.",
        ],
      },
    ],
  },
  {
    id: "dispatch",
    icon: <Truck className="h-5 w-5" />,
    label: "Dispatch & Tracking",
    title: "Dispatch & Tracking",
    intro:
      "Once QC is passed, lenses are packaged and dispatched. Tracking keeps you informed from lab to your dispensing table.",
    cards: [
      {
        heading: "Packaging",
        body: [
          "Edged lenses are mounted in the patient's frame — the frame is cleaned, adjusted, and placed in a protective case.",
          "Uncut lenses are individually enveloped with Rx labels, separated by foam dividers to prevent surface contact.",
          "Fragile items (glass lenses, rimless assemblies) receive additional cushioning and 'Fragile' labelling.",
        ],
      },
      {
        heading: "Carrier Handoff",
        body: [
          "Standard shipping: next-business-day regional courier for most metro areas.",
          "Rush/same-day: available for an additional fee — orders must be submitted and approved before the daily cut-off.",
          "Bulk shipments: weekly consolidated boxes for high-volume accounts reduce per-unit freight costs.",
        ],
      },
      {
        heading: "LabLink Tracking Events",
        body: [
          "Order received → Rx verified → In surfacing → In coating → In edging → QC passed → Dispatched → Delivered.",
          "Each status change triggers a LabLink notification so you can give patients accurate ETAs.",
          "Holds or issues are flagged immediately with the reason and required action — respond via LabLink to minimise delay.",
        ],
      },
      {
        heading: "Delivery SLAs",
        body: [
          "Standard single-vision stock lens: same day or next business day.",
          "Standard single-vision Rx (surfaced): 2–3 business days.",
          "Progressive freeform Rx: 3–5 business days depending on design and coating.",
          "Specialty (prism, slab-off, photochromic PAL): 5–7 business days — plan ahead and set patient expectations.",
        ],
      },
    ],
  },
  {
    id: "turnaround",
    icon: <Clock className="h-5 w-5" />,
    label: "Turnaround Times",
    title: "Turnaround Times & Expediting",
    intro:
      "Understanding what drives turnaround helps you set accurate expectations with patients and identify opportunities to speed things up.",
    cards: [
      {
        heading: "Standard Timelines",
        body: [
          "Stock SV (uncut or edged): 0–1 business day — fastest option for simple Rx.",
          "Surfaced SV with AR: 2–3 business days.",
          "Freeform progressive with premium AR: 3–5 business days.",
          "Specialty lenses (high-wrap, prism, photochromic progressive): 5–7+ business days.",
        ],
      },
      {
        heading: "What Causes Delays",
        body: [
          "Order holds: missing data, illegible Rx, or out-of-range parameters needing doctor confirmation.",
          "Blank availability: unusual powers or rare base curves may require special-order blanks (add 1–3 days).",
          "Coating batch scheduling: some coatings run on specific days — orders arriving after the batch start wait for the next run.",
          "Remake cycles: a QC failure triggers a full resurface-coat-edge cycle, effectively doubling the timeline.",
        ],
      },
      {
        heading: "How to Expedite",
        body: [
          "Submit complete, validated digital orders via LabLink — eliminates the #1 delay (holds).",
          "Request rush processing at order entry — the lab prioritises the job through each station.",
          "Attach a trace file with every edged order — avoids waiting for frame arrival or manual tracing.",
          "Keep common Rx ranges in stock (SV 1.50, 1.60) for same-day dispense on walk-in patients.",
        ],
      },
      {
        heading: "Setting Patient Expectations",
        body: [
          "Always quote the standard timeline plus one buffer day — under-promise, over-deliver.",
          "For complex orders, explain the coating or specialty process so the patient understands the value of the wait.",
          "Offer a temporary pair or adjustment of the old pair if the new order will take more than 5 days.",
          "Send a notification (call, SMS, or email) as soon as the job is received — patients appreciate proactive communication.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const LabProcessOverviewPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          {/* Hero */}
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <Badge variant="secondary" className="mb-3">
              <BookOpen className="mr-1.5 h-3 w-3" />
              Technical Resources
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Lab Process Overview
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              A step-by-step guide through the optical lens manufacturing lifecycle — from order entry and Rx verification through surfacing, coating, edging, quality control, and dispatch.
            </p>
          </div>

          {/* Jump nav */}
          <nav className="mt-8 rounded-xl border border-border bg-card p-5" aria-label="Page sections">
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
          </nav>

          {/* Sections */}
          <div className="mt-10 space-y-16">
            {SECTIONS.map((section, sIdx) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                {/* Section header */}
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {section.icon}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Part {sIdx + 1} of {SECTIONS.length}
                    </p>
                    <h2 className="text-2xl font-bold text-foreground">
                      {section.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-muted-foreground">
                      {section.intro}
                    </p>
                  </div>
                </div>

                {/* Cards */}
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {section.cards.map((card) => (
                    <Card key={card.heading} className="border-border/60">
                      <CardContent className="p-5">
                        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                          <ChevronRight className="h-4 w-4 text-primary" />
                          {card.heading}
                        </h3>
                        <ul className="mt-3 space-y-2">
                          {card.body.map((point, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Back to top */}
          <div className="mt-16 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <ArrowUp className="mr-1.5 h-4 w-4" />
              Back to top
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LabProcessOverviewPage;
