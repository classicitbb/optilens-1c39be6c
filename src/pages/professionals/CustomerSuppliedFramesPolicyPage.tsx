import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Glasses, ShieldAlert } from "lucide-react";

const acceptancePoints = [
  "Customer-supplied frames are accepted only after a suitability check for lens type, frame condition, drill or groove integrity, and mounting risk.",
  "We may decline to process frames that appear brittle, heat-damaged, heavily worn, out of tolerance, or otherwise unsuitable for safe glazing.",
  "Any dimensions, trace files, or mounting instructions supplied by the customer remain the customer's responsibility.",
];

const riskPoints = [
  "Customer-owned frames may contain hidden stress, material fatigue, prior repairs, or manufacturing inconsistencies that are not visible before work begins.",
  "During glazing, edging, mounting, or adjustment, those underlying conditions can lead to cracking, distortion, scratching, or part failure even where reasonable care is used.",
  "By sending customer-supplied frames, the customer accepts that risk and authorises work to proceed on that basis.",
];

const liabilityPoints = [
  "Classic Visions is not responsible for breakage, deformation, surface marking, component loss, or mounting failure affecting customer-supplied frames, except where liability cannot lawfully be excluded.",
  "The customer is expected to insure or self-insure against loss or damage to customer-owned frames before shipping and while the work is being performed.",
  "We are not liable for consequential loss, patient inconvenience, replacement sales value, or any downstream cost resulting from damage to a customer-supplied frame.",
];

const CustomerSuppliedFramesPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Customer-Supplied Frames Policy | Classic Visions"
        description="Review acceptance criteria, glazing risk, and liability terms for customer-owned frames submitted for lens work."
        canonicalPath="/professionals/customer-supplied-frames-policy"
      />
      <Header />

      <main id="main-content" className="pb-20 pt-24">
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
            <Badge variant="secondary" className="mb-4">
              <Glasses className="mr-1.5 h-3.5 w-3.5" />
              Professionals Portal
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Customer-Supplied Frames Policy</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Customer-owned frames can be processed only on an at-risk basis. Hidden stress and age-related weakness mean damage can occur even when the frame looks serviceable at intake.
            </p>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="border-border/70">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground">Acceptance Criteria</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {acceptancePoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground">Known Risks</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {riskPoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Liability Position</h2>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {liabilityPoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="mt-10 rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Before Submitting a Customer-Owned Frame</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Confirm the frame is the correct model, is structurally sound, and is worth the glazing risk before dispatching it.</p>
              <p>Where the frame has significant retail or sentimental value, the customer should arrange suitable insurance cover before it enters transit or production.</p>
              <p>If the work cannot be completed safely, we may stop processing and return the frame without finishing the job.</p>
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

export default CustomerSuppliedFramesPolicyPage;
