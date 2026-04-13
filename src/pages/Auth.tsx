import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowRight, Building2, CheckCircle2, ChevronLeft, Lock, Mail, Phone, ShieldCheck, Sparkles, Stethoscope, User, Users } from "lucide-react";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";
import { lovable } from "@/integrations/lovable/index";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import {
  type AuthAudience,
  type AuthIntent,
  type AuthMode,
  type AuthStep,
  createAuthHref,
  getDefaultAuthStep,
  getSafeAuthRedirect,
  parseAuthIntent,
  readAuthFlowState,
} from "@/lib/authFlow";

type AuthFormData = {
  fullName: string;
  organizationName: string;
  phone: string;
  email: string;
  password: string;
};

type SuccessState = {
  audience: AuthAudience;
  intent: AuthIntent;
  fullName: string;
  email: string;
  redirect: string;
};

const audienceCopy: Record<AuthAudience, {
  badge: string;
  heading: string;
  intro: string;
  quickWins: string[];
  detailHeading: string;
  detailBody: string;
  expectationHeading: string;
  expectationBody: string;
}> = {
  professional: {
    badge: "Professional Path",
    heading: "Unlock trade pricing, product visibility, and faster next steps.",
    intro: "For optical stores, clinics, and teams that need to compare products, move toward ordering, and get a follow-up path that feels business-ready.",
    quickWins: [
      "See where to browse products and pricing next.",
      "Get tailored follow-up expectations for your trade interest.",
      "Move from first visit to meaningful value without a detour.",
    ],
    detailHeading: "What you unlock first",
    detailBody: "Create your account in a few quick fields, choose what you want help with, and we will point you to the best next action immediately.",
    expectationHeading: "What to expect next",
    expectationBody: "You will be able to continue into product discovery right away, and if you asked about products, your interest will be visible for follow-up.",
  },
  patient: {
    badge: "Patient Path",
    heading: "Get comfortable quickly and find the right lens guidance faster.",
    intro: "For individual visitors who want straightforward product education, retailer guidance, and a first experience that feels welcoming instead of technical.",
    quickWins: [
      "Learn the basics without trade-account friction.",
      "Get guided toward lens comparisons and retailer help.",
      "Reach your first “this is useful” moment in a few steps.",
    ],
    detailHeading: "What you unlock first",
    detailBody: "Set up your account, tell us what you are exploring, and we will send you to the clearest next resource instead of making you guess.",
    expectationHeading: "What to expect next",
    expectationBody: "You will get an immediate success state with simple next actions so you can keep learning or find care with confidence.",
  },
};

const intentOptions: Array<{ value: AuthIntent; label: string; description: string }> = [
  { value: "products", label: "Products", description: "Show the most relevant products and explain what to expect next." },
  { value: "knowledge", label: "Knowledge", description: "Point you to the clearest educational and support content first." },
  { value: "support", label: "Support", description: "Help you reach the right support path quickly." },
  { value: "ordering", label: "Ordering", description: "Guide you toward the fastest next steps for access and order readiness." },
];

const signupSteps: Array<{ key: AuthStep; label: string }> = [
  { key: "welcome", label: "Choose Path" },
  { key: "details", label: "Create Account" },
  { key: "intent", label: "Set Priorities" },
  { key: "success", label: "You’re Set" },
];

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [leadSignalSent, setLeadSignalSent] = useState(false);

  const flowState = useMemo(() => readAuthFlowState(new URLSearchParams(location.search)), [location.search]);
  const mode = flowState.mode;
  const audience = flowState.audience;
  const intent = flowState.intent;
  const requestedStep = flowState.step;
  const redirect = useMemo(() => {
    const rawRedirect = new URLSearchParams(location.search).get("redirect");
    const stateRedirect = location.state?.from?.pathname;
    return getSafeAuthRedirect(rawRedirect || stateRedirect || "/");
  }, [location.search, location.state]);

  const currentStep = useMemo<AuthStep>(() => {
    if (requestedStep) return requestedStep;
    return getDefaultAuthStep({ mode, audience });
  }, [requestedStep, mode, audience]);

  const selectedAudience = audience ?? "professional";
  const selectedCopy = audienceCopy[selectedAudience];
  const isReturningVisitor = mode === "signin";

  const form = useForm<AuthFormData>({
    defaultValues: {
      fullName: "",
      organizationName: "",
      phone: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    if (mode === "signup" && currentStep === "success") return;
    navigate(redirect, { replace: true });
  }, [user, mode, currentStep, navigate, redirect]);

  const syncFlow = (next: {
    mode?: AuthMode;
    audience?: AuthAudience | null;
    intent?: AuthIntent | null;
    step?: AuthStep | null;
    redirect?: string;
  }) => {
    const href = createAuthHref({
      mode: next.mode ?? mode,
      audience: next.audience !== undefined ? next.audience : audience,
      intent: next.intent !== undefined ? next.intent : intent,
      step: next.step !== undefined ? next.step : currentStep,
      redirect: next.redirect ?? redirect,
    });

    startTransition(() => {
      navigate(href, { replace: true });
    });
  };

  const goToSignup = (nextAudience?: AuthAudience) => {
    syncFlow({
      mode: "signup",
      audience: nextAudience ?? audience,
      step: nextAudience || audience ? "details" : "welcome",
      intent: intent ?? null,
    });
  };

  const validateDetails = () => {
    form.clearErrors();
    const values = form.getValues();
    let valid = true;

    if (!values.email.trim()) {
      form.setError("email", { message: "Email is required" });
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      form.setError("email", { message: "Please enter a valid email address" });
      valid = false;
    }

    if (!values.password.trim()) {
      form.setError("password", { message: "Password is required" });
      valid = false;
    } else if (values.password.trim().length < 6) {
      form.setError("password", { message: "Password must be at least 6 characters" });
      valid = false;
    }

    if (mode === "signup") {
      if (!values.fullName.trim()) {
        form.setError("fullName", { message: "Full name is required" });
        valid = false;
      }
      if (!values.phone.trim()) {
        form.setError("phone", { message: "Phone number is required" });
        valid = false;
      }
      if (!audience) {
        valid = false;
        syncFlow({ step: "welcome", audience: null });
      }
    }

    return valid;
  };

  const sendLeadSignal = async (values: AuthFormData, currentAudience: AuthAudience, currentIntent: AuthIntent) => {
    if (leadSignalSent || currentAudience !== "professional" || currentIntent !== "products") return;

    const notes = {
      audience: currentAudience,
      intent: currentIntent,
      onboarding_completed_at: new Date().toISOString(),
      redirect,
    };

    const { error } = await supabase.from("public_inquiries").insert({
      inquiry_type: "auth_onboarding_interest",
      name: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || null,
      business_name: values.organizationName.trim() || null,
      message: "Professional signup selected product interest during onboarding.",
      notes: JSON.stringify(notes),
      page_slug: "/auth",
      source_channel: "auth_onboarding",
    });

    if (!error) {
      setLeadSignalSent(true);
    }
  };

  const handleContinueFromDetails = async (values: AuthFormData) => {
    if (!validateDetails()) return;

    if (mode === "signin") {
      setIsSubmitting(true);
      try {
        const { error } = await signIn(values.email.trim(), values.password.trim());
        if (error) {
          toast({
            title: "Sign In Failed",
            description: error.message.includes("Invalid login credentials")
              ? "Invalid email or password. Please try again."
              : error.message,
            variant: "destructive",
          });
          return;
        }

        toast({ title: "Welcome back", description: "You are signed in and ready to continue." });
        navigate(redirect, { replace: true });
      } catch {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    syncFlow({ step: "intent" });
  };

  const handleCreateAccount = async () => {
    if (!validateDetails()) return;
    if (!audience) {
      syncFlow({ step: "welcome", audience: null });
      return;
    }
    if (!intent) {
      toast({
        title: "Choose a priority",
        description: "Select what you want help with so we can tailor the next step.",
        variant: "destructive",
      });
      return;
    }

    const values = form.getValues();
    setIsSubmitting(true);
    try {
      const onboardingCompletedAt = new Date().toISOString();
      const { error } = await signUp(values.email.trim(), values.password.trim(), {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        organizationName: values.organizationName.trim() || undefined,
        audience,
        interestIntent: intent,
        onboardingCompletedAt,
      });

      if (error) {
        toast({
          title: error.message.includes("User already registered") ? "Account Exists" : "Sign Up Failed",
          description: error.message.includes("User already registered")
            ? "This email is already registered. Please sign in instead."
            : error.message,
          variant: "destructive",
        });
        return;
      }

      await sendLeadSignal(values, audience, intent);

      setSuccessState({
        audience,
        intent,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        redirect,
      });
      syncFlow({ step: "success" });
      toast({
        title: "Account created",
        description: "Your onboarding is ready. Choose your next best action below.",
      });
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressValue = useMemo(() => {
    const index = signupSteps.findIndex((step) => step.key === currentStep);
    return index < 0 ? 25 : ((index + 1) / signupSteps.length) * 100;
  }, [currentStep]);

  const successAudience = successState?.audience ?? audience ?? "professional";
  const successIntent = successState?.intent ?? intent ?? "knowledge";

  const successActions = successAudience === "professional"
    ? [
        { label: "Browse Catalog", to: "/store", variant: "default" as const },
        { label: "View Knowledge Hub", to: "/knowledge", variant: "outline" as const },
        { label: "Request Trade Follow-up", to: "/professionals/trade-account", variant: "outline" as const },
      ]
    : [
        { label: "Compare Lens Options", to: "/patients/lens-differences", variant: "default" as const },
        { label: "Find a Retailer", to: "/find-a-retailer", variant: "outline" as const },
        { label: "Explore Knowledge Hub", to: "/knowledge", variant: "outline" as const },
      ];

  const oAuthRedirectHref = createAuthHref({
    mode,
    audience,
    intent,
    step: mode === "signup" ? "success" : null,
    redirect,
  });

  const oAuthRedirectUri = `${window.location.origin}${oAuthRedirectHref}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(45_85%_65%/_0.25),_transparent_30%),linear-gradient(180deg,_hsl(210_33%_97%)_0%,_hsl(214_36%_94%)_100%)]">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <main id="main-content" className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 lg:px-8">
        <div className={`w-full ${isReturningVisitor ? "mx-auto max-w-[28rem]" : "grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"}`}>
          {!isReturningVisitor ? (
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="inline-flex items-center gap-3 text-foreground">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <img src={cleanLogoSmooth} alt="Classic Visions" className="h-7 w-7" width={28} height={28} />
                </span>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-primary">Classic Visions</span>
                  <span className="block text-lg font-semibold">Visitor Onboarding</span>
                </span>
              </Link>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
                New Visitor Flow
              </Badge>
            </div>
...
          <section className={`${isReturningVisitor ? "rounded-[1.75rem] p-4 sm:p-5" : "rounded-[2rem] p-6 sm:p-8"} border border-slate-950/10 bg-slate-950 text-white shadow-medium`}>
            <div className={`mx-auto flex ${isReturningVisitor ? "max-w-sm" : "max-w-lg"} flex-col`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  {isReturningVisitor ? (
                    <Link to="/" className="inline-flex items-center gap-3 text-white">
                      <span className={`flex items-center justify-center rounded-2xl bg-white/10 ${isReturningVisitor ? "h-9 w-9" : "h-11 w-11"}`}>
                        <img
                          src={cleanLogoSmooth}
                          alt="Classic Visions"
                          className={isReturningVisitor ? "h-5 w-5" : "h-6 w-6"}
                          width={isReturningVisitor ? 20 : 24}
                          height={isReturningVisitor ? 20 : 24}
                        />
                      </span>
                      <span>
                        <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Classic Visions</span>
                        <span className={`block font-semibold text-white ${isReturningVisitor ? "text-base" : "text-lg"}`}>Visitor Sign-In</span>
                      </span>
                    </Link>
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                    {mode === "signup" ? "Onboarding" : "Authentication"}
                  </p>
                  <h2 className={`mt-2 font-bold text-balance ${isReturningVisitor ? "text-2xl sm:text-3xl" : "text-3xl"}`}>
                    {mode === "signup"
                      ? currentStep === "welcome"
                        ? "Choose the path that fits you best."
                        : currentStep === "details"
                          ? "Create your account with the essentials."
                          : currentStep === "intent"
                            ? "Tell us what you want to do first."
                            : "You’re exactly where you need to be."
                      : "Welcome back"}
                  </h2>
                </div>
                {mode === "signup" && currentStep !== "welcome" && currentStep !== "success" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                    onClick={() => syncFlow({ step: currentStep === "intent" ? "details" : "welcome", audience: currentStep === "details" ? null : audience })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : null}
              </div>
              {mode === "signup" && currentStep === "welcome" ? (
                <div className="mt-8 space-y-4">
                  <button
                    type="button"
                    className={`w-full rounded-[1.5rem] border px-5 py-5 text-left transition-colors ${
                      audience === "professional"
                        ? "border-accent bg-white text-slate-950"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                    onClick={() => goToSignup("professional")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Professional
                        </div>
                        <h3 className="mt-4 text-xl font-semibold">Optical store, clinic, lab, or business buyer</h3>
                        <p className={`mt-2 text-sm leading-6 ${audience === "professional" ? "text-slate-700" : "text-white/70"}`}>
                          Focus on product discovery, pricing access, ordering readiness, and coordinated follow-up.
                        </p>
                      </div>
                      <ArrowRight className={`h-5 w-5 shrink-0 ${audience === "professional" ? "text-primary" : "text-white/60"}`} aria-hidden="true" />
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`w-full rounded-[1.5rem] border px-5 py-5 text-left transition-colors ${
                      audience === "patient"
                        ? "border-accent bg-white text-slate-950"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                    onClick={() => goToSignup("patient")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                          <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                          Patient
                        </div>
                        <h3 className="mt-4 text-xl font-semibold">Individual visitor looking for lens guidance</h3>
                        <p className={`mt-2 text-sm leading-6 ${audience === "patient" ? "text-slate-700" : "text-white/70"}`}>
                          Focus on simple education, retailer guidance, and finding the right next resource quickly.
                        </p>
                      </div>
                      <ArrowRight className={`h-5 w-5 shrink-0 ${audience === "patient" ? "text-primary" : "text-white/60"}`} aria-hidden="true" />
                    </div>
                  </button>
                </div>
              ) : currentStep === "success" ? (
                <div className="mt-8 space-y-6">
                  <div className="rounded-[1.75rem] border border-emerald-400/25 bg-emerald-400/10 p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-300" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Onboarding Complete</p>
                        <h3 className="mt-2 text-2xl font-semibold">
                          {successState?.fullName ? `${successState.fullName}, you’re all set.` : "You’re all set."}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-white/75">
                          {audienceCopy[successAudience].expectationBody}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">What Happens Next</p>
                      <h3 className="mt-2 text-xl font-semibold">{audienceCopy[successAudience].expectationHeading}</h3>
                    </div>
                    <ul className="space-y-3 text-sm leading-6 text-white/75">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        <span>You can move straight into your next best action without a generic detour.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        <span>
                          {successIntent === "products"
                            ? "Your product interest has been captured so the follow-up path can be more relevant."
                            : "Your selected priority is now shaping the next recommendations you see here."}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        <span>
                          {successAudience === "professional"
                            ? "If you need trade follow-up, the account request path is one click away."
                            : "If you need help choosing lenses or finding care, the most relevant paths are below."}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid gap-3">
                    {successActions.map((action) => (
                      <Button key={action.label} variant={action.variant} size="lg" asChild>
                        <Link to={action.to}>{action.label}</Link>
                      </Button>
                    ))}
                    {successState?.redirect && successState.redirect !== "/" ? (
                      <Button variant="ghost" size="lg" asChild className="text-white hover:bg-white/10 hover:text-white">
                        <Link to={successState.redirect}>Continue to your requested page</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleContinueFromDetails)} className="mt-8 space-y-5" noValidate>
                    {mode === "signup" ? (
                      <>
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                          <p className="text-sm font-semibold text-white">{selectedAudience === "professional" ? "Professional onboarding" : "Patient onboarding"}</p>
                          <p className="mt-1 text-sm leading-6 text-white/70">
                            {selectedAudience === "professional"
                              ? "We will keep this short, then guide you into products, knowledge, support, or ordering."
                              : "We will keep this simple, then guide you into product education, support, or retailer discovery."}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            className="mt-3 px-0 text-white hover:bg-transparent hover:text-accent"
                            onClick={() => syncFlow({ step: "welcome", audience: null })}
                          >
                            Change audience
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/85">Full Name</FormLabel>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                                <FormControl>
                                  <Input
                                    {...field}
                                    autoComplete="name"
                                    placeholder="Jordan Smith…"
                                    className="border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/35"
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white/85">Phone Number</FormLabel>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="tel"
                                      inputMode="tel"
                                      autoComplete="tel"
                                      placeholder="+1 246 555 0101…"
                                      className="border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/35"
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="organizationName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white/85">
                                  {selectedAudience === "professional" ? "Business Name" : "Organization (optional)"}
                                </FormLabel>
                                <div className="relative">
                                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      autoComplete="organization"
                                      placeholder={selectedAudience === "professional" ? "Vision Center Ltd…" : "Optional…"}
                                      className="border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/35"
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    ) : null}

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/85">Email</FormLabel>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                autoComplete="email"
                                spellCheck={false}
                                placeholder="you@example.com…"
                                className="border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/35"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/85">Password</FormLabel>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                                placeholder="Create a secure password…"
                                className="border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/35"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {mode === "signup" && currentStep === "intent" ? (
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                        <div className="mb-4">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">First Priority</p>
                          <p className="mt-2 text-sm leading-6 text-white/75">
                            Tell us what matters most right now so we can personalize the first success state and reduce your time to value.
                          </p>
                        </div>
                        <RadioGroup
                          value={intent ?? ""}
                          onValueChange={(value) => syncFlow({ intent: parseAuthIntent(value), step: "intent" })}
                          className="gap-3"
                        >
                          {intentOptions.map((option) => (
                            <label
                              key={option.value}
                              htmlFor={`intent-${option.value}`}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                                intent === option.value ? "border-accent bg-white text-slate-950" : "border-white/10 bg-white/5 hover:bg-white/10"
                              }`}
                            >
                              <RadioGroupItem
                                id={`intent-${option.value}`}
                                value={option.value}
                                aria-label={option.label}
                                className={intent === option.value ? "border-primary text-primary" : "border-white/50 text-white"}
                              />
                              <div>
                                <p className="font-semibold">{option.label}</p>
                                <p className={`mt-1 text-sm leading-6 ${intent === option.value ? "text-slate-700" : "text-white/70"}`}>{option.description}</p>
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    ) : null}

                    <div className="grid gap-3">
                      <Button
                        type={mode === "signup" && currentStep === "intent" ? "button" : "submit"}
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting}
                        onClick={mode === "signup" && currentStep === "intent" ? handleCreateAccount : undefined}
                      >
                        {isSubmitting
                          ? "Please wait…"
                          : mode === "signin"
                            ? "Sign In"
                            : currentStep === "intent"
                              ? "Create Account"
                              : "Continue"}
                      </Button>

                    {mode === "signup" ? (
                        <p className="text-sm leading-6 text-white/60">
                          We only ask for what is needed to get you to the right next step quickly.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                            onClick={async () => {
                              const email = form.getValues("email").trim();
                              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                                toast({ title: "Enter your email", description: "Please enter your email address first, then click Forgot Password.", variant: "destructive" });
                                return;
                              }
                              try {
                                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                  redirectTo: `${window.location.origin}/reset-password`,
                                });
                                if (error) throw error;
                                toast({ title: "Reset email sent", description: `Check ${email} for a password reset link.` });
                              } catch {
                                toast({ title: "Error", description: "Failed to send reset email. Please try again.", variant: "destructive" });
                              }
                            }}
                          >
                            Forgot your password?
                          </button>
                          <p className="text-sm leading-6 text-white/60">
                            Sign in on-page and return to <span className="font-medium text-white">{redirect}</span> right after.
                          </p>
                        </div>
                      )}
                    </div>
                  </form>
                </Form>
              )}

              {currentStep !== "success" ? (
                <>
                  <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Or Continue With</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                      onClick={async () => {
                        const { error } = await lovable.auth.signInWithOAuth("google", {
                          redirect_uri: oAuthRedirectUri,
                          extraParams: {
                            scope: "openid email profile",
                          },
                        });
                        if (error) {
                          toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
                        }
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                      onClick={async () => {
                        const { error } = await lovable.auth.signInWithOAuth("apple", {
                          redirect_uri: oAuthRedirectUri,
                        });
                        if (error) {
                          toast({ title: "Apple Sign-In Failed", description: error.message, variant: "destructive" });
                        }
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Continue with Apple
                    </Button>
                  </div>

                  <div className="mt-6 text-center text-sm text-white/70">
                    {mode === "signin" ? (
                      <span>
                        New here?{" "}
                        <button type="button" onClick={() => goToSignup()} className="font-semibold text-white underline-offset-4 hover:text-accent hover:underline">
                          Start onboarding
                        </button>
                      </span>
                    ) : (
                      <span>
                        Already have an account?{" "}
                        <button type="button" onClick={() => syncFlow({ mode: "signin", step: "details" })} className="font-semibold text-white underline-offset-4 hover:text-accent hover:underline">
                          Sign in
                        </button>
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Auth;
