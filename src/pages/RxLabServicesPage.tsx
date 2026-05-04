import { Link } from "react-router";
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
  HeadphonesIcon,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createAuthHref } from "@/lib/authFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
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

const signupHref = createAuthHref({
  mode: "signup",
  audience: "professional",
  intent: "ordering",
  redirect: "/rx-lab-services",
});

const ACCOUNT_URL = "https://www.classicvisions.net/profile/account";
const HELPDESK_URL = "https://www.classicvisions.net/profile/helpdesk";
const CUSTOMER_SERVICE_PATH = "/professionals/customer-service";

const RxLabServicesPage = () => {
  const { user } = useAuth();
  const { isCustomer } = useUserRole();

  const isLoggedInCustomer = !!user && isCustomer;

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
                  <a href={ACCOUNT_URL}>
                    Go to My Account
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  {isLoggedInCustomer ? (
                    <a href={HELPDESK_URL}>Send an Inquiry</a>
                  ) : (
                    <a href="#inquiry">Send an Inquiry</a>
                  )}
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
                  {isLoggedInCustomer ? (
                    <>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                        Your account is active
                      </p>
                      <h3 className="mb-2 text-xl font-bold">Welcome back</h3>
                      <p className="mb-6 text-sm text-muted-foreground">
                        You have an active trade account. Access LabLink ordering, manage jobs,
                        and view your pricing through your account portal.
                      </p>
                      <Button variant="hero" className="w-full" asChild>
                        <a href={ACCOUNT_URL}>
                          Go to My Account
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </Button>
                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        Need help?{" "}
                        <a href={HELPDESK_URL} className="font-medium text-primary hover:underline">
                          Visit the helpdesk
                        </a>
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Inquiry / support CTA */}
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

              <div className="rounded-2xl border border-border bg-card p-8 shadow-soft text-center">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent">
                  <HeadphonesIcon className="h-7 w-7 text-accent-foreground" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Send an Inquiry</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  {isLoggedInCustomer
                    ? "Submit a support ticket through your helpdesk and our lab team will follow up within one business day."
                    : "Visit our customer service page to send us your details. Our lab team will follow up within one business day."}
                </p>
                <Button className="w-full" asChild>
                  {isLoggedInCustomer ? (
                    <a href={HELPDESK_URL}>
                      Send an Inquiry
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link to={CUSTOMER_SERVICE_PATH}>
                      Send an Inquiry
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </Button>
                {!isLoggedInCustomer && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Ready to open an account now?{" "}
                    <Link to={signupHref} className="font-medium text-primary hover:underline">
                      Sign up in 2 minutes
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default RxLabServicesPage;
