import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Wrench } from "lucide-react";

const repairSteps = [
  "Repair work is accepted only after inspection and confirmation that the item is suitable for an attempted repair.",
  "A repair quotation or approval request may be issued before work starts where materials, labour, or replacement parts are required.",
  "Completion dates are estimates because repair outcomes depend on part availability, the condition of the item, and whether additional damage is uncovered during handling.",
];

const repairLimitations = [
  "Repairs are performed on items that may already have wear, hidden fractures, heat damage, stress cracks, or prior modifications.",
  "Because of those unknowns, Classic Visions does not guarantee that a repair attempt will succeed or that the item can be restored without further failure.",
  "By submitting an item for repair, the customer accepts the risk of breakage, deformation, finish damage, or component failure that may occur during normal repair handling.",
];

const liabilityNotes = [
  "Customer-owned items should be insured or self-insured before they are sent for repair.",
  "Classic Visions is not responsible for the replacement cost of customer-owned goods damaged during an approved repair attempt, except where liability cannot lawfully be excluded.",
  "We are not liable for indirect loss, downtime, lost sales, patient inconvenience, or consequential damages arising from a failed or incomplete repair.",
];

const RepairsPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Repairs Policy | Classic Visions"
        description="Understand repair assessment, turnaround expectations, and liability terms for customer-owned items submitted for repair."
        canonicalPath="/professionals/repairs-policy"
      />
      <Header />

      <main id="main-content" className="pb-20 pt-24">
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
            <Badge variant="secondary" className="mb-4">
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              Professionals Portal
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Repairs Policy</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Repair work is handled with care, but all repairs are attempted on items that may already carry age, wear, hidden stress, or prior damage.
            </p>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="border-border/70">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground">Assessment Process</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {repairSteps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground">Repair Limitations</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {repairLimitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Liability and Insurance</h2>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {liabilityNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="mt-10 rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Before You Send a Repair</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Make sure the item is labelled clearly, the problem is described in writing, and any time-sensitive context is provided up front.</p>
              <p>Where the item has significant value, the customer is expected to arrange appropriate insurance cover before transit and during handling.</p>
              <p>If the condition of the item makes repair unsuitable, we may decline the work and return it without further processing.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a href="/#contact">Contact Us</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="mailto:support@classicvisions.net">Email Support</a>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RepairsPolicyPage;
