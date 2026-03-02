import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type PortalPage = {
  title: string;
  description: string;
  body: string[];
  isForm?: boolean;
};

const portalPages: Record<string, PortalPage> = {
  "trade-account": {
    title: "Apply for a Trade Account",
    description: "Odoo lead form for optical stores and clinics.",
    body: [
      "Use this form to request wholesale access, account onboarding, and credit terms review.",
      "Submissions are routed to the Odoo CRM lead queue for professional account follow-up.",
    ],
    isForm: true,
  },
  "price-list-request": {
    title: "Price List Request",
    description: "Odoo lead form for current lens and coating price lists.",
    body: [
      "Request the latest wholesale pricing and optional product matrix by market segment.",
      "Submissions are sent to the sales operations inbox and tagged in Odoo for response tracking.",
    ],
    isForm: true,
  },
  "lab-process-overview": {
    title: "Lab Process Overview",
    description: "How orders move from Rx submission to delivery.",
    body: [
      "1) Rx validation and frame suitability check.",
      "2) Surfacing, coating, edging, and final QC checkpoints.",
      "3) Dispatch handoff and shipment monitoring for each order.",
    ],
  },
  "tracing-cutting-guide": {
    title: "Tracing & Cutting Guide",
    description: "Best practices for accurate frame tracing and cut quality.",
    body: [
      "Capture trace geometry with minimal distortion and verify A/B/DBL measurements before submission.",
      "Confirm bevel style, edge thickness constraints, and drill-mount considerations to reduce remakes.",
    ],
  },
  "lens-ordering-tips": {
    title: "Lens Ordering Tips",
    description: "Checklist for faster processing and fewer production holds.",
    body: [
      "Include complete monocular PD/height, fitting cross details, and frame dimensions.",
      "Double-check material, index, coating stack, tint, and prism notation to avoid clarification delays.",
    ],
  },
  "chemistrie-lens-system": {
    title: "Chemistrie Lens System",
    description: "Overview of magnetically integrated sun and specialty clip solutions.",
    body: [
      "Chemistrie combines a primary ophthalmic lens and magnetic secondary clip engineered for secure alignment.",
      "Specify base curve compatibility and frame profile requirements before placing custom orders.",
    ],
  },
  "customer-service": {
    title: "Customer Service",
    description: "Professional support channels for order and account assistance.",
    body: [
      "Phone: +1 246 433-4928",
      "Email: support@optivisionnow.com",
      "Hours: Mon–Fri, 8:00 AM–5:00 PM (AST)",
    ],
  },
  "freight-delivery-policy": {
    title: "Freight & Delivery Policy",
    description: "Shipping methods, service levels, and delivery expectations.",
    body: [
      "Standard and priority freight options are available based on destination and order type.",
      "Transit times are estimates and may vary due to carrier constraints, customs, or weather.",
      "Tracking events are provided through the external carrier and LabLink portal.",
    ],
  },
  "returns-replacements": {
    title: "Returns / Replacements",
    description: "RMA and remake policy for approved issues and warranty coverage.",
    body: [
      "Report breakage, surfacing defects, or Rx discrepancies within policy windows for review.",
      "Include order number, photos, and issue notes to accelerate replacement authorization.",
    ],
  },
};

const ProfessionalsPortalPage = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const page = useMemo(() => (slug ? portalPages[slug] : undefined), [slug]);

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pb-16 pt-24 lg:px-8">
          <h1 className="text-3xl font-bold">Professional resource not found</h1>
          <p className="mt-3 text-muted-foreground">The page you requested is unavailable.</p>
          <Button asChild className="mt-6">
            <Link to="/for-professionals">Back to Professionals</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 pb-16 pt-24 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Odoo Professionals Portal</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{page.title}</h1>
          <p className="mt-3 text-muted-foreground">{page.description}</p>
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            {page.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {page.isForm && (
            <form
              className="mt-8 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setLoading(true);
                await new Promise((resolve) => setTimeout(resolve, 800));
                toast({
                  title: "Submitted to Odoo",
                  description: "Your request has been captured and queued for the professional support team.",
                });
                setLoading(false);
                (event.currentTarget as HTMLFormElement).reset();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" name="businessName" required placeholder="Clinic or store name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input id="contactName" name="contactName" required placeholder="Full name" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Business Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="name@business.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" required placeholder="+1 ..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Order volumes, product interests, or operational needs" rows={4} />
              </div>
              <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Request"}</Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfessionalsPortalPage;
