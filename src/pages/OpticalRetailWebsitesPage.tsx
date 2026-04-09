import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, ExternalLink, Monitor, Smartphone } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const demoUrl = "https://optician-site.lovable.app";

const featureCatalog = [
  { id: "custom-branding", label: "Custom branding setup", price: 350 },
  { id: "appointment-booking", label: "Appointment booking integration", price: 500 },
  { id: "product-showcase", label: "Frames & lens product showcase", price: 400 },
  { id: "seo-foundation", label: "Local SEO foundation", price: 300 },
  { id: "analytics", label: "Analytics & conversion tracking", price: 250 },
  { id: "lead-capture", label: "Lead capture automation", price: 300 },
] as const;

const baseWebsitePrice = 1200;

const subscriptionCatalog = [
  { id: "domain", label: "Domain registration & DNS management", monthlyPrice: 20 },
  { id: "maintenance", label: "Website maintenance & updates", monthlyPrice: 80 },
  { id: "support", label: "Ongoing support", monthlyPrice: 200 },
] as const;

const subscriptionTerms = [
  { value: "1", label: "1 year", description: "Good for launch-year budgeting and annual review." },
  { value: "2", label: "2 years", description: "Keeps the recurring plan visible across a longer rollout." },
  { value: "3", label: "3 years", description: "Shows a fuller ownership picture before you commit." },
] as const;

const promisePoints = [
  "Showcase frames, lens categories, services, and promotions without looking like a generic template.",
  "Turn more website traffic into appointments, quote requests, and walk-in conversations your staff can close.",
  "Start with a live demo, then submit a scoped intake with an instant budget estimate.",
];

const workflowSteps = [
  {
    title: "Review the live demo",
    description: "Preview the retail website on desktop and mobile so you can evaluate layout, merchandising, and conversion flow before committing.",
  },
  {
    title: "Scope your intake",
    description: "Tell us about your store, launch timeline, and must-have features so the build reflects how your optical business actually sells.",
  },
  {
    title: "Get an instant estimate",
    description: "As you choose features, the page updates the estimate immediately so you can plan budget before final scoping.",
  },
];

const quoteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  businessName: z
    .string()
    .trim()
    .min(1, "Business name is required")
    .max(120, "Business name must be less than 120 characters"),
  email: z.string().trim().email("Enter a valid email").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  timeline: z.string().trim().min(1, "Timeline is required").max(100, "Timeline must be less than 100 characters"),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
  features: z.array(z.string()).min(1, "Select at least one feature"),
  subscriptionTermYears: z.enum(["1", "2", "3"]),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const OpticalRetailWebsitesPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt, setStartedAt] = useState("");

  useEffect(() => {
    setStartedAt(new Date().toISOString());
  }, []);

  const sourcePage = useMemo(() => {
    if (typeof window === "undefined") return "/optical-retail-websites";
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }, []);

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      phone: "",
      timeline: "Within 30 days",
      notes: "",
      features: ["custom-branding", "appointment-booking", "product-showcase"],
      subscriptionTermYears: "1",
    },
  });

  const selectedFeatures = form.watch("features");
  const selectedSubscriptionTermYears = Number(form.watch("subscriptionTermYears"));

  const selectedFeatureItems = useMemo(
    () => featureCatalog.filter((feature) => selectedFeatures?.includes(feature.id)),
    [selectedFeatures],
  );

  const upfrontQuote = useMemo(() => {
    const featuresTotal = selectedFeatureItems.reduce((sum, feature) => sum + feature.price, 0);
    return baseWebsitePrice + featuresTotal;
  }, [selectedFeatureItems]);

  const subscriptionMonthlyTotal = useMemo(
    () => subscriptionCatalog.reduce((sum, item) => sum + item.monthlyPrice, 0),
    [],
  );

  const subscriptionAnnualTotal = subscriptionMonthlyTotal * 12;
  const subscriptionTermTotal = subscriptionAnnualTotal * selectedSubscriptionTermYears;
  const firstYearTotal = upfrontQuote + subscriptionAnnualTotal;
  const selectedTermTotal = upfrontQuote + subscriptionTermTotal;

  const onSubmit = async (values: QuoteFormData) => {
    if (honeypot) return;

    setIsSubmitting(true);

    try {
      const featureSummary = selectedFeatureItems.map((feature) => `- ${feature.label} (${currency.format(feature.price)})`).join("\n");
      const subscriptionSummary = subscriptionCatalog
        .map((item) => `- ${item.label} (${currency.format(item.monthlyPrice)}/month)`)
        .join("\n");
      const payloadMessage = [
        "Website design intake submitted.",
        `Business: ${values.businessName}`,
        `Timeline: ${values.timeline}`,
        "",
        "Selected features:",
        featureSummary,
        "",
        `Upfront website estimate: ${currency.format(upfrontQuote)} (USD estimate)`,
        "",
        `Subscription term selected: ${values.subscriptionTermYears} year(s)`,
        "Monthly recurring plan:",
        subscriptionSummary,
        "",
        `Recurring total per month: ${currency.format(subscriptionMonthlyTotal)}`,
        `Recurring total per year: ${currency.format(subscriptionAnnualTotal)}`,
        `Recurring total over ${values.subscriptionTermYears} year(s): ${currency.format(subscriptionAnnualTotal * Number(values.subscriptionTermYears))}`,
        `Combined first-year estimate: ${currency.format(firstYearTotal)}`,
        values.notes ? "" : null,
        values.notes ? "Additional notes:" : null,
        values.notes || null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase.functions.invoke("contact-inquiry", {
        body: {
          inquiryType: "website-design-lead",
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          message: payloadMessage,
          pageSlug: sourcePage,
          sourceChannel: "website",
          honeypot,
          startedAt,
        },
      });

      if (error) throw error;

      toast({
        title: "Quote request sent",
        description: "Thanks! We received your intake and will follow up shortly.",
      });

      form.reset({
        name: "",
        businessName: "",
        email: "",
        phone: "",
        timeline: "Within 30 days",
        notes: "",
        features: ["custom-branding", "appointment-booking", "product-showcase"],
        subscriptionTermYears: "1",
      });
      setHoneypot("");
      setStartedAt(new Date().toISOString());
    } catch {
      toast({
        title: "Submission failed",
        description: "Please try again or email russell@classicvisions.net directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content">
        <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background px-4 py-16 lg:px-8 lg:py-20">
          <div className="container mx-auto max-w-6xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Optician Website Design</p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Build an optical retail website that looks credible, books appointments, and helps shoppers choose you faster.
            </h1>
            <p className="mt-5 max-w-3xl text-base text-muted-foreground sm:text-lg">
              We design focused websites for optical retailers, dispensaries, and clinics that need more than a brochure page. Use the live demo to inspect the experience, then submit a custom intake with an instant estimate for a similar build.
            </p>
            <ul className="mt-6 grid max-w-5xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {promisePoints.map((point) => (
                <li key={point} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg">
                    Preview Live Demo <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-hidden p-0">
                  <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle>Optician Website Demo</DialogTitle>
                    <DialogDescription>
                      Review the live demo without leaving this page. Switch between desktop and mobile views to evaluate how the site would feel for optical shoppers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="px-4 pb-4">
                    <Tabs defaultValue="desktop" className="w-full">
                      <TabsList className="mb-4 mt-2">
                        <TabsTrigger value="desktop" className="gap-1.5"><Monitor className="h-4 w-4" /> Desktop</TabsTrigger>
                        <TabsTrigger value="mobile" className="gap-1.5"><Smartphone className="h-4 w-4" /> Mobile</TabsTrigger>
                      </TabsList>
                      <TabsContent value="desktop">
                        <div className="h-[70vh] overflow-hidden rounded-lg border bg-muted/10">
                          <iframe title="Optician demo website desktop view" src={demoUrl} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                        </div>
                      </TabsContent>
                      <TabsContent value="mobile">
                        <div className="flex h-[70vh] items-start justify-center overflow-auto rounded-lg border bg-muted/10 p-4">
                          <div className="h-[640px] w-[360px] overflow-hidden rounded-[2rem] border-8 border-foreground/10 bg-background shadow-lg">
                            <iframe title="Optician demo website mobile view" src={demoUrl} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="lg" asChild>
                <a href={demoUrl} target="_blank" rel="noreferrer">
                  Open Demo in New Tab <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="px-4 py-10 lg:px-8">
          <div className="container mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-3xl border border-border/60 bg-card/80 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Step {index + 1}</p>
                <h2 className="mt-3 text-xl font-semibold text-foreground">{step.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-12 lg:px-8 lg:py-16">
          <div className="container mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Build your optical website package</CardTitle>
                <CardDescription>
                  Choose the features your store actually needs. We update the estimate instantly and send the intake to our team for final scoping.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                    <div className="absolute h-0 overflow-hidden opacity-0" aria-hidden="true" tabIndex={-1}>
                      <label htmlFor="website_url">Website</label>
                      <input
                        id="website_url"
                        name="website_url"
                        type="text"
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        tabIndex={-1}
                      />
                      <label htmlFor="started_at">Started at</label>
                      <input id="started_at" name="started_at" type="text" value={startedAt} readOnly tabIndex={-1} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jordan Smith" {...field} />
                            </FormControl>
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
                            <FormControl>
                              <Input placeholder="Acme Vision Center" {...field} />
                            </FormControl>
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
                            <FormControl>
                              <Input type="email" placeholder="owner@acmevision.com" {...field} />
                            </FormControl>
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
                            <FormControl>
                              <Input type="tel" placeholder="+1 555 123 4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="timeline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desired launch timeline</FormLabel>
                          <FormControl>
                            <Input placeholder="Before summer campaign" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="features"
                      render={() => (
                        <FormItem>
                          <FormLabel>Feature selections</FormLabel>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {featureCatalog.map((feature) => (
                              <FormField
                                key={feature.id}
                                control={form.control}
                                name="features"
                                render={({ field }) => {
                                  const checked = field.value?.includes(feature.id);
                                  return (
                                    <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                                      <FormControl>
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={(isChecked) => {
                                            const nextValue = isChecked
                                              ? [...(field.value ?? []), feature.id]
                                              : (field.value ?? []).filter((value) => value !== feature.id);
                                            field.onChange(nextValue);
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="cursor-pointer text-sm font-medium">{feature.label}</FormLabel>
                                        <p className="text-xs text-muted-foreground">{currency.format(feature.price)}</p>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subscriptionTermYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domains, maintenance, and support plan</FormLabel>
                          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                            <p className="text-sm text-muted-foreground">
                              This recurring quote is shown separately from the build cost so you can see the upfront investment and the annual operating cost clearly.
                            </p>
                            <div className="mt-4 grid gap-2">
                              {subscriptionCatalog.map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
                                  <span className="text-muted-foreground">{item.label}</span>
                                  <span className="font-medium">{currency.format(item.monthlyPrice)}/mo</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-5">
                              <p className="text-sm font-medium text-foreground">Choose subscription term</p>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="mt-3 grid gap-3 sm:grid-cols-3"
                              >
                                {subscriptionTerms.map((term) => (
                                  <label
                                    key={term.value}
                                    htmlFor={`subscription-term-${term.value}`}
                                    className="flex cursor-pointer gap-3 rounded-xl border border-border/70 bg-background p-4 transition-colors hover:border-primary/50"
                                  >
                                    <RadioGroupItem id={`subscription-term-${term.value}`} value={term.value} className="mt-0.5" />
                                    <span className="space-y-1">
                                      <span className="block text-sm font-medium text-foreground">{term.label}</span>
                                      <span className="block text-xs leading-5 text-muted-foreground">{term.description}</span>
                                    </span>
                                  </label>
                                ))}
                              </RadioGroup>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anything else we should know? (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about your current website, brands you carry, services to highlight, and any booking, WhatsApp, or CRM integrations you need."
                              rows={4}
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send intake + quote request"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Instant estimate</CardTitle>
                <CardDescription>Fast budget guidance based on the scope you selected on this page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Base website package</span>
                    <span className="font-medium">{currency.format(baseWebsitePrice)}</span>
                  </div>
                  {selectedFeatureItems.map((feature) => (
                    <div key={feature.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{feature.label}</span>
                      <span className="font-medium">{currency.format(feature.price)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>Upfront website estimate</span>
                      <span>{currency.format(upfrontQuote)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Estimate shown in USD. Final pricing depends on integrations, number of pages, content migration, and launch readiness.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-sm font-semibold text-foreground">Recurring subscription quote</p>
                    <div className="mt-3 space-y-2">
                      {subscriptionCatalog.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{currency.format(item.monthlyPrice)}/mo</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Monthly recurring total</span>
                        <span className="font-medium">{currency.format(subscriptionMonthlyTotal)}/mo</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Yearly recurring total</span>
                        <span className="font-medium">{currency.format(subscriptionAnnualTotal)}/yr</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Recurring total for selected {selectedSubscriptionTermYears}-year term</span>
                        <span className="font-medium">{currency.format(subscriptionTermTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Upfront + first year</span>
                      <span className="font-semibold text-foreground">{currency.format(firstYearTotal)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Upfront + selected term total</span>
                      <span className="font-semibold text-foreground">{currency.format(selectedTermTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What&apos;s included in every build</CardTitle>
                  <CardDescription>Baseline deliverables for optical retailers who want a polished, conversion-ready site.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "Responsive layouts that hold up on desktop, tablet, and mobile",
                      "Strong appointment, quote, and contact call-to-actions across the site",
                      "Service and product positioning for eye exams, frames, lenses, coatings, and promotions",
                      "Performance-first page structure with local SEO foundations",
                      "Brand-consistent visual styling for your practice, store, or clinic",
                      "Lead intake routing that can plug into booking or CRM workflows",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <Button variant="ghost" className="px-0" asChild>
                      <Link to="/#products">
                        Back to product tiles <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OpticalRetailWebsitesPage;
