import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Frame,
  Gem,
  Layers,
  Star,
  AlertOctagon,
  Monitor,
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
    id: "complete-rx",
    icon: <FileText className="h-5 w-5" />,
    label: "The Complete Rx",
    title: "Submitting a Complete Rx",
    intro:
      "An incomplete or ambiguous Rx is the single biggest cause of order holds. A few extra seconds at submission saves days of back-and-forth.",
    cards: [
      {
        heading: "Monocular PDs",
        body: [
          "Always measure and submit monocular PDs — never just binocular. A 1 mm error per eye induces unwanted prism, especially in high Rx.",
          "Use a digital pupillometer when available; manual PD sticks are acceptable but require careful technique.",
          "Record distance PD and, for multifocals, near PD separately — the inset differs by design and add power.",
        ],
      },
      {
        heading: "Seg Height & Fitting Cross",
        body: [
          "Measure from the lowest point of the lens (inside the frame groove) to the pupil centre — not the frame rim.",
          "For progressives, the fitting cross height is provided by the manufacturer's fitting chart — it is not the same as seg height on a flat-top bifocal.",
          "Always note whether the measurement is seg height or fitting height — the lab needs to know which reference point you used.",
        ],
      },
      {
        heading: "Optical Centre & Prism",
        body: [
          "For single-vision distance lenses, the OC should align with the pupil centre at distance gaze.",
          "Prescribed prism: specify the amount in prism dioptres (Δ) and the base direction (BU, BD, BI, BO) per eye.",
          "Compound prism (e.g., 2Δ BI and 1Δ BU on the same eye) — write both components clearly, not as a single resultant.",
        ],
      },
      {
        heading: "Rx Checklist",
        body: [
          "☑ Sphere, cylinder, axis — both eyes.",
          "☑ Add power (if multifocal).",
          "☑ Prism and base direction (if prescribed).",
          "☑ Monocular PDs (distance and near).",
          "☑ Fitting/seg height per the chosen frame.",
          "☑ Doctor name, date, and patient name.",
        ],
      },
    ],
  },
  {
    id: "frame-data",
    icon: <Frame className="h-5 w-5" />,
    label: "Frame Data",
    title: "Providing Accurate Frame Data",
    intro:
      "The lab needs to know the shape and size of the frame to edge lenses correctly. Missing or wrong frame data is the second most common hold reason.",
    cards: [
      {
        heading: "Key Dimensions",
        body: [
          "A (eye size): horizontal width of the lens opening in mm.",
          "B (vertical depth): vertical height of the lens opening — critical for progressive corridor selection.",
          "DBL (bridge): distance between lenses at the bridge; affects frame PD.",
          "ED (effective diameter): the longest diagonal of the lens shape — determines minimum blank size.",
        ],
      },
      {
        heading: "Trace Files vs. Manual Entry",
        body: [
          "Trace files (.OMA or .VCA) captured by a frame tracer provide the exact lens shape digitally — always preferred.",
          "If no tracer is available, send the frame to the lab — but this adds shipping time and cost (see our Tracing & Cutting Guide).",
          "Manual entry of A/B/DBL is a last resort — it gives the lab a rectangle, not the true shape, increasing edge thickness and reducing accuracy.",
        ],
      },
      {
        heading: "Frame Brand & Model Lookup",
        body: [
          "Many edgers maintain a frame shape library — provide the exact brand, model, and colour code so the lab can look up the trace.",
          "If the frame is not in the library, a physical trace or shipped frame is required.",
          "New frame releases may not be in the library yet — plan for trace capture on launch-day orders.",
        ],
      },
      {
        heading: "When to Ship the Frame",
        body: [
          "Drill-mount and rimless frames almost always need to be shipped for precise hole placement.",
          "Semi-rimless (nylon cord) frames with non-standard groove profiles benefit from physical fitting.",
          "Consider investing in a remote tracer to eliminate frame shipping entirely — payback in 2–5 months.",
        ],
      },
    ],
  },
  {
    id: "material-selection",
    icon: <Gem className="h-5 w-5" />,
    label: "Material & Index",
    title: "Material & Index Selection",
    intro:
      "Choosing the right lens material balances thickness, weight, optics (Abbe value), impact resistance, and cost. Here's how to match material to the patient's Rx and lifestyle.",
    cards: [
      {
        heading: "CR-39 (1.50 Index)",
        body: [
          "Best Abbe value (58) among plastic materials — sharpest optics with minimal chromatic aberration.",
          "Ideal for low-to-moderate Rx (−4.00 to +2.00) where thickness is acceptable.",
          "Lightweight, easy to tint, and the most affordable lens material.",
        ],
      },
      {
        heading: "Mid-Index (1.56 / 1.60)",
        body: [
          "1.56: a cost-effective step up from CR-39 — 15 % thinner, Abbe ~42. Good for mid-range Rx.",
          "1.60: 25 % thinner than 1.50 — recommended starting point for Rx beyond ±3.00 D. Abbe ~36.",
          "Both accept AR and hard coat well; 1.60 is the sweet spot of value vs. cosmetics for most wearers.",
        ],
      },
      {
        heading: "High-Index (1.67 / 1.74)",
        body: [
          "1.67: 35 % thinner than 1.50 — strong choice for Rx ±5.00 to ±8.00 D. Abbe ~32.",
          "1.74: the thinnest plastic lens available — 45 % thinner than 1.50 for the highest prescriptions. Abbe ~33.",
          "Both require premium AR coating to manage higher surface reflections inherent to high-index materials.",
        ],
      },
      {
        heading: "Polycarbonate & Trivex",
        body: [
          "Polycarbonate (1.59): impact-resistant, lightweight — mandatory for children, safety, and sport eyewear. Abbe ~30.",
          "Trivex (1.53): similar impact resistance to poly but with superior Abbe (43–45) and easier processing.",
          "Choose Trivex over poly when optics and drill-mount flexibility matter; choose poly when cost or mandatory safety standards drive the decision.",
        ],
      },
    ],
  },
  {
    id: "coatings-addons",
    icon: <Layers className="h-5 w-5" />,
    label: "Coatings & Add-ons",
    title: "Coating & Add-on Stacking",
    intro:
      "Coatings and add-ons are applied in a specific sequence. Understanding the stack helps you recommend compatible combinations and avoid conflicts.",
    cards: [
      {
        heading: "The Coating Stack (Bottom to Top)",
        body: [
          "1. Hard coat — applied directly to the lens surface for scratch resistance.",
          "2. Anti-reflective (AR) layers — vacuum-deposited metal oxide films that reduce glare.",
          "3. Hydrophobic/oleophobic top coat — repels water and fingerprints.",
          "Each layer bonds to the one below it — skipping a layer (e.g., AR without hard coat) is possible but reduces durability.",
        ],
      },
      {
        heading: "Tint & Mirror Compatibility",
        body: [
          "Solid and gradient tints are applied before AR coating — the dye is absorbed into the lens material.",
          "Mirror coatings are part of the vacuum deposition process, applied after the AR stack.",
          "Photochromic + mirror: possible but the mirror may mask the photochromic transition — discuss cosmetics with the patient.",
        ],
      },
      {
        heading: "Blue-Light Filters",
        body: [
          "In-mass blue filter: embedded in the lens material during manufacturing — no surface effect, slight cosmetic tint.",
          "Blue-reflective AR: reflects a portion of blue light at the coating level — produces a visible blue/purple residual reflection.",
          "Both approaches are available; in-mass provides more consistent filtering; blue AR is compatible with clear cosmetics.",
        ],
      },
      {
        heading: "Ordering Tips",
        body: [
          "Specify every add-on explicitly — don't assume the lab will include hard coat with AR (some do, some don't).",
          "UV protection is built into polycarbonate, Trivex, and most high-index materials — adding a UV coating on these is redundant.",
          "Anti-fog coatings are a separate treatment — they cannot be combined with standard hydrophobic top coats.",
        ],
      },
    ],
  },
  {
    id: "special-orders",
    icon: <Star className="h-5 w-5" />,
    label: "Special Orders",
    title: "Special & Complex Orders",
    intro:
      "Some prescriptions and frame types require extra attention. Flagging these correctly at order entry prevents errors and sets realistic timelines.",
    cards: [
      {
        heading: "Prescribed Prism",
        body: [
          "Always specify prism per eye — amount in Δ and base direction (BU/BD/BI/BO).",
          "Fresnel prism press-on is a temporary solution for trial — permanent ground-in prism is preferred for long-term wear.",
          "High prism (> 5Δ) may require splitting between eyes or using slab-off to balance thickness.",
        ],
      },
      {
        heading: "Slab-Off (Bicentric Grind)",
        body: [
          "Used when anisometropia (Rx difference between eyes) exceeds ~1.50 D in the vertical meridian.",
          "Eliminates differential prismatic effect at the reading level that causes vertical diplopia.",
          "Always applied to the more minus (or less plus) lens — specify on the order or let the lab calculate.",
        ],
      },
      {
        heading: "Wrap & Sport Frames",
        body: [
          "High-wrap frames (> 15° face-form angle) require compensated Rx to avoid power errors at the periphery.",
          "Specify the frame wrap angle on the order — the lab applies a compensated curve calculation.",
          "Material choice: polycarbonate or Trivex for impact safety; avoid glass and standard CR-39 in sport applications.",
        ],
      },
      {
        heading: "Double-Segment & Executive Bifocals",
        body: [
          "Double-segment (D-seg) bifocals: reading segment at top and bottom for overhead and downward gaze (e.g., electricians, mechanics).",
          "Executive bifocals: full-width reading segment — maximum near field but noticeable image jump.",
          "Both are special-order items with longer turnaround — allow 5–7 business days.",
        ],
      },
    ],
  },
  {
    id: "common-mistakes",
    icon: <AlertOctagon className="h-5 w-5" />,
    label: "Common Mistakes",
    title: "Top 10 Order Hold Reasons & How to Avoid Them",
    intro:
      "These are the most frequent reasons orders are placed on hold. Eliminating them from your workflow dramatically improves turnaround and patient satisfaction.",
    cards: [
      {
        heading: "Holds 1–5",
        body: [
          "1. Missing axis — always include axis when cylinder is present, even if cylinder is low.",
          "2. No seg/fitting height — measure for every progressive and bifocal order, every time.",
          "3. No frame trace or dimensions — attach .OMA/.VCA or ship the frame.",
          "4. Illegible handwriting — use digital ordering or print clearly on the Rx form.",
          "5. PD out of plausible range — double-check monocular PDs before submitting.",
        ],
      },
      {
        heading: "Holds 6–10",
        body: [
          "6. Wrong lens design specified — verify the patient's Rx type matches the lens ordered (SV vs. PAL vs. bifocal).",
          "7. Frame too small for Rx — high-minus lenses need adequate A-size to avoid thick edges; high-plus needs small frames.",
          "8. Coating conflict — e.g., ordering anti-fog with hydrophobic top coat (incompatible).",
          "9. Expired Rx — most jurisdictions require Rx to be ≤ 2 years old; the lab will flag expired dates.",
          "10. Missing doctor/practice information — required for liability and record-keeping.",
        ],
      },
      {
        heading: "Prevention Strategies",
        body: [
          "Use LabLink's built-in validation — it catches 80 % of these errors before submission.",
          "Create an internal checklist (laminated card at the PD ruler station) for the dispensing team.",
          "Review every order once more before pressing 'Submit' — a 30-second review saves 2 days of hold time.",
        ],
      },
      {
        heading: "What Happens When an Order is Held",
        body: [
          "The lab sends a hold notification via LabLink, email, or phone call specifying the issue.",
          "The order does not enter production until the issue is resolved — the clock stops.",
          "Respond to holds as quickly as possible — most labs process the resolution within hours of receiving your reply.",
          "Repeated holds on the same issue type may trigger a courtesy training call from the lab rep.",
        ],
      },
    ],
  },
  {
    id: "digital-ordering",
    icon: <Monitor className="h-5 w-5" />,
    label: "Digital Ordering",
    title: "Digital Ordering via LabLink",
    intro:
      "LabLink is our recommended digital ordering platform. It validates data in real-time, attaches trace files, and provides end-to-end order tracking.",
    cards: [
      {
        heading: "Getting Started",
        body: [
          "Request LabLink access from your lab account manager — setup takes less than 24 hours.",
          "Install the desktop app or use the browser version; both connect to the same account and order history.",
          "Link your frame tracer to LabLink for automatic trace file attachment on every order.",
        ],
      },
      {
        heading: "Step-by-Step Order Entry",
        body: [
          "1. Select patient (or create new) → Enter Rx → System validates sphere/cyl/axis/add.",
          "2. Choose lens design and material → System checks blank availability.",
          "3. Add coatings and add-ons → System flags incompatible combinations.",
          "4. Attach trace file or select frame from library → System calculates minimum blank size.",
          "5. Review summary → Submit → Receive confirmation number instantly.",
        ],
      },
      {
        heading: "Template & Reorder",
        body: [
          "Save frequently used Rx + lens + coating combinations as templates — one click to reorder.",
          "Reorder from history: pull up any past order, modify if needed, and resubmit.",
          "Templates reduce order entry time from ~3 minutes to under 30 seconds.",
        ],
      },
      {
        heading: "Tracking & Notifications",
        body: [
          "Real-time status updates: received → verified → surfacing → coating → edging → QC → shipped → delivered.",
          "Push notifications or email alerts for status changes — configure per user in LabLink settings.",
          "Download invoices and delivery notes directly from the order detail screen.",
        ],
      },
    ],
  },
  {
    id: "turnaround",
    icon: <Clock className="h-5 w-5" />,
    label: "Turnaround",
    title: "Turnaround Expectations",
    intro:
      "Knowing standard timelines helps you set patient expectations accurately and identify when an order is genuinely delayed vs. on track.",
    cards: [
      {
        heading: "Stock Lenses",
        body: [
          "Uncut stock SV: same day or next business day — the lens is pulled from inventory and shipped.",
          "Edged stock SV (trace attached): 1 business day — edge and ship.",
          "Stock availability depends on the Rx range and material — check LabLink's live stock indicator before ordering.",
        ],
      },
      {
        heading: "Rx (Surfaced) Lenses",
        body: [
          "Single-vision Rx with hard coat: 2 business days.",
          "Single-vision Rx with AR: 2–3 business days (coating adds ~1 day).",
          "Progressive freeform with premium AR: 3–5 business days.",
          "Add 1–2 days for photochromic, polarised, or specialty tints.",
        ],
      },
      {
        heading: "Special & Complex Orders",
        body: [
          "Prism > 3Δ, slab-off, or lenticular: 5–7 business days.",
          "Double-segment, executive bifocal: 5–7 business days.",
          "High-wrap sport Rx with compensated curve: 4–6 business days.",
          "Out-of-range Rx requiring special-order blanks: add 2–5 days for blank procurement.",
        ],
      },
      {
        heading: "When to Call Ahead",
        body: [
          "Unusual Rx combinations (e.g., high plus with high cyl and prism) — confirm blank availability before promising a date.",
          "Rush orders — contact the lab before submitting to ensure capacity; rush fees may apply.",
          "First-time frame models — verify the trace is in the library or plan to ship the frame.",
          "Large batch orders (5+ pairs) — coordinate with the lab to avoid bottlenecks in surfacing and coating.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const LensOrderingTipsPage = () => {
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
              Lens Ordering Tips
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              A practical guide to submitting clean, complete lens orders — covering Rx accuracy, frame data, material selection, coating stacking, special orders, and avoiding the most common hold reasons.
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

export default LensOrderingTipsPage;
