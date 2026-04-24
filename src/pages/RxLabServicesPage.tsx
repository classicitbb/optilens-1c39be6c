import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  Wrench,
  Layers,
  Droplets,
  Scissors,
  Sparkles,
  ClipboardList,
  FlaskConical,
  Building2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { submitPublicInquiry } from "@/lib/publicInquiry";
import { createAuthHref } from "@/lib/authFlow";
import Seo from "@/components/seo/Seo";

const services = [
  {
    icon: Layers,
    title: "Custom Surfacing",
    description:
      "Prescription surfacing to your exact Rx specifications. Single vision, bifocal, and progressive designs across a broad material range.",
  },
  {
    icon: Scissors,
    title: "Precision Edging",
    description:
      "Frame-to-fit edging with tracing from your supplied frame or shape file. Rimless, semi-rimless, and full-frame supported.",
  },
  {
    icon: Droplets,
    title: "Tinting",
    description:
      "Fashion and solid tints, gradient finishes, and sun lens tinting using colour-stable dyes built for long-term retention.",
  },
  {
    icon: Sparkles,
    title: "Specialty Coatings",
    description:
      "AR, blue-block, hydrophobic, scratch-resistant, UV shield, and mirror finishes applied in-house for consistent quality.",
  },
  {
    icon: FlaskConical,
    title: "Lab Chemistries",
    description:
      "Polishing compounds, hard coats, and blocking consumables available alongside lab services for full workflow continuity.",
  },
  {
    icon: ClipboardList,
    title: "Rx Job Management",
    description:
      "Submit and track Rx jobs through LabLink — our order portal — with job-level status visibility and delivery scheduling.",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Submit your Rx",
    description:
      "Send your prescription details, frame or shape file, and any coating requirements through LabLink or via your account rep.",
  },
  {
    step: "02",
    title: "We surface & finish",
    description:
      "Our lab team handles surfacing, edging, tinting, and coating in-house — with QC checks at each stage.",
  },
  {
    step: "03",
    title: "Delivered to your door",
    description:
      "Finished jobs are packaged and dispatched with tracking. Rush options are available for urgent orders.",
  },
];

const benefits = [
  "Trade pricing for qualifying optical businesses",
  "In-house lab — no third-party handoffs",
  "Broad Rx range including high-minus and high-plus",
  "Caribbean-specialist logistics and delivery",
  "Dedicated account support",
  "LabLink order portal for 24/7 job submission",
];

const inquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  businessName: z.string().trim().min(1, "Business name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

const signupHref = createAuthHref({
  mode: "signup",
  audience: "professional",
  intent: "ordering",
  redirect: "/rx-lab-services",
});

const RxLabServicesPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt, setStartedAt] = useState("");

  useEffect(() => {
    setStartedAt(new Date().toISOString());
  }, []);

  const sourcePage = useMemo(() => {
    if (typeof window === "undefined") return "/rx-lab-services";
    return `${window.location.pathname}${window.location.search}`;
  }, []);

  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = async (values: InquiryFormData) => {
    if (honeypot) return;

    setIsSubmitting(true);
    try {
      await submitPublicInquiry({
        inquiryType: "rx-lab-services-interest",
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        businessName: values.businessName,
        message: values.message
          ? `Rx Lab Services inquiry from ${values.businessName}.\n\n${values.message}`
          : `Rx Lab Services inquiry from ${values.businessName}.`,
        pageSlug: sourcePage,
        sourceChannel: "rx-lab-services-page",
        honeypot,
        startedAt,
      });

      setSubmitted(true);
      toast({
        title: "Inquiry received",
        description: "We'll be in touch within one business day.",
      });
    } catch {
      toast({
        title: "Submission failed",
        description: "Something went wrong. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Rx Lab Services — Surfacing, Edging & Specialty Coatings | Classic Visions"
        description="Professional prescription lab services for optical practices. Custom surfacing, precision edging, tinting, and specialty coatings — in-house, Caribbean-based."
        canonicalPath="/rx-lab-services"
      />
      <Header />

      <main id="main-content">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 sm:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-accent">
                <Wrench className="h-8 w-8 text-accent-foreground" aria-hidden="true" />
              </div>
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Rx Lab Services
              </h1>
              <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
                Professional prescription laboratory services for optical practices. Custom surfacing,
                precision edging, tinting, and specialty coatings — all in-house.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button variant="hero" size="lg" asChild>
                  <Link to={signupHref}>
                    Create a Trade Account
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#inquiry">Send an Inquiry</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Services grid */}
        <section className="py-16 sm:py-20" aria-labelledby="services-heading">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-12 text-center">
              <h2 id="services-heading" className="mb-3 text-2xl font-bold sm:text-3xl">
                What we do in-house
              </h2>
              <p className="mx-auto max-w-xl text-muted-foreground">
                Every step from blank to finished lens — under one roof, with QC at each stage.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <Card
                  key={service.title}
                  variant="feature"
                  className="group opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent transition-transform group-hover:scale-110">
                      <service.icon className="h-5 w-5 text-accent-foreground" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {service.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-muted/40 py-16 sm:py-20" aria-labelledby="process-heading">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-12 text-center">
              <h2 id="process-heading" className="mb-3 text-2xl font-bold sm:text-3xl">
                How it works
              </h2>
              <p className="text-muted-foreground">Simple, predictable, and easy to integrate into your workflow.</p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
              {processSteps.map((step) => (
                <div key={step.step} className="text-center">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-accent text-xl font-bold text-accent-foreground">
                    {step.step}
                  </div>
                  <h3 className="mb-2 text-base font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-20" aria-labelledby="benefits-heading">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 id="benefits-heading" className="mb-4 text-2xl font-bold sm:text-3xl">
                    Built for optical businesses
                  </h2>
                  <p className="mb-6 text-muted-foreground">
                    A trade account gives you access to wholesale pricing, LabLink ordering, and a
                    dedicated support line — everything in one relationship.
                  </p>
                  <ul className="space-y-3">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                    Ready to get started?
                  </p>
                  <h3 className="mb-2 text-xl font-bold">Open a trade account</h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Create your account in under two minutes. Business details qualify you for trade
                    pricing and immediate ordering access through LabLink.
                  </p>
                  <Button variant="hero" className="w-full" asChild>
                    <Link to={signupHref}>
                      Sign Up — It's Free
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      to={createAuthHref({ mode: "signin", redirect: "/rx-lab-services" })}
                      className="font-medium text-primary hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Inquiry form */}
        <section id="inquiry" className="bg-muted/40 py-16 sm:py-20" aria-labelledby="inquiry-heading">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-xl">
              <div className="mb-8 text-center">
                <h2 id="inquiry-heading" className="mb-3 text-2xl font-bold sm:text-3xl">
                  Have questions first?
                </h2>
                <p className="text-muted-foreground">
                  Send us your details and a member of our lab team will follow up within one business day.
                </p>
              </div>

              {submitted ? (
                <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" aria-hidden="true" />
                  <h3 className="mb-1 text-lg font-semibold">Inquiry received</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll be in touch within one business day. In the meantime, you can{" "}
                    <Link to={signupHref} className="font-medium text-primary hover:underline">
                      create your trade account
                    </Link>{" "}
                    to get immediate catalog access.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                      {/* Honeypot */}
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        aria-hidden="true"
                        className="hidden"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        autoComplete="off"
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <div className="relative">
                                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <FormControl>
                                  <Input {...field} autoComplete="name" placeholder="Jordan Smith" className="pl-9" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Name</FormLabel>
                              <div className="relative">
                                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <FormControl>
                                  <Input {...field} autoComplete="organization" placeholder="Vision Centre Ltd" className="pl-9" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <FormControl>
                                  <Input {...field} type="email" autoComplete="email" spellCheck={false} placeholder="you@example.com" className="pl-9" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (optional)</FormLabel>
                              <div className="relative">
                                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <FormControl>
                                  <Input {...field} type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 246 555 0101" className="pl-9" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Tell us about your lab volume, specific services you need, or any questions…"
                                rows={4}
                                className="resize-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Sending…" : "Send Inquiry"}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        Ready to open an account now?{" "}
                        <Link to={signupHref} className="font-medium text-primary hover:underline">
                          Sign up in 2 minutes
                        </Link>
                      </p>
                    </form>
                  </Form>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default RxLabServicesPage;
