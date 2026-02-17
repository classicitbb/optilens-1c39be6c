import { useState } from "react";
import { Send, CheckCircle, FileText, PhoneCall, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ZenvueHero from "@/components/zenvue/ZenvueHero";

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

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name || !form.contact_name || !form.email) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("wholesale_inquiries").insert(form as any);
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
      <>
        <ZenvueHero badge="Partner Application" title="Thank You!" subtitle="Your application has been received. Our team will contact you within 2 business days." />
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-16 lg:px-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-accent" />
            <h2 className="mt-6 text-2xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
              Application Submitted Successfully
            </h2>
            <p className="mt-3 text-muted-foreground">
              We appreciate your interest in partnering with ZenVue. Keep an eye on your inbox.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <ZenvueHero
        badge="Partner With Us"
        title="Become a ZenVue Partner"
        subtitle="Join our growing network of optical professionals across the Caribbean. Complete the form below to get started."
      />

      {/* Form */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
            {/* Business Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
                Business Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">Business Name *</label>
                  <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Business Type *</label>
                  <Select value={form.business_type} onValueChange={(v) => update("business_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="optical_shop">Optical Shop</SelectItem>
                      <SelectItem value="chain">Chain / Multi-location</SelectItem>
                      <SelectItem value="hospital">Hospital / Clinic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Monthly Volume</label>
                  <Select value={form.monthly_volume} onValueChange={(v) => update("monthly_volume", v)}>
                    <SelectTrigger><SelectValue placeholder="Estimated volume" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-50">1–50 pairs</SelectItem>
                      <SelectItem value="51-200">51–200 pairs</SelectItem>
                      <SelectItem value="201-500">201–500 pairs</SelectItem>
                      <SelectItem value="500+">500+ pairs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">Country / Location</label>
                  <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Trinidad & Tobago" />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
                Contact Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">Contact Name *</label>
                  <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Email *</label>
                  <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
                  <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 (868) 555-0123" />
                </div>
              </div>
            </div>

            {/* Additional */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
                Additional Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">How did you hear about us?</label>
                  <Select value={form.referral_source} onValueChange={(v) => update("referral_source", v)}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trade_show">Trade Show / Event</SelectItem>
                      <SelectItem value="colleague">Colleague / Referral</SelectItem>
                      <SelectItem value="online">Online Search</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Comments</label>
                  <Textarea value={form.comments} onChange={(e) => update("comments", e.target.value)} placeholder="Tell us about your practice or any questions you have..." rows={4} />
                </div>
              </div>
            </div>

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
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            What Happens Next?
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground text-lg font-bold">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default ZenvueWholesale;
