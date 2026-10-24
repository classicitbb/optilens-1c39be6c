import { Link } from "react-router";
import Header from "@/components/Header";
import ContactAssistantButton from "@/components/assistant/ContactAssistantButton";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Globe2, PackageSearch, Ruler, Truck } from "lucide-react";

const PAGE_PATH = "/professionals/caribbean-lens-ordering-guide";

const steps = [
  {
    icon: ClipboardCheck,
    title: "1. Submit a complete Rx",
    body:
      "Include sphere, cylinder and axis for both eyes, add power for multifocals, any prescribed prism with base direction, and monocular PDs. An incomplete Rx is the most common cause of order holds, and a hold costs more days on an island than it does locally.",
  },
  {
    icon: Ruler,
    title: "2. Send accurate frame data",
    body:
      "Send a digital trace file from your frame tracer wherever possible. If you cannot trace on site, ship the frame, and allow for the extra transit each way. Drill-mount and rimless frames usually need to be shipped for exact hole placement.",
  },
  {
    icon: Truck,
    title: "3. Choose standard or priority freight",
    body:
      "Standard and priority freight are both available. Confirm which one you want when you order, and check the quoted freight charge before release. Do not assume free freight unless it appears on your account quote.",
  },
  {
    icon: PackageSearch,
    title: "4. Track and plan for customs",
    body:
      "Dispatch milestones and tracking references appear in LabLink once the job leaves the lab. Import duty, VAT and brokerage are set by the destination market, and customs release time sits outside lab production time.",
  },
];

const planning = [
  {
    title: "Group jobs where you can",
    body: "Where jobs are not urgent, ordering them together can reduce the number of shipments you pay freight and clearance on. Keep genuinely urgent patients on a priority order of their own.",
  },
  {
    title: "Order stock lenses ahead",
    body: "Stocked lenses in your common powers may be available without a custom surfacing job. Ask customer service which items are stocked before you promise a patient a date.",
  },
  {
    title: "Add buffer for the whole trip",
    body: "Lab production, uplift, customs and local delivery all add time. Build the full chain into the date you give the patient, not just the lab turnaround.",
  },
  {
    title: "Attach everything at order entry",
    body: "Trace files, notes and authorisations attached when the order is placed protect rush timelines far better than follow-up emails afterwards.",
  },
];

const regions = [
  { region: "Barbados", note: "Local delivery with no import clearance step." },
  { region: "Eastern Caribbean", note: "Typically 1-3 business days after dispatch for standard freight, subject to uplift and island handoff." },
  { region: "Western Caribbean", note: "Typically 2-4 business days after dispatch for standard freight, depending on routing and customs release." },
  { region: "Other export lanes", note: "The estimate is confirmed on the order acknowledgement and updated again at dispatch." },
];

const faqs = [
  {
    question: "How should a Caribbean optical retailer order prescription lenses from a wholesale lab?",
    answer:
      "Open a trade account, then place each job with a complete prescription, monocular PDs, accurate frame data or a trace file, and your freight choice. Track the job through LabLink after dispatch.",
  },
  {
    question: "What causes most delays on island orders?",
    answer:
      "Incomplete prescriptions and missing frame data cause holds before the job starts. After dispatch, uplift availability and customs release are the main variables, and both sit outside lab production time.",
  },
  {
    question: "Who pays import duty and customs fees?",
    answer:
      "Import duty, VAT, brokerage and release fees are set by the destination market and billed locally unless other terms are agreed in writing. See the Freight & Delivery Policy for details.",
  },
  {
    question: "Should I ship the frame or send a trace file?",
    answer:
      "A digital trace file is preferred because it avoids shipping the frame at all. Ship the frame only when you cannot trace, or for drill-mount and rimless styles that need exact hole placement.",
  },
  {
    question: "Where can I get wholesale pricing?",
    answer:
      "Request a price list or apply for a trade account. Pricing is confirmed on your account quote or price list, not on this page.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  },
];

const CaribbeanLensOrderingGuidePage = () => (
  <div className="min-h-screen bg-background">
    <Seo
      title="Caribbean Lens Ordering Guide for Optical Retailers | Classic Visions"
      description="A practical guide for Caribbean optical retailers ordering wholesale prescription lenses: complete Rx, frame data, freight options, customs and tracking."
      canonicalPath={PAGE_PATH}
      jsonLd={jsonLd}
    />
    <Header />

    <main id="main-content" className="pb-20 pt-24">
      <div className="container mx-auto max-w-6xl px-4 lg:px-8">
        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
          <Badge variant="secondary" className="mb-4">
            <Globe2 className="mr-1.5 h-3.5 w-3.5" />
            Professionals Guide
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Caribbean Lens Ordering Guide for Optical Retailers
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Ordering wholesale lenses across the islands works best when every job leaves your practice complete. This guide walks through the order steps that matter most for Caribbean retailers, from the prescription to freight and customs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/professionals/trade-account">Apply for a Trade Account</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/professionals/price-list-request">Request a Price List</Link>
            </Button>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground">Four steps to a clean island order</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {steps.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-border/70">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground">What to expect by region</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
            These are planning estimates after dispatch, not a promise of carrier performance. Final ETAs depend on uplift, customs clearance, weather and the service level confirmed on the job.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-semibold text-foreground">Region</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Planning note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {regions.map((row) => (
                  <tr key={row.region} className="align-top">
                    <td className="px-4 py-4 font-medium text-foreground">{row.region}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Full detail is in the <Link className="underline underline-offset-4" to="/professionals/freight-delivery-policy">Freight & Delivery Policy</Link>.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground">Planning tips for island practices</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {planning.map((tip) => (
              <Card key={tip.title} className="border-border/70">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground">{tip.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{tip.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground">Common questions</h2>
          <div className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-border bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">Related resources</h2>
          <ul className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <li><Link className="underline underline-offset-4" to="/professionals/freight-delivery-policy">Freight & Delivery Policy</Link></li>
            <li><Link className="underline underline-offset-4" to="/professionals/returns-replacements">Returns / Replacements</Link></li>
            <li><Link className="underline underline-offset-4" to="/professionals/customer-supplied-frames-policy">Customer-Supplied Frames Policy</Link></li>
            <li><Link className="underline underline-offset-4" to="/rx-lab-services">Rx Lab Services</Link></li>
          </ul>
          <div className="mt-6">
            <ContactAssistantButton
              variant="outline"
              topic="Caribbean Lens Ordering Guide"
              sourceRoute={PAGE_PATH}
              audience="dispenser"
              summary="I have a question about ordering lenses for my Caribbean practice."
            >
              Contact Customer Service
            </ContactAssistantButton>
          </div>
        </section>
      </div>
    </main>

    <Footer />
  </div>
);

export default CaribbeanLensOrderingGuidePage;
