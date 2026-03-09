import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Lightbulb,
  DollarSign,
  Heart,
  Stethoscope,
  Ruler,
  User,
  AlertTriangle,
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
    id: "diagnosis",
    icon: <Stethoscope className="h-5 w-5" />,
    label: "Diagnosis & Recommendation",
    title: "Steps to Diagnosis & Lens Recommendation",
    intro:
      "A systematic approach to Rx analysis ensures the patient receives the best visual outcome. Follow these steps before selecting a lens design.",
    cards: [
      {
        heading: "1. Review the Rx",
        body: [
          "Identify sphere, cylinder, axis, add power, and any prism notation.",
          "Flag high-minus (> −4.00) and high-plus (> +3.00) prescriptions — they drive material and design choices.",
          "Note any significant Rx change from the previous pair: adaptation may be needed.",
        ],
      },
      {
        heading: "2. Assess Visual Demands",
        body: [
          "Ask about occupation: desk-heavy, driving, outdoor, mixed.",
          "Screen time hours and working distances for digital device use.",
          "Hobbies and sports — impact resistance, wrap compatibility, tint needs.",
        ],
      },
      {
        heading: "3. Evaluate Previous Wear",
        body: [
          "Current lens type (SV, PAL, bifocal) and satisfaction level.",
          "Previous progressive design and corridor length — switching designs may cause adaptation issues.",
          "Any history of non-adapt or return on a progressive lens.",
        ],
      },
      {
        heading: "4. Match Design to Need",
        body: [
          "Low add (≤ +1.50) first-time PAL wearer → wide-corridor general-purpose design.",
          "High add (≥ +2.50) experienced wearer → short-corridor premium freeform.",
          "Occupational use → office/indoor progressive or anti-fatigue SV.",
          "Document the recommendation rationale for future reference.",
        ],
      },
    ],
  },
  {
    id: "patient-conversations",
    icon: <MessageSquare className="h-5 w-5" />,
    label: "Patient Conversations",
    title: "Guiding the Patient Conversation",
    intro:
      "Effective communication turns a clinical recommendation into patient confidence. Use clear language, avoid jargon, and let the patient participate in the decision.",
    cards: [
      {
        heading: "Opening the Conversation",
        body: [
          "Start with lifestyle: \"Tell me about your typical day and what activities are most important to your vision.\"",
          "Paraphrase their needs back to confirm understanding before recommending products.",
          "Use analogies: \"Lens coatings work like sunscreen for your glasses — invisible but protective.\"",
        ],
      },
      {
        heading: "Explaining Lens Options",
        body: [
          "Present three tiers (Good / Better / Best) — patients choose more confidently when given a structured comparison.",
          "Focus on benefits, not features: \"thinner and lighter\" rather than \"1.67 index.\"",
          "Use demo lenses or sample trays so patients can see and feel the difference.",
        ],
      },
      {
        heading: "Handling Objections",
        body: [
          "\"My last progressives didn't work\" → acknowledge, then explain newer freeform technology and wider corridors.",
          "\"It's too expensive\" → reframe as daily cost: \"That's less than a dollar a day for crystal-clear vision.\"",
          "\"I only need reading glasses\" → explore near-to-mid demand and digital use to suggest anti-fatigue or office designs.",
        ],
      },
      {
        heading: "Closing with Confidence",
        body: [
          "Summarise what was chosen and why it's the right fit for their lifestyle.",
          "Set realistic expectations: progressive adaptation, coating care, tint limitations in low light.",
          "Provide a written summary or take-home card with product names and care tips.",
        ],
      },
    ],
  },
  {
    id: "dispensing-tips",
    icon: <Lightbulb className="h-5 w-5" />,
    label: "Dispensing Tips",
    title: "Core Dispensing Tips",
    intro:
      "Accurate dispensing directly impacts patient satisfaction and reduces remakes. Attention to measurements, verification, and hand-off makes the difference.",
    cards: [
      {
        heading: "Measurement Accuracy",
        body: [
          "Always measure monocular PDs — binocular PD can introduce prismatic error, especially in high Rx.",
          "Fitting height must be taken with the chosen frame adjusted and the patient in natural head posture.",
          "For progressives, mark the pupil centre on the demo lens with a non-permanent marker and verify in-frame before ordering.",
        ],
      },
      {
        heading: "Frame Preparation",
        body: [
          "Pre-adjust the frame before taking measurements: pantoscopic tilt (8–12°), vertex distance (12–14 mm), and face-form wrap.",
          "Ensure temples sit comfortably and the frame is level — an unleveled frame skews the fitting cross.",
          "Record frame dimensions (A, B, DBL, ED) and compare against lens blank availability.",
        ],
      },
      {
        heading: "Verification & Hand-Off",
        body: [
          "Verify finished Rx on the lensometer: sphere, cylinder, axis, add, and prism.",
          "Confirm optical centres align with pupil positions while the patient wears the glasses.",
          "Walk the patient through care: cleaning, storage, coating limitations, and when to return for adjustment.",
        ],
      },
      {
        heading: "Common Pitfalls",
        body: [
          "Using the wrong fitting height for a short-corridor lens — always match corridor to frame depth.",
          "Not confirming the base curve when re-glazing an existing frame — mismatch causes cosmetic and optical issues.",
          "Skipping the dispense verification: 5 minutes at hand-off prevents a return visit.",
        ],
      },
    ],
  },
  {
    id: "frame-fitting",
    icon: <Ruler className="h-5 w-5" />,
    label: "Frame Fitting",
    title: "Frame Fitting & Adjustment",
    intro:
      "A properly fitted frame is the foundation of any successful pair of glasses. Poor fit leads to slippage, pressure points, and incorrect optical alignment.",
    cards: [
      {
        heading: "Bridge Fit",
        body: [
          "The bridge should rest on the crest of the nose without pinching or sliding.",
          "Adjustable nose pads: set pad arms so weight distributes evenly; avoid pads too close (pinching) or too far (sliding).",
          "Saddle bridges (keyhole, modified saddle) suit different nose profiles — match shape to anatomy.",
        ],
      },
      {
        heading: "Temple Length & Curl",
        body: [
          "Temples should follow the contour of the ear with a gentle curve, ending just past the top of the ear.",
          "Too-long temples slide; too-short temples create pressure behind the ear.",
          "Skull temples vs. cable (curl) temples: cable provides more grip for active wearers and children.",
        ],
      },
      {
        heading: "Pantoscopic Tilt",
        body: [
          "Standard 8–12° tilt aligns the lens plane with the natural line of sight.",
          "Increasing tilt shifts the optical centre downward — adjust fitting height accordingly.",
          "Zero tilt (flat) is used for specialty sport wraps and safety eyewear.",
        ],
      },
      {
        heading: "Adjusting for Comfort",
        body: [
          "Use controlled heat (frame warmer, not open flame) for plastic adjustments.",
          "Metal temples: bend gradually at the correct point — forcing causes breakage.",
          "Always re-check PD and fitting height after any significant frame adjustment.",
        ],
      },
    ],
  },
  {
    id: "face-suitability",
    icon: <User className="h-5 w-5" />,
    label: "Frame & Face Shapes",
    title: "Frame Suitability for Face Shapes",
    intro:
      "Matching frame geometry to facial structure enhances appearance and ensures the lenses can be made accurately within the frame's optical zone.",
    cards: [
      {
        heading: "Oval Face",
        body: [
          "Most frame shapes work. The frame width should match or slightly exceed the widest part of the face.",
          "Recommended: geometric, aviator, cat-eye, rectangular — maintain natural balance.",
          "Avoid oversized frames that overwhelm proportions.",
        ],
      },
      {
        heading: "Round Face",
        body: [
          "Angular and rectangular frames add definition and contrast soft contours.",
          "Wider frames with a strong brow line visually lengthen the face.",
          "Avoid small round frames — they echo the face shape without contrast.",
        ],
      },
      {
        heading: "Square Face",
        body: [
          "Round and oval frames soften strong jawlines and angular features.",
          "Thin or rimless frames reduce visual weight.",
          "Avoid boxy, squared-off frames that exaggerate angularity.",
        ],
      },
      {
        heading: "Heart / Inverted Triangle",
        body: [
          "Bottom-heavy frames (aviator, round) balance a wider forehead.",
          "Light colours and rimless styles at the bottom reduce top-heaviness.",
          "Avoid heavily embellished brow lines that widen the upper face further.",
        ],
      },
      {
        heading: "Oblong / Rectangular",
        body: [
          "Deeper frames with decorative temples add width and break up length.",
          "Round or butterfly shapes shorten the face visually.",
          "Avoid narrow frames that make the face appear longer.",
        ],
      },
    ],
  },
  {
    id: "pricing-structure",
    icon: <DollarSign className="h-5 w-5" />,
    label: "Pricing & Tiers",
    title: "Pricing Structure & Tiered Offerings",
    intro:
      "A well-structured tiered offering simplifies the decision for patients and protects margins. Present value clearly at every level.",
    cards: [
      {
        heading: "Good — Essential",
        body: [
          "Standard design (spherical or basic freeform), hard coat, and UV protection.",
          "Ideal for backup pairs, children's lenses, or budget-conscious patients.",
          "Materials: 1.50 or Polycarbonate depending on safety needs.",
        ],
      },
      {
        heading: "Better — Enhanced",
        body: [
          "Advanced freeform design with wider fields, premium AR coating, and blue-light filter option.",
          "Suits most everyday wearers who want noticeably better clarity and aesthetics.",
          "Materials: 1.60 for moderate Rx or Trivex for rimless / drill-mount.",
        ],
      },
      {
        heading: "Best — Premium",
        body: [
          "Top-tier freeform with personalised fitting parameters (vertex, panto, wrap), super-hydrophobic AR, and photochromic or polarised options.",
          "For patients who demand the widest corridors, thinnest profiles, and latest technology.",
          "Materials: 1.67 or 1.74 for high Rx; includes the most comprehensive warranty.",
        ],
      },
      {
        heading: "Presenting the Tiers",
        body: [
          "Display all three side by side — in-store boards, tablets, or printed comparison cards.",
          "Lead with the Best option, then work down: anchoring sets perceived value higher.",
          "Always explain what the patient gains at each step, not what they lose by choosing lower.",
        ],
      },
    ],
  },
  {
    id: "customer-service",
    icon: <Heart className="h-5 w-5" />,
    label: "Service & Retention",
    title: "Customer Service & Retention",
    intro:
      "Retention is more profitable than acquisition. Proactive follow-up, empathetic problem resolution, and recall systems build loyalty and referral networks.",
    cards: [
      {
        heading: "Post-Dispense Follow-Up",
        body: [
          "Call or message within 7 days to check adaptation — especially for first-time progressive wearers.",
          "A quick adjustment visit builds trust and catches issues before they become complaints.",
          "Document feedback in the patient record for future reference.",
        ],
      },
      {
        heading: "Recall & Re-Engagement",
        body: [
          "Set annual exam reminders via SMS, email, or practice management system.",
          "Offer complimentary cleanings or adjustments between visits to keep patients connected.",
          "Birthday or loyalty programme touchpoints create positive brand association.",
        ],
      },
      {
        heading: "Handling Complaints",
        body: [
          "Listen first, empathise second, resolve third. Never dismiss a patient's experience.",
          "Offer concrete next steps: re-check, adjustment, or remake under warranty.",
          "Log every complaint and resolution — patterns reveal systemic training or product gaps.",
        ],
      },
      {
        heading: "Building Referrals",
        body: [
          "Ask satisfied patients directly: \"Would you recommend us to family or colleagues?\"",
          "Provide referral cards or a simple online link they can share.",
          "Recognise referrals with a small thank-you — it reinforces the behaviour.",
        ],
      },
    ],
  },
  {
    id: "progressive-troubleshooting",
    icon: <AlertTriangle className="h-5 w-5" />,
    label: "Progressive Troubleshooting",
    title: "Troubleshooting Progressive Wearer Complaints",
    intro:
      "Most progressive complaints stem from incorrect fitting, wrong design choice, or unmanaged patient expectations. Systematic troubleshooting resolves the majority without a remake.",
    cards: [
      {
        heading: "\"I can't read with these\"",
        body: [
          "Check fitting height — if the seg is too high, the reading zone sits below the usable frame area.",
          "Verify the add power matches the Rx and the reading distance the patient uses.",
          "Confirm head/chin posture: the patient should look through the lower portion, not tilt the head excessively.",
        ],
      },
      {
        heading: "\"The sides are blurry\"",
        body: [
          "This is inherent peripheral astigmatism in all progressives — explain it as normal.",
          "Wider-corridor premium designs reduce peripheral swim; consider upgrading the design.",
          "Ensure the PDs are correct — an error of even 1 mm per eye shifts the clear zones off-axis.",
        ],
      },
      {
        heading: "\"I feel dizzy or off-balance\"",
        body: [
          "Usually an adaptation issue in first 7–14 days — reassure and encourage consistent full-time wear.",
          "Check for excessive base curve mismatch between old and new lenses.",
          "Verify pantoscopic tilt and vertex distance haven't changed significantly from the previous pair.",
        ],
      },
      {
        heading: "\"Distance is fine but mid-range is narrow\"",
        body: [
          "Could indicate a short-corridor design in a deep frame — the intermediate zone is compressed.",
          "Evaluate corridor length vs. frame B measurement: corridor should be ≤ frame B minus ~4 mm.",
          "Consider a wider-intermediate office design as a supplementary pair for desk work.",
        ],
      },
      {
        heading: "\"These are worse than my old pair\"",
        body: [
          "Compare old and new Rx, lens design, base curve, and frame dimensions side by side.",
          "Re-verify monocular PDs and fitting heights against the new frame.",
          "If all parameters check out, allow a full 14-day adaptation window before remaking.",
          "Document every step — if a remake is needed, the lab benefits from your investigation notes.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const DispensingTipsPage = () => {
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
              Dispensing Tips &amp; Professional Guide
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              A comprehensive reference for optical professionals and students covering diagnosis, patient communication, dispensing technique, pricing strategy, frame fitting, and progressive troubleshooting.
            </p>
          </div>

          {/* Jump-nav */}
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
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28"
              >
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
                    <Card key={card.heading} variant="default" className="border-border/60">
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

export default DispensingTipsPage;
