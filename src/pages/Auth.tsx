import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowRight, Building2, CheckCircle2, ChevronLeft, FileBadge, Globe, Lock, Mail, Phone, Stethoscope, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_OPTIONS } from "@/lib/locationOptions";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";
import { lovable } from "@/integrations/lovable/index";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  taxId: string;
  phone: string;
  country: string;
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

const intentOptions: Array<{ value: AuthIntent; label: string; description: string }> = [
  { value: "products", label: "Products", description: "Browse the catalog and trade pricing." },
  { value: "ordering", label: "Ordering", description: "Place orders and manage Rx jobs." },
  { value: "knowledge", label: "Knowledge", description: "Lens education and technical guides." },
  { value: "support", label: "Support", description: "Reach the right team for help." },
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
  const isReturningVisitor = mode === "signin";

  const form = useForm<AuthFormData>({
    defaultValues: {
      fullName: "",
      organizationName: "",
      taxId: "",
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
      form.setError("password", { message: "Must be at least 6 characters" });
      valid = false;
    }

    if (mode === "signup") {
      if (!values.fullName.trim()) {
        form.setError("fullName", { message: "Required" });
        valid = false;
      }
      if (!values.phone.trim()) {
        form.setError("phone", { message: "Required" });
        valid = false;
      }
      if (!audience) {
        valid = false;
        syncFlow({ step: "welcome", audience: null });
      }
      if (audience === "professional") {
        if (!values.organizationName.trim()) {
          form.setError("organizationName", { message: "Required to qualify for trade access" });
          valid = false;
        }
        if (!values.taxId.trim()) {
          form.setError("taxId", { message: "Required to qualify for trade access" });
          valid = false;
        }
      }
    }

    return valid;
  };

  const sendLeadSignal = async (values: AuthFormData, currentAudience: AuthAudience, currentIntent: AuthIntent) => {
    if (leadSignalSent || currentAudience !== "professional") return;

    const notes = {
      audience: currentAudience,
      intent: currentIntent,
      tax_id: values.taxId.trim() || null,
      onboarding_completed_at: new Date().toISOString(),
      redirect,
    };

    const { error } = await supabase.from("public_inquiries").insert({
      inquiry_type: "auth_onboarding_interest",
      name: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || null,
      business_name: values.organizationName.trim() || null,
      message: "Professional signup completed onboarding qualification.",
      notes: JSON.stringify(notes),
      page_slug: "/auth",
      source_channel: "auth_onboarding",
    });

    if (!error) {
      setLeadSignalSent(true);
    }
  };

  const completeSignup = async (intentValue: AuthIntent) => {
    if (!validateDetails()) return;
    if (!audience) {
      syncFlow({ step: "welcome", audience: null });
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
        interestIntent: intentValue,
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

      await sendLeadSignal(values, audience, intentValue);

      setSuccessState({
        audience,
        intent: intentValue,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        redirect,
      });
      syncFlow({ step: "success", intent: intentValue });
      toast({
        title: "Account created",
        description: audience === "professional"
          ? "Trade qualification submitted. You can start browsing now."
          : "Welcome — your next steps are below.",
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
        toast({ title: "Welcome back", description: "You are signed in." });
        navigate(redirect, { replace: true });
      } catch {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Signup: professionals go to intent step, patients complete immediately
    if (audience === "patient") {
      await completeSignup(intent ?? "knowledge");
    } else {
      syncFlow({ step: "intent" });
    }
  };

  const handleCreateAccount = async () => {
    if (!intent) {
      toast({
        title: "Choose a priority",
        description: "Pick what you want to do first.",
        variant: "destructive",
      });
      return;
    }
    await completeSignup(intent);
  };

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

  // Use a clean origin redirect for OAuth — the Lovable broker allowlist matches origin only,
  // and post-auth navigation is handled by the user-effect above (navigates to `redirect`).
  const oAuthRedirectUri = window.location.origin;

  const headingText = mode === "signin"
    ? "Welcome back"
    : currentStep === "welcome"
      ? "Choose the path that fits you best."
      : currentStep === "details"
        ? selectedAudience === "professional"
          ? "Create your trade account."
          : "Create your account."
        : currentStep === "intent"
          ? "Tell us what you want to do first."
          : "You’re exactly where you need to be.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content" className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-6 sm:py-8">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <img src={cleanLogoSmooth} alt="Classic Visions" className="h-5 w-5" width={20} height={20} />
              </span>
              <span className="text-sm font-semibold">Classic Visions</span>
            </Link>
            {mode === "signup" && currentStep !== "welcome" && currentStep !== "success" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => syncFlow({
                  step: currentStep === "intent" ? "details" : "welcome",
                  audience: currentStep === "details" ? null : audience,
                })}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : null}
          </div>

          <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">{headingText}</h1>
          {mode === "signup" && currentStep === "details" && selectedAudience === "professional" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Business details qualify you for trade pricing and immediate ordering.
            </p>
          ) : null}

          {/* Step body */}
          {mode === "signup" && currentStep === "welcome" ? (
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                aria-pressed={audience === "professional"}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  audience === "professional"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
                onClick={() => goToSignup("professional")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <h3 className="text-sm font-semibold">Optical store, clinic, lab, or business buyer</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Trade pricing, ordering, follow-up.</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
              </button>

              <button
                type="button"
                aria-pressed={audience === "patient"}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  audience === "patient"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
                onClick={() => goToSignup("patient")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <h3 className="text-sm font-semibold">Individual visitor looking for lens guidance</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Education, retailer help, no obligation to buy.</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
              </button>
            </div>
          ) : currentStep === "success" ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-success">Onboarding Complete</p>
                    <h3 className="mt-1 text-base font-semibold">
                      {successState?.fullName ? `${successState.fullName}, you’re all set.` : "You’re all set."}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {successAudience === "professional"
                        ? "Your trade account is active — start browsing the catalog or place an order."
                        : "Explore lens guidance and retailer help below."}
                      {successIntent === "products" ? " Your product interest is noted for follow-up." : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {successActions.map((action) => (
                  <Button key={action.label} variant={action.variant} size="sm" asChild>
                    <Link to={action.to}>{action.label}</Link>
                  </Button>
                ))}
                {successState?.redirect && successState.redirect !== "/" ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={successState.redirect}>Continue to your requested page</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleContinueFromDetails)} className="mt-5 space-y-3" noValidate>
                {mode === "signup" ? (
                  <>
                    <FormField
                      control={form.control}
                      name="fullName"
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

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{selectedAudience === "professional" ? "Business Name" : "Organization (optional)"}</FormLabel>
                            <div className="relative">
                              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                              <FormControl>
                                <Input
                                  {...field}
                                  autoComplete="organization"
                                  placeholder={selectedAudience === "professional" ? "Vision Center Ltd" : "Optional"}
                                  className="pl-9"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {selectedAudience === "professional" ? (
                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax / Business Registration #</FormLabel>
                            <div className="relative">
                              <FileBadge className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                              <FormControl>
                                <Input {...field} autoComplete="off" placeholder="e.g. VAT / TIN / business reg #" className="pl-9" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                  </>
                ) : null}

                <div className="grid gap-3">

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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              autoComplete={mode === "signin" ? "current-password" : "new-password"}
                              placeholder={mode === "signin" ? "Your password" : "Min. 6 characters"}
                              className="pl-9"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {mode === "signup" && currentStep === "intent" ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <RadioGroup
                      value={intent ?? ""}
                      onValueChange={(value) => syncFlow({ intent: parseAuthIntent(value), step: "intent" })}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {intentOptions.map((option) => (
                        <label
                          key={option.value}
                          htmlFor={`intent-${option.value}`}
                          className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ${
                            intent === option.value ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-muted/50"
                          }`}
                        >
                          <RadioGroupItem id={`intent-${option.value}`} value={option.value} aria-label={option.label} className="mt-0.5" />
                          <div>
                            <p className="text-sm font-medium leading-none">{option.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                ) : null}

                <Button
                  type={mode === "signup" && currentStep === "intent" ? "button" : "submit"}
                  size="default"
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

                {mode === "signin" ? (
                  <button
                    type="button"
                    className="block text-xs font-medium text-primary hover:underline"
                    onClick={async () => {
                      const email = form.getValues("email").trim();
                      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
                        return;
                      }
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) throw error;
                        toast({ title: "Reset email sent", description: `Check ${email} for a reset link.` });
                      } catch {
                        toast({ title: "Error", description: "Failed to send reset email.", variant: "destructive" });
                      }
                    }}
                  >
                    Forgot your password?
                  </button>
                ) : null}
              </form>
            </Form>
          )}

          {currentStep !== "success" ? (
            <>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                {mode === "signin" ? (
                  <span>
                    New here?{" "}
                    <button type="button" onClick={() => goToSignup()} className="font-semibold text-primary hover:underline">
                      Create an account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{" "}
                    <button type="button" onClick={() => syncFlow({ mode: "signin", step: "details" })} className="font-semibold text-primary hover:underline">
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default Auth;
