import { useState } from "react";
import { Send, CheckCircle, FileText, PhoneCall, Package, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ZenvueHero from "@/components/zenvue/ZenvueHero";
import ZenvueFeatureShell from "@/components/zenvue/ZenvueFeatureShell";

const inquirySchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(200),
  business_type: z.string().max(100).optional(),
  monthly_volume: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  contact_name: z.string().trim().min(1, "Contact name is required").max(200),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string().max(50).optional(),
  referral_source: z.string().max(100).optional(),
  comments: z.string().max(2000).optional(),
});

const STEPS = [
  { icon: FileText, title: "Submit Application", desc: "Fill out the form with your business details." },
  { icon: PhoneCall, title: "We'll Reach Out", desc: "Our team will contact you within 2 business days." },
  { icon: Package, title: "Start Ordering", desc: "Get access to our full product catalog and wholesale pricing." },
];

const ZenvueWholesale = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    business_type: "",
    monthly_volume: "",
    location: "",
    contact_name: "",
    email: "",
    phone: "",
    referral_source: "",
    comments: "",
  });
  // Honeypot field — must remain empty for real submissions
  const [honeypot, setHoneypot] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setValidationErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check — bots fill hidden fields
    if (honeypot) return;

    // Validate with Zod
    const result = inquirySchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[String(err.path[0])] = err.message;
      });
      setValidationErrors(errors);
      toast({ title: "Please fix the highlighted fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("wholesale_inquiries").insert(result.data as any);
    setLoading(false);
    if (error) {
      toast({ title: "Submission failed", description: "Please try again later.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Application received!", description: "We'll be in touch within 2 business days." });
  };

  if (submitted) {
    return (
      <ZenvueFeatureShell>
        <ZenvueHero badge="Partner Application" title="Thank You!" subtitle="Your application has been received. Our team will contact you within 2 business days." />
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-14 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-sm md:p-10">
              <CheckCircle className="mx-auto h-14 w-14 text-accent" />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Application Submitted Successfully
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                We appreciate your interest in partnering with ZenVue. Keep an eye on your inbox.
              </p>
            </div>
          </div>
        </section>
      </ZenvueFeatureShell>
    );
  }

  return (
    <ZenvueFeatureShell>
      <ZenvueHero
        badge="Partner With Us"
        title="Become a ZenVue Partner"
        subtitle="Join our growing network of optical professionals across the Caribbean. Complete the form below to get started."
      />

      {/* Form */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-14 lg:px-8 lg:py-16">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
            {/* Honeypot — hidden from real users, bots fill it */}
            <div style={{ display: "none" }} aria-hidden="true">
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            {Object.keys(validationErrors).length > 0 && (
              <Alert variant="destructive" className="border-destructive/40">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Please review your application details</AlertTitle>
                <AlertDescription>
                  Some fields require attention before you can submit.
                </AlertDescription>
              </Alert>
            )}

            {/* Business Info */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8" aria-labelledby="business-information-heading">
              <h2 id="business-information-heading" className="mb-5 text-xl font-semibold tracking-tight text-foreground">
                Business Information
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input id="business_name" value={form.business_name} onChange={(e) => update("business_name", e.target.value)} className={validationErrors.business_name ? "border-destructive focus-visible:ring-destructive" : ""} />
                  {validationErrors.business_name && <p className="text-sm font-medium text-destructive">{validationErrors.business_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select value={form.business_type} onValueChange={(v) => update("business_type", v)}>
                    <SelectTrigger id="business_type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="optical_shop">Optical Shop</SelectItem>
                      <SelectItem value="chain">Chain / Multi-location</SelectItem>
                      <SelectItem value="hospital">Hospital / Clinic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_volume">Monthly Volume</Label>
                  <Select value={form.monthly_volume} onValueChange={(v) => update("monthly_volume", v)}>
                    <SelectTrigger id="monthly_volume">
                      <SelectValue placeholder="Estimated volume" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-50">1–50 pairs</SelectItem>
                      <SelectItem value="51-200">51–200 pairs</SelectItem>
                      <SelectItem value="201-500">201–500 pairs</SelectItem>
                      <SelectItem value="500+">500+ pairs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="location">Country / Location</Label>
                  <Input id="location" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Trinidad & Tobago" />
                </div>
              </div>
            </section>

            {/* Contact Info */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8" aria-labelledby="contact-information-heading">
              <h2 id="contact-information-heading" className="mb-5 text-xl font-semibold tracking-tight text-foreground">
                Contact Information
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <Input id="contact_name" value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} className={validationErrors.contact_name ? "border-destructive focus-visible:ring-destructive" : ""} />
                  {validationErrors.contact_name && <p className="text-sm font-medium text-destructive">{validationErrors.contact_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={validationErrors.email ? "border-destructive focus-visible:ring-destructive" : ""} />
                  {validationErrors.email && <p className="text-sm font-medium text-destructive">{validationErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 (868) 555-0123" />
                </div>
              </div>
            </section>

            {/* Additional */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8" aria-labelledby="additional-information-heading">
              <h2 id="additional-information-heading" className="mb-5 text-xl font-semibold tracking-tight text-foreground">
                Additional Information
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="referral_source">How did you hear about us?</Label>
                  <Select value={form.referral_source} onValueChange={(v) => update("referral_source", v)}>
                    <SelectTrigger id="referral_source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trade_show">Trade Show / Event</SelectItem>
                      <SelectItem value="colleague">Colleague / Referral</SelectItem>
                      <SelectItem value="online">Online Search</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea id="comments" value={form.comments} onChange={(e) => update("comments", e.target.value)} placeholder="Tell us about your practice or any questions you have..." rows={4} />
                </div>
              </div>
            </section>

            <Button type="submit" size="lg" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </div>
      </section>

      {/* What Happens Next */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            What Happens Next?
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground text-lg font-bold">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ZenvueFeatureShell>
  );
};

export default ZenvueWholesale;
