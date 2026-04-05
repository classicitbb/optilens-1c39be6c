import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createStructuredHelpdeskTicket } from "@/features/admin/helpdesk/utils/structuredTicketing";
import { LifeBuoy, LogIn } from "lucide-react";

type PortalPage = {
  title: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  body: string[];
  isForm?: boolean;
  isCustomerService?: boolean;
};

const portalPages: Record<string, PortalPage> = {
  "trade-account": {
    title: "Apply for a Trade Account",
    description: "Lead form for optical stores and clinics.",
    seoTitle: "Apply for a Trade Account | Classic Visions",
    seoDescription:
      "Apply for a Classic Visions trade account to request wholesale access, onboarding support, and account follow-up for your optical store or clinic.",
    body: [
      "Use this form to request wholesale access, account onboarding, and credit terms review.",
      "Submissions are routed to the CRM lead queue for professional account follow-up.",
    ],
    isForm: true,
  },
  "price-list-request": {
    title: "Price List Request",
    description: "Lead form for current lens and coating price lists.",
    body: [
      "Request the latest wholesale pricing and optional product matrix by market segment.",
      "Submissions are sent to the sales operations inbox and tagged for response tracking.",
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
      "Email: support@classicvisions.com",
      "Hours: Mon–Fri, 8:00 AM–5:00 PM (AST)",
    ],
    isCustomerService: true,
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

const CustomerServiceTicketForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  if (!user) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center space-y-4">
        <LifeBuoy className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Please sign in to submit a support ticket.
        </p>
        <Button onClick={() => navigate(`/auth?redirect=${encodeURIComponent("/professionals/customer-service")}`)}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign In to Submit a Ticket
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setLoading(true);

    try {
      // Check if a contact exists for this user's email, create if not
      const userEmail = user.email;
      let contactId: string | null = null;

      if (userEmail) {
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("email", userEmail)
          .maybeSingle();

        if (existing?.id) {
          contactId = existing.id;
        } else {
          const { data: created } = await supabase
            .from("contacts")
            .insert({
              name: user.user_metadata?.full_name || userEmail,
              email: userEmail,
              type: "individual",
              status: "active",
              pipeline_stage: "new",
              is_customer: true,
            })
            .select("id")
            .single();

          contactId = created?.id ?? null;
        }
      }

      await createStructuredHelpdeskTicket({
        title: subject.trim(),
        description: description.trim(),
        subtype: "general_inquiry" as any,
        sourceChannel: "portal",
        sourceRoleMode: "customer",
        sourceRouteContext: "professionals",
        sourceAuthenticationRequired: true,
        partnerContactId: contactId,
        sourceMetadata: {
          user_id: user.id,
          user_email: userEmail,
          source_page: "/professionals/customer-service",
        },
      });

      toast({
        title: "Ticket Created",
        description: "Your support ticket has been submitted. We'll respond shortly.",
      });
      setSubject("");
      setDescription("");
    } catch (err: any) {
      console.error("Ticket creation failed:", err);
      toast({
        title: "Submission failed",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-primary" />
        Submit a Support Ticket
      </h3>
      <div className="space-y-2">
        <Label htmlFor="ticket-subject">Subject</Label>
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Brief description of your issue"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ticket-description">Description</Label>
        <Textarea
          id="ticket-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="Provide details about your issue, including order numbers if applicable"
          rows={5}
        />
      </div>
      <Button type="submit" disabled={loading || !subject.trim() || !description.trim()}>
        {loading ? "Submitting..." : "Submit Ticket"}
      </Button>
    </form>
  );
};

const ProfessionalsPortalPage = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const page = useMemo(() => (slug ? portalPages[slug] : undefined), [slug]);

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pb-16 pt-24 lg:px-8">
          <h1 className="text-3xl font-bold">Professional resource not found</h1>
          <p className="mt-3 text-muted-foreground">The page you requested is unavailable.</p>
          <Button asChild className="mt-6">
            <Link to="/professionals">Back to Professionals</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={page.seoTitle ?? `${page.title} | Classic Visions`}
        description={page.seoDescription ?? page.description}
        canonicalPath={`/professionals/${slug}`}
      />
      <Header />
      <main className="container mx-auto max-w-3xl px-4 pb-16 pt-24 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Professionals Portal</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{page.title}</h1>
          <p className="mt-3 text-muted-foreground">{page.description}</p>
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            {page.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {page.isCustomerService && <CustomerServiceTicketForm />}

          {page.isForm && (
            <form
              className="mt-8 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (honeypot) return; // spam bot

                setLoading(true);
                const formData = new FormData(event.currentTarget);
                try {
                  const { error } = await (supabase as any).from("public_inquiries").insert({
                    inquiry_type: slug === "trade-account" ? "trade_account" : "price_list",
                    name: formData.get("contactName") as string,
                    email: formData.get("email") as string,
                    phone: (formData.get("phone") as string) || null,
                    business_name: (formData.get("businessName") as string) || null,
                    notes: (formData.get("notes") as string) || null,
                    page_slug: `/professionals/${slug}`,
                    source_channel: "website",
                  });

                  if (error) throw error;

                  toast({
                    title: "Request Submitted",
                    description: "Your request has been captured and queued for the professional support team.",
                  });
                  (event.target as HTMLFormElement).reset();
                } catch {
                  toast({
                    title: "Submission failed",
                    description: "Please try again or contact us directly.",
                    variant: "destructive",
                  });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {/* Honeypot */}
              <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                <label htmlFor="company_website">Website</label>
                <input
                  id="company_website"
                  name="company_website"
                  type="text"
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                />
              </div>

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
