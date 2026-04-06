import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createStructuredHelpdeskTicket } from "@/features/admin/helpdesk/utils/structuredTicketing";
import { ExternalLink, LifeBuoy, LogIn, RotateCcw, ShieldAlert } from "lucide-react";
import { LABLINK_PORTAL_URL } from "@/config/externalLinks";

const SUPPORT_EMAIL = "info@classicvisions.net";

const coverageRows = [
  {
    issue: "Covered for review",
    items: [
      "Verified surfacing or coating defects.",
      "Rx discrepancies against the submitted order.",
      "Transit breakage or delivery damage reported promptly with photos.",
      "Manufacturing or finishing issues confirmed by our review team.",
    ],
  },
  {
    issue: "Not covered",
    items: [
      "Wear-and-tear, accidental user damage, or post-delivery mishandling.",
      "Incorrect frame measurements, fitting heights, trace files, or job data supplied by the customer.",
      "Breakage linked to aged, brittle, heat-stressed, or otherwise compromised customer-owned frames.",
      "Preference changes where the product supplied matches the approved order.",
    ],
  },
];

const requiredInfo = [
  "Order number or LabLink reference.",
  "Clear description of the issue and when it was first noticed.",
  "Photos showing the defect, damage, or comparison issue where relevant.",
  "Whether you are requesting a remake review, credit review, or technical follow-up.",
];

const policyCards = [
  {
    title: "Reporting window",
    body:
      "Report quality issues within 7 calendar days of delivery. Transit damage or obvious breakage should be flagged as soon as possible, ideally within 48 hours, so the carrier and packing record can still be checked.",
  },
  {
    title: "Response target",
    body:
      "Our team aims to acknowledge complete submissions within 1 business day and confirm the next step, remake approval, or credit review within 2 business days once the required information has been received.",
  },
  {
    title: "Remake vs refund",
    body:
      "Approved manufacturing or order-processing issues are normally resolved by remake or replacement. Refunds or credits are considered where a remake is not practical, cannot correct the issue, or is otherwise approved by management.",
  },
  {
    title: "Submission channels",
    body:
      "You can submit through the form on this page, email the details to customer service, or open the case in LabLink and reference the same order number in every channel.",
  },
];

const relatedPolicies = [
  {
    title: "Repairs Policy",
    description: "How repair work is assessed, quoted, and handled when the item already carries wear or hidden stress.",
    to: "/professionals/repairs-policy",
  },
  {
    title: "Customer-Supplied Frames Policy",
    description: "Liability, suitability, and insurance expectations for lenses fitted into customer-owned frames.",
    to: "/professionals/customer-supplied-frames-policy",
  },
];

const ensureUserContact = async (user: NonNullable<ReturnType<typeof useAuth>["user"]>) => {
  const userEmail = user.email;
  if (!userEmail) return null;

  const { data: existing } = await supabase.from("contacts").select("id").eq("email", userEmail).maybeSingle();
  if (existing?.id) return existing.id as string;

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

  return (created?.id as string | undefined) ?? null;
};

const ReturnsWarrantyForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [resolutionPreference, setResolutionPreference] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [photoReference, setPhotoReference] = useState("");
  const [description, setDescription] = useState("");

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">Sign in to submit a return or warranty request</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          If you are not signed in, you can still email{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          or open the case in LabLink.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate(`/auth?redirect=${encodeURIComponent("/professionals/returns-replacements")}`)}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button variant="outline" asChild>
            <a href={LABLINK_PORTAL_URL} target="_blank" rel="noopener noreferrer">
              Open LabLink
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!issueType || !resolutionPreference || !orderNumber.trim() || !description.trim()) return;

    setLoading(true);
    try {
      const contactId = await ensureUserContact(user);

      const fullDescription = [
        `Order number: ${orderNumber.trim()}`,
        `Issue type: ${issueType}`,
        `Resolution preference: ${resolutionPreference}`,
        photoReference.trim() ? `Photo reference / note: ${photoReference.trim()}` : null,
        "",
        description.trim(),
      ]
        .filter(Boolean)
        .join("\n");

      await createStructuredHelpdeskTicket({
        title: `Returns / warranty request for order ${orderNumber.trim()}`,
        description: fullDescription,
        subtype: "returns_warranty_support",
        sourceChannel: "portal",
        sourceRoleMode: "customer",
        sourceRouteContext: "professionals",
        sourceAuthenticationRequired: true,
        partnerContactId: contactId,
        sourceMetadata: {
          issue_type: issueType,
          resolution_preference: resolutionPreference,
          photo_reference: photoReference.trim() || null,
          order_number: orderNumber.trim(),
          source_page: "/professionals/returns-replacements",
          user_id: user.id,
          user_email: user.email ?? null,
        },
      });

      toast({
        title: "Request Submitted",
        description: "Your return or remake request has been logged for review.",
      });
      setIssueType("");
      setResolutionPreference("");
      setOrderNumber("");
      setPhotoReference("");
      setDescription("");
    } catch (error) {
      console.error("Return request submission failed:", error);
      toast({
        title: "Submission failed",
        description: "Please try again or send the details by email or LabLink.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4 rounded-2xl border border-border bg-card p-6" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-foreground">Submit a Return / Warranty Request</h3>
      <p className="text-sm leading-6 text-muted-foreground">
        Use this form to open the case, then send or attach photos in LabLink or by email if the issue needs visual review.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="order-number">Order Number</Label>
          <Input
            id="order-number"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="LabLink job or order reference"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="issue-type">Issue Type</Label>
          <Select value={issueType} onValueChange={setIssueType}>
            <SelectTrigger id="issue-type">
              <SelectValue placeholder="Select issue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="surfacing_defect">Surfacing or coating defect</SelectItem>
              <SelectItem value="rx_discrepancy">Rx discrepancy</SelectItem>
              <SelectItem value="transit_breakage">Transit damage or breakage</SelectItem>
              <SelectItem value="frame_breakage">Frame or mounting issue</SelectItem>
              <SelectItem value="other">Other technical issue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="resolution-preference">Preferred Resolution</Label>
          <Select value={resolutionPreference} onValueChange={setResolutionPreference}>
            <SelectTrigger id="resolution-preference">
              <SelectValue placeholder="Select preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remake_review">Remake review</SelectItem>
              <SelectItem value="credit_review">Credit or refund review</SelectItem>
              <SelectItem value="technical_review">Technical guidance first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="photo-reference">Photo Reference</Label>
          <Input
            id="photo-reference"
            value={photoReference}
            onChange={(event) => setPhotoReference(event.target.value)}
            placeholder="e.g. emailed to support or attached in LabLink"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issue-description">Issue Description</Label>
        <Textarea
          id="issue-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the defect, what was observed, and when it was discovered."
          rows={6}
          required
        />
      </div>

      <Button type="submit" disabled={loading || !issueType || !resolutionPreference || !orderNumber.trim() || !description.trim()}>
        {loading ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
};

const ReturnsReplacementsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Returns & Replacements Policy | Classic Visions"
        description="Review return eligibility, exclusions, reporting windows, remake handling, and the support submission process for professional orders."
        canonicalPath="/professionals/returns-replacements"
      />
      <Header />

      <main id="main-content" className="pb-20 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
            <Badge variant="secondary" className="mb-4">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Professionals Portal
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Returns & Replacements Policy</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              This page explains what is eligible for review, how quickly issues should be reported, what information is required, and how remake or credit decisions are handled.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href={LABLINK_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                  Open LabLink
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`mailto:${SUPPORT_EMAIL}`}>Email {SUPPORT_EMAIL}</a>
              </Button>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {policyCards.map((card) => (
              <Card key={card.title} className="border-border/70">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.body}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="mt-10 grid gap-4 lg:grid-cols-2">
            {coverageRows.map((group) => (
              <Card key={group.issue} className="border-border/70">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-foreground">{group.issue}</h2>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <ReturnsWarrantyForm />

            <Card className="border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">What to Include</h2>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {requiredInfo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  If the submitted information is incomplete, the review clock pauses until the missing details are supplied.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="mt-10 rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Related Handling Policies</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {relatedPolicies.map((policy) => (
                <Link key={policy.title} to={policy.to} className="rounded-2xl border border-border/70 p-5 transition-colors hover:bg-muted/40">
                  <h3 className="text-lg font-semibold text-foreground">{policy.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{policy.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReturnsReplacementsPage;
