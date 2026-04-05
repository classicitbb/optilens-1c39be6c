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
  { id: "support-plan", label: "Monthly support plan (first month)", price: 200 },
] as const;

const baseWebsitePrice = 1200;

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
    },
  });

  const selectedFeatures = form.watch("features");

  const selectedFeatureItems = useMemo(
    () => featureCatalog.filter((feature) => selectedFeatures?.includes(feature.id)),
    [selectedFeatures],
  );

  const instantQuote = useMemo(() => {
    const featuresTotal = selectedFeatureItems.reduce((sum, feature) => sum + feature.price, 0);
    return baseWebsitePrice + featuresTotal;
  }, [selectedFeatureItems]);

  const onSubmit = async (values: QuoteFormData) => {
    if (honeypot) return;

    setIsSubmitting(true);

    try {
      const featureSummary = selectedFeatureItems.map((feature) => `- ${feature.label} (${currency.format(feature.price)})`).join("\n");
      const payloadMessage = [
        "Website design intake submitted.",
        `Business: ${values.businessName}`,
        `Timeline: ${values.timeline}`,
        "",
        "Selected features:",
        featureSummary,
        "",
        `Instant quote: ${currency.format(instantQuote)} (USD estimate)`,
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
              Launch a modern optical website that brings in appointment-ready leads.
            </h1>
            <p className="mt-5 max-w-3xl text-base text-muted-foreground sm:text-lg">
              This page expands the website design tile with a live demo preview and a custom intake flow so optical retailers can request a similar site with an instant estimate.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg">
                    View Demo in Popup <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-hidden p-0">
                  <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle>Optician Website Demo</DialogTitle>
                    <DialogDescription>
                      Preview the live demo without leaving this site. Use desktop/mobile tabs to inspect responsiveness.
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

        <section className="px-4 py-12 lg:px-8 lg:py-16">
          <div className="container mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Build your package</CardTitle>
                <CardDescription>
                  Pick the features you want. We estimate instantly and send your intake to our team for final scoping.
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
                            <Input placeholder="Within 30 days" {...field} />
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
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anything else we should know? (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about your current website, target markets, and required integrations."
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
                  <CardDescription>Indicative project pricing based on your selected features.</CardDescription>
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
                      <span>Estimated total</span>
                      <span>{currency.format(instantQuote)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Estimate shown in USD. Final quote depends on integrations, content migration, and launch scope.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What&apos;s included in every build</CardTitle>
                  <CardDescription>Core deliverables for professional optical retail websites.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "Responsive layouts for desktop, tablet, and mobile",
                      "Conversion-focused contact and appointment CTA placement",
                      "Performance-first page structure and technical SEO basics",
                      "Brand-consistent visual styling for your optical practice",
                      "Lead intake route that can be integrated with CRM workflows",
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
