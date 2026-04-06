import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock3, ExternalLink, PackageSearch, ShieldAlert, Truck } from "lucide-react";
import { Link } from "react-router";
import { LABLINK_TRACKING_URL } from "@/config/externalLinks";

type FreightLane = {
  region: string;
  standard: string;
  priority: string;
  freightCharge: string;
  customs: string;
};

const freightLanes: FreightLane[] = [
  {
    region: "Barbados local",
    standard: "Same day or next business day after dispatch for stocked and cleared jobs.",
    priority: "Same-business-day dispatch for approved rush jobs when capacity allows.",
    freightCharge: "Quoted at order confirmation. Account freight support, if any, is applied case by case.",
    customs: "No import clearance step for domestic deliveries.",
  },
  {
    region: "Eastern Caribbean",
    standard: "Typically 1-3 business days after dispatch, subject to uplift and island handoff.",
    priority: "Typically 1-2 business days after dispatch on the next available uplift.",
    freightCharge: "Quoted by destination, carton profile, and service level before release.",
    customs: "Import duty, VAT, and brokerage are set by the destination market and billed locally unless agreed otherwise.",
  },
  {
    region: "Western Caribbean",
    standard: "Typically 2-4 business days after dispatch, depending on routing and customs release.",
    priority: "Typically 1-3 business days after dispatch where priority uplift is available.",
    freightCharge: "Quoted per shipment. Subsidised freight, when offered, is tied to account terms rather than an automatic site-wide rule.",
    customs: "Consignee remains responsible for local duties, taxes, and any broker instructions required for release.",
  },
  {
    region: "Other export lanes",
    standard: "ETA is confirmed on the order acknowledgement and updated again at dispatch.",
    priority: "Priority service is offered only where a faster carrier lane exists for the destination.",
    freightCharge: "Freight is confirmed before dispatch; do not assume free freight unless it is shown on your account quote.",
    customs: "Destination-specific import rules apply and may extend transit beyond the shipping estimate.",
  },
];

const serviceNotes = [
  {
    title: "Freight options",
    body:
      "Standard and priority freight are both available. Service selection depends on destination, order profile, and the urgency approved on the job.",
  },
  {
    title: "Carrier routing",
    body:
      "DHL is used on time-critical export lanes where that service is selected. Other regional deliveries may move through non-DHL courier routing based on destination and consolidation needs.",
  },
  {
    title: "Tracking",
    body:
      "Dispatch milestones and final tracking references are surfaced through LabLink once the shipment leaves the lab.",
  },
  {
    title: "Free or subsidised freight",
    body:
      "Any freight subsidy is applied through account-specific commercial terms. If your team has a freight allowance or threshold, it will be confirmed on your quote, price list agreement, or order acknowledgement.",
  },
];

const issueSteps = [
  "If a shipment is delayed, our customer service team checks the latest LabLink scan, confirms whether the hold is operational, carrier-related, or customs-related, and sends an updated ETA.",
  "If a parcel appears lost, we open a carrier trace, verify the delivery address and carton reference, and keep the account contact updated until the carrier closes the investigation.",
  "Where replacement or remake action is needed, the case is reviewed alongside the original order record and any carrier findings before next steps are confirmed.",
];

const cutoffGaps = [
  "Exact same-day dispatch cut-off times remain operations-owned and should be published only once confirmed for each route group.",
  "Named non-DHL carrier assignments are still maintained operationally rather than in this website codebase.",
  "Any hard free-freight minimum should come from the operations or commercial team before it is presented as policy.",
];

const FreightDeliveryPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Freight & Delivery Policy | Classic Visions"
        description="Review dispatch expectations, LabLink tracking, customs guidance, delivery issue handling, and service-level notes for professional freight shipments."
        canonicalPath="/professionals/freight-delivery-policy"
      />
      <Header />

      <main id="main-content" className="pb-20 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
            <Badge variant="secondary" className="mb-4">
              <Truck className="mr-1.5 h-3.5 w-3.5" />
              Professionals Portal
            </Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Freight & Delivery Policy
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Use this page to set buying expectations before you place an order, then confirm shipment-specific details in LabLink and your order acknowledgement.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href={LABLINK_TRACKING_URL} target="_blank" rel="noopener noreferrer">
                  Open Order Tracking
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/professionals/customer-service">Contact Customer Service</Link>
              </Button>
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            {serviceNotes.map((note) => (
              <Card key={note.title} className="border-border/70">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground">{note.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.body}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="mt-10">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Estimated Transit by Region</h2>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
              These delivery bands are planning estimates after dispatch, not a promise of carrier performance. Final ETAs depend on available uplift, customs clearance, weather disruption, and the service level confirmed on the job.
            </p>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-semibold text-foreground">Region</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Standard</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Priority</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Freight Charge</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Customs / Duty Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {freightLanes.map((lane) => (
                    <tr key={lane.region} className="align-top">
                      <td className="px-4 py-4 font-medium text-foreground">{lane.region}</td>
                      <td className="px-4 py-4 text-muted-foreground">{lane.standard}</td>
                      <td className="px-4 py-4 text-muted-foreground">{lane.priority}</td>
                      <td className="px-4 py-4 text-muted-foreground">{lane.freightCharge}</td>
                      <td className="px-4 py-4 text-muted-foreground">{lane.customs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <PackageSearch className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Tracking, Delays, and Lost Shipments</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {issueSteps.map((step) => (
                    <p key={step} className="text-sm leading-6 text-muted-foreground">
                      {step}
                    </p>
                  ))}
                </div>
                <div className="mt-5">
                  <Button variant="outline" asChild>
                    <a href={LABLINK_TRACKING_URL} target="_blank" rel="noopener noreferrer">
                      Go to LabLink Tracking
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-300/60 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  <h2 className="text-xl font-semibold text-foreground">Operations Values Still to Confirm</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {cutoffGaps.map((item) => (
                    <p key={item} className="text-sm leading-6 text-muted-foreground">
                      {item}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-2">
            <Card className="border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Customs and Import Duty Guidance</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>Inter-island shipments may be assessed import duty, VAT, handling, brokerage, or airport release fees by the destination territory.</p>
                  <p>The consignee is responsible for providing any local tax ID, broker instruction, or import documentation required for clearance unless other terms are agreed in writing.</p>
                  <p>Customs release time sits outside the lab production SLA, so a shipment can leave on time and still arrive later than the original estimate if border processing is delayed.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Dispatch Cut-Off Guidance</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>Rush processing and same-day dispatch requests must be approved before the daily dispatch cut-off for the destination lane.</p>
                  <p>Because the exact cut-off changes by route group and carrier uplift, please confirm the current same-day window with customer service when placing urgent orders.</p>
                  <p>The most reliable way to protect a rush timeline is to submit a complete order in LabLink with any required trace files, notes, and authorisations already attached.</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FreightDeliveryPolicyPage;
