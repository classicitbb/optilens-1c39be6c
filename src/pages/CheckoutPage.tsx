import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  Globe,
  Info,
  Loader2,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useCustomerAddresses, toProfileAddress } from "@/hooks/useCustomerAddresses";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_ADDRESS, type ProfileAddress, resolveUserFullName } from "@/lib/profileData";
import { cn } from "@/lib/utils";
import { createAuthHref } from "@/lib/authFlow";
import type { CheckoutFormData } from "@/components/CheckoutDialog";
import SecurityTrustBar from "@/components/checkout/SecurityTrustBar";
import { COUNTRY_OPTIONS, getStateOptionsByCountry } from "@/lib/locationOptions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string; icon: React.ElementType }[] = [
  { n: 1, label: "Contact", icon: Package },
  { n: 2, label: "Shipping", icon: Truck },
  { n: 3, label: "Payment", icon: CreditCard },
  { n: 4, label: "Review", icon: CheckCircle },
];

const OFFLINE_METHODS = [
  {
    id: "stripe_offline" as const,
    label: "Stripe",
    description: "Card or bank transfer via Stripe",
    icon: CreditCard,
  },
  {
    id: "firstpay_offline" as const,
    label: "1stPay",
    description: "Caribbean 1stPay payment network",
    icon: WalletCards,
  },
  {
    id: "bimpay_offline" as const,
    label: "BimPay",
    description: "Mobile payment via BimPay",
    icon: Globe,
  },
] as const;

type OfflineMethod = (typeof OFFLINE_METHODS)[number]["id"];
type PaymentMethod = "on_account" | OfflineMethod;

const emptyForm = (isB2B = false): CheckoutFormData => ({
  fullName: "",
  email: "",
  phone: "",
  shippingAddressId: null,
  billingAddressId: null,
  shippingAddress: { ...EMPTY_ADDRESS },
  billingAddress: { ...EMPTY_ADDRESS },
  checkoutMethod: isB2B ? "on_account" : "stripe_offline",
  paymentMethodId: null,
  savePaymentMethod: false,
  cardholderName: "",
  cardBrand: "",
  cardLast4: "",
  expiryMonth: new Date().getMonth() + 1,
  expiryYear: new Date().getFullYear() + 1,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      {message}
    </p>
  ) : null;

const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 flex items-center gap-3">
    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-secondary">
      {children}
    </span>
    <span className="h-px flex-1 bg-secondary/20" />
  </div>
);

const PickCard = ({
  selected,
  onClick,
  children,
  accent = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full rounded-lg border px-3.5 py-3 text-left transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected && !accent && "border-secondary bg-secondary/5 dark:bg-secondary/10",
      selected && accent && "border-primary bg-primary/5 dark:bg-primary/10",
      !selected && "border-border hover:border-secondary/60 bg-card",
    )}
    aria-pressed={selected}
  >
    {children}
  </button>
);

// ─── Order summary sidebar (shared across steps) ──────────────────────────────

const OrderSummarySidebar = ({
  items,
  totalPrice,
  shippingCost,
  isVerifiedB2B,
  poNumber,
  checkoutMethod,
}: {
  items: ReturnType<typeof useCartContext>["items"];
  totalPrice: number;
  shippingCost: number | null;
  isVerifiedB2B: boolean;
  poNumber: string;
  checkoutMethod: PaymentMethod;
}) => (
  <aside className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 lg:sticky lg:top-28">
    <h2 className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
      Order summary
    </h2>

    <div className="max-h-52 space-y-2.5 overflow-y-auto">
      {items.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
          <span className="text-foreground leading-snug">
            {item.product_name}
            <span className="ml-1 text-muted-foreground">× {item.quantity}</span>
          </span>
          <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
            ${(item.product_price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}
    </div>

    <Separator />

    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span className="font-mono">${totalPrice.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Shipping</span>
        <span className="font-mono">
          {shippingCost === 0 ? "Free" : shippingCost ? `$${shippingCost.toFixed(2)}` : "TBD"}
        </span>
      </div>
    </div>

    <Separator />

    <div className="flex items-baseline justify-between">
      <span className="font-semibold text-foreground">Total</span>
      <span className="font-mono text-base font-bold text-foreground">
        ${(totalPrice + (shippingCost ?? 0)).toFixed(2)}
        <span className="ml-1 font-mono text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
          USD
        </span>
      </span>
    </div>

    {poNumber && (
      <div className="rounded-md bg-muted/60 px-3 py-2 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
        PO: {poNumber}
        {isVerifiedB2B && (
          <>
            <br />
            {checkoutMethod === "on_account" ? "Net-30 · On account" : "Offline payment"}
          </>
        )}
      </div>
    )}

    <SecurityTrustBar />
  </aside>
);

// ─── Main component ───────────────────────────────────────────────────────────

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, totalPrice, clearCart, loading: cartLoading } = useCartContext();
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const { identity, isLoading: identityLoading } = usePortalIdentity();
  const { addresses, defaultShipping, defaultBilling, isLoading: addressesLoading } = useCustomerAddresses();
  const { defaultPaymentMethod, isLoading: paymentMethodsLoading } = useCustomerPaymentMethods();

  const isVerifiedB2B = identity?.portalAccessStatus === "approved_customer";

  // ── State ──
  const [step, setStep] = useState<Step>(1);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>(() => emptyForm(false));
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express" | "pickup">("standard");
  const [poNumber, setPoNumber] = useState<string>(
    (location.state as { poNumber?: string } | null)?.poNumber ?? "",
  );
  const [orderNotes, setOrderNotes] = useState<string>(
    (location.state as { orderNotes?: string } | null)?.orderNotes ?? "",
  );

  const shippingCost =
    step >= 2
      ? shippingMethod === "express"
        ? 74
        : shippingMethod === "pickup"
          ? 0
          : 28
      : null;

  // ── Guards ──
  useEffect(() => {
    if (!user) {
      navigate(createAuthHref({ mode: "signin", redirect: "/checkout" }), { replace: true });
      return;
    }
    // Wait for the cart to finish loading before deciding to bounce back.
    if (!cartLoading && !isComplete && items.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, navigate, user, isComplete, cartLoading]);

  // ── Load profile ──
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoadingProfile(true);
    (supabase.from("profiles") as any)
      .select("full_name,phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: Record<string, any> | null }) => {
        if (cancelled) return;
        setFormData((prev) => ({
          ...prev,
          fullName: data?.full_name || resolveUserFullName(user),
          email: user.email ?? "",
          phone: data?.phone || "",
          cardholderName: data?.full_name || resolveUserFullName(user),
        }));
        setIsLoadingProfile(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // ── Apply saved defaults ──
  useEffect(() => {
    if (identityLoading || addressesLoading || paymentMethodsLoading) return;
    setFormData((prev) => ({
      ...prev,
      checkoutMethod: isVerifiedB2B ? "on_account" : "stripe_offline",
      shippingAddressId: defaultShipping?.id ?? prev.shippingAddressId,
      shippingAddress: defaultShipping ? toProfileAddress(defaultShipping) : prev.shippingAddress,
      billingAddressId: defaultBilling?.id ?? defaultShipping?.id ?? prev.billingAddressId,
      billingAddress: defaultBilling
        ? toProfileAddress(defaultBilling)
        : defaultShipping
          ? toProfileAddress(defaultShipping)
          : prev.billingAddress,
    }));
  }, [identityLoading, addressesLoading, paymentMethodsLoading, isVerifiedB2B, defaultShipping, defaultBilling]);

  // ── Derived ──
  const isLoading = isLoadingProfile || addressesLoading || paymentMethodsLoading || identityLoading;

  const completedOrderNum = useMemo(
    () => `CV-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}`,
    [],
  );

  // ── Validation ──
  const validateStep = (s: Step): Partial<Record<string, string>> => {
    const errors: Partial<Record<string, string>> = {};
    if (s === 1) {
      if (!formData.fullName.trim()) errors.fullName = "Full name is required.";
      if (!formData.phone.trim()) errors.phone = "Phone number is required.";
      if (!formData.email.trim()) errors.email = "Email address is required.";
    }
    if (s === 2) {
      if (!formData.shippingAddress.line1.trim()) errors.addressLine1 = "Street address is required.";
      if (!formData.shippingAddress.country.trim()) errors.addressCountry = "Country is required.";
    }
    return errors;
  };

  const goNext = () => {
    const errors = validateStep(step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (step < 4) setStep((step + 1) as Step);
    else handlePlaceOrder();
  };

  const goBack = () => {
    setFieldErrors({});
    if (step > 1) setStep((step - 1) as Step);
    else navigate("/cart");
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    const success = await createOrder(items, totalPrice, {
      ...formData,
      billingAddress: sameAsShipping ? formData.shippingAddress : formData.billingAddress,
      billingAddressId: sameAsShipping ? formData.shippingAddressId : formData.billingAddressId,
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
    });
    setIsProcessing(false);
    if (success) {
      setIsComplete(true);
      await clearCart();
    }
  };

  // ── Address helpers ──
  const updateShippingAddress = (address: ProfileAddress) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddressId: null,
      shippingAddress: address,
      billingAddress: sameAsShipping ? address : prev.billingAddress,
      billingAddressId: sameAsShipping ? null : prev.billingAddressId,
    }));
  };

  // ── Step labels ──
  const stepLabel = step < 4 ? "Continue" : "Place order";

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIRMATION SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center px-4 pb-16 pt-24">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-soft">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <CheckCircle className="h-9 w-9 text-secondary" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-2xl text-foreground">
              {formData.checkoutMethod === "on_account"
                ? "Order placed on account"
                : "Order received"}
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {formData.checkoutMethod === "on_account"
                ? "Your order has been placed and reserved. An invoice will be sent to your email address. Expected dispatch within 1–2 business days."
                : "Your order is reserved. Once our team confirms receipt of your payment, your order will be dispatched. You'll receive an email confirmation."}
            </p>

            <div className="mb-6 rounded-lg bg-muted/60 px-4 py-3">
              <p className="font-mono text-xs text-muted-foreground">Order reference</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-secondary">
                {completedOrderNum}
              </p>
              {poNumber && (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  PO: {poNumber}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="default" asChild>
                <Link to="/profile/orders">View my orders</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/store">Continue shopping</Link>
              </Button>
            </div>

            <SecurityTrustBar compact className="mt-6 justify-center" />
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN CHECKOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb (offset for fixed header) */}
      <div className="border-b border-border bg-card pt-16">

        <div className="container mx-auto flex items-center gap-1 px-4 py-2.5 text-xs sm:px-6">
          <Link to="/store" className="text-muted-foreground hover:text-foreground transition-colors">
            Store
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
          <Link to="/cart" className="text-muted-foreground hover:text-foreground transition-colors">
            Cart
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
          <span className="font-semibold text-foreground">Checkout</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto overflow-x-auto px-4 sm:px-6">
          <nav
            aria-label="Checkout steps"
            className="flex items-stretch gap-0 min-w-max"
          >
            {STEPS.map(({ n, label }, idx) => {
              const done = n < step;
              const active = n === step;
              return (
                <div key={n} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => done && setStep(n)}
                    className={cn(
                      "flex cursor-default items-center gap-2 border-b-2 px-4 py-3.5 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      done && "cursor-pointer border-secondary text-secondary hover:text-secondary/80",
                      active && "border-primary text-foreground font-semibold",
                      !done && !active && "border-transparent text-muted-foreground",
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        done && "bg-secondary text-secondary-foreground",
                        active && "bg-primary text-primary-foreground",
                        !done && !active && "border border-border text-muted-foreground",
                      )}
                    >
                      {done ? "✓" : n}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-border mx-1" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main layout */}
      <main className="container mx-auto px-4 pb-16 pt-8 sm:px-6">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* ── Form column ── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* ───── STEP 1: Contact ───── */}
              {step === 1 && (
                <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                  <SectionHead>Contact information</SectionHead>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="full-name" className={cn(fieldErrors.fullName && "text-destructive")}>
                        Full name
                      </Label>
                      <Input
                        id="full-name"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, fullName: e.target.value }));
                          setFieldErrors((p) => ({ ...p, fullName: undefined }));
                        }}
                        placeholder="Jane Smith"
                        aria-invalid={!!fieldErrors.fullName}
                        className={cn(fieldErrors.fullName && "border-destructive focus-visible:ring-destructive")}
                      />
                      <FieldError message={fieldErrors.fullName} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className={cn(fieldErrors.phone && "text-destructive")}>
                        Phone number
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, phone: e.target.value }));
                          setFieldErrors((p) => ({ ...p, phone: undefined }));
                        }}
                        placeholder="+1 (246) 555-0101"
                        aria-invalid={!!fieldErrors.phone}
                        className={cn(fieldErrors.phone && "border-destructive focus-visible:ring-destructive")}
                      />
                      <FieldError message={fieldErrors.phone} />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="email" className={cn(fieldErrors.email && "text-destructive")}>
                        Email address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, email: e.target.value }));
                          setFieldErrors((p) => ({ ...p, email: undefined }));
                        }}
                        placeholder="you@example.com"
                        aria-invalid={!!fieldErrors.email}
                        className={cn(fieldErrors.email && "border-destructive focus-visible:ring-destructive")}
                      />
                      <FieldError message={fieldErrors.email} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="company">Company name</Label>
                      <Input
                        id="company"
                        value={(formData as any).company ?? identity?.organizationName ?? ""}
                        onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value } as any))}
                        placeholder="Island Optical Ltd."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vat">VAT / Tax ID <span className="text-muted-foreground/60">(optional)</span></Label>
                      <Input id="vat" placeholder="Optional" />
                    </div>
                  </div>
                </div>
              )}

              {/* ───── STEP 2: Shipping ───── */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Saved addresses */}
                  {addresses.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                      <SectionHead>Saved addresses</SectionHead>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {addresses.map((addr) => (
                          <PickCard
                            key={addr.id}
                            selected={formData.shippingAddressId === addr.id}
                            onClick={() => {
                              const pa = toProfileAddress(addr);
                              setFormData((prev) => ({
                                ...prev,
                                shippingAddressId: addr.id,
                                shippingAddress: pa,
                                billingAddress: sameAsShipping ? pa : prev.billingAddress,
                                billingAddressId: sameAsShipping ? addr.id : prev.billingAddressId,
                              }));
                            }}
                          >
                            <p className="text-sm font-medium text-foreground">{addr.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {addr.line1}, {addr.city}
                            </p>
                            {addr.isDefaultShipping && (
                              <span className="mt-1.5 inline-block font-mono text-[9px] uppercase tracking-wide text-secondary">
                                Default shipping
                              </span>
                            )}
                          </PickCard>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Address form */}
                  <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <SectionHead>Shipping address</SectionHead>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="ship-recipient">Recipient</Label>
                        <Input
                          id="ship-recipient"
                          value={formData.shippingAddress.recipient}
                          onChange={(e) => updateShippingAddress({ ...formData.shippingAddress, recipient: e.target.value })}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label
                          htmlFor="ship-line1"
                          className={cn(fieldErrors.addressLine1 && "text-destructive")}
                        >
                          Street address
                        </Label>
                        <Input
                          id="ship-line1"
                          value={formData.shippingAddress.line1}
                          onChange={(e) => {
                            updateShippingAddress({ ...formData.shippingAddress, line1: e.target.value });
                            setFieldErrors((p) => ({ ...p, addressLine1: undefined }));
                          }}
                          placeholder="123 Broad Street"
                          aria-invalid={!!fieldErrors.addressLine1}
                          className={cn(fieldErrors.addressLine1 && "border-destructive focus-visible:ring-destructive")}
                        />
                        <FieldError message={fieldErrors.addressLine1} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="ship-line2">Address line 2</Label>
                        <Input
                          id="ship-line2"
                          value={formData.shippingAddress.line2}
                          onChange={(e) => updateShippingAddress({ ...formData.shippingAddress, line2: e.target.value })}
                          placeholder="Suite, district, landmark"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ship-city">City</Label>
                        <Input
                          id="ship-city"
                          value={formData.shippingAddress.city}
                          onChange={(e) => updateShippingAddress({ ...formData.shippingAddress, city: e.target.value })}
                          placeholder="Bridgetown"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ship-state">Parish / State</Label>
                        <Input
                          id="ship-state"
                          list="ship-state-suggestions"
                          value={formData.shippingAddress.state}
                          onChange={(e) => updateShippingAddress({ ...formData.shippingAddress, state: e.target.value })}
                          placeholder="St. Michael"
                          autoComplete="address-level1"
                        />
                        <datalist id="ship-state-suggestions">
                          {getStateOptionsByCountry(formData.shippingAddress.country).map((opt) => (
                            <option key={opt.value} value={opt.value} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ship-postal">Postal code</Label>
                        <Input
                          id="ship-postal"
                          value={formData.shippingAddress.postalCode}
                          onChange={(e) => updateShippingAddress({ ...formData.shippingAddress, postalCode: e.target.value })}
                          placeholder="BB11000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="ship-country"
                          className={cn(fieldErrors.addressCountry && "text-destructive")}
                        >
                          Country
                        </Label>
                        <Select
                          value={formData.shippingAddress.country || undefined}
                          onValueChange={(value) => {
                            const currentStates = getStateOptionsByCountry(formData.shippingAddress.country).map((o) => o.value);
                            const nextStates = getStateOptionsByCountry(value).map((o) => o.value);
                            const currentState = formData.shippingAddress.state;
                            // Clear state if it belonged to the prior country's suggestion list and isn't valid for the new one
                            const shouldClearState = currentState && currentStates.includes(currentState) && !nextStates.includes(currentState);
                            updateShippingAddress({
                              ...formData.shippingAddress,
                              country: value,
                              state: shouldClearState ? "" : currentState,
                            });
                            setFieldErrors((p) => ({ ...p, addressCountry: undefined }));
                          }}
                        >
                          <SelectTrigger
                            id="ship-country"
                            aria-invalid={!!fieldErrors.addressCountry}
                            className={cn(fieldErrors.addressCountry && "border-destructive focus-visible:ring-destructive")}
                          >
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={fieldErrors.addressCountry} />
                      </div>
                    </div>

                    {/* Same as shipping toggle */}
                    <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Billing matches shipping</p>
                        <p className="text-xs text-muted-foreground">Disable to set a separate billing address.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={sameAsShipping}
                        onClick={() =>
                          setSameAsShipping((prev) => {
                            if (!prev) {
                              setFormData((f) => ({
                                ...f,
                                billingAddress: f.shippingAddress,
                                billingAddressId: f.shippingAddressId,
                              }));
                            }
                            return !prev;
                          })
                        }
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          sameAsShipping ? "bg-secondary" : "bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow ring-0 transition duration-200",
                            sameAsShipping ? "translate-x-5" : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Shipping method */}
                  <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <SectionHead>Shipping method</SectionHead>
                    <div className="space-y-2">
                      {[
                        { id: "standard" as const, name: "Standard Freight", detail: "3–5 business days · DHL / Island Courier", price: 28 },
                        { id: "express" as const, name: "Express Air", detail: "1–2 business days · FedEx Priority", price: 74 },
                        { id: "pickup" as const, name: "Local Pickup", detail: "Collect from Warrens warehouse · Mon–Fri", price: 0 },
                      ].map((method) => (
                        <PickCard
                          key={method.id}
                          selected={shippingMethod === method.id}
                          onClick={() => setShippingMethod(method.id)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                                  shippingMethod === method.id
                                    ? "border-secondary bg-secondary"
                                    : "border-border",
                                )}
                              >
                                {shippingMethod === method.id && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-background" />
                                )}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-foreground">{method.name}</p>
                                <p className="text-xs text-muted-foreground">{method.detail}</p>
                              </div>
                            </div>
                            <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
                              {method.price === 0 ? "Free" : `$${method.price.toFixed(2)}`}
                            </span>
                          </div>
                        </PickCard>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ───── STEP 3: Payment ───── */}
              {step === 3 && (
                <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                  <SectionHead>Payment method</SectionHead>

                  <div className="space-y-2">
                    {/* On Account — shown first for verified B2B */}
                    {isVerifiedB2B && (
                      <PickCard
                        selected={formData.checkoutMethod === "on_account"}
                        accent
                        onClick={() => setFormData((p) => ({ ...p, checkoutMethod: "on_account", paymentMethodId: null }))}
                      >
                        <div className="flex items-start gap-3">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">Pay on Account</p>
                              <Badge variant="outline" className="border-secondary/40 text-secondary font-mono text-[9px] uppercase">
                                Net-30
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Invoice issued after dispatch. No payment required now.
                            </p>
                            <div className="mt-2.5 flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
                              <span className="text-xs text-muted-foreground">Available credit</span>
                              <span className="font-mono text-sm font-bold text-foreground">$12,500 USD</span>
                            </div>
                          </div>
                        </div>
                        {formData.checkoutMethod === "on_account" && (
                          <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden="true" />
                            Order will be processed immediately. Invoice emailed to your account address.
                          </div>
                        )}
                      </PickCard>
                    )}

                    {/* Offline payment methods */}
                    {OFFLINE_METHODS.map((method) => {
                      const Icon = method.icon;
                      return (
                        <PickCard
                          key={method.id}
                          selected={formData.checkoutMethod === method.id}
                          onClick={() =>
                            setFormData((p) => ({ ...p, checkoutMethod: method.id, paymentMethodId: null }))
                          }
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{method.label}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{method.description}</p>
                            </div>
                          </div>
                        </PickCard>
                      );
                    })}
                  </div>

                  {/* Pending-payment notice for non-B2B */}
                  {formData.checkoutMethod !== "on_account" && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5 text-xs text-muted-foreground">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                      <span>
                        Your order will be reserved until our team confirms receipt of your{" "}
                        {formData.checkoutMethod === "stripe_offline"
                          ? "Stripe"
                          : formData.checkoutMethod === "firstpay_offline"
                            ? "1stPay"
                            : "BimPay"}{" "}
                        payment. You'll receive an email notification.
                      </span>
                    </div>
                  )}

                  {!isVerifiedB2B && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Want to pay on account?{" "}
                      <a href="/contact" className="text-secondary underline underline-offset-2 hover:text-secondary/80">
                        Apply for a verified B2B account.
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* ───── STEP 4: Review ───── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <SectionHead>Review your order</SectionHead>

                    {[
                      {
                        label: "Contact",
                        goTo: 1 as Step,
                        content: (
                          <>
                            <p className="text-sm text-foreground">{formData.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formData.email} · {formData.phone}
                            </p>
                          </>
                        ),
                      },
                      {
                        label: "Ship to",
                        goTo: 2 as Step,
                        content: (
                          <>
                            <p className="text-sm text-foreground">
                              {[
                                formData.shippingAddress.line1,
                                formData.shippingAddress.city,
                                formData.shippingAddress.state,
                                formData.shippingAddress.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {shippingMethod === "pickup"
                                ? "Local pickup"
                                : shippingMethod === "express"
                                  ? `Express Air · $74.00`
                                  : `Standard Freight · $28.00`}
                            </p>
                          </>
                        ),
                      },
                      {
                        label: "Payment",
                        goTo: 3 as Step,
                        content: (
                          <>
                            <p className="text-sm text-foreground">
                              {formData.checkoutMethod === "on_account"
                                ? "Pay on Account"
                                : formData.checkoutMethod === "stripe_offline"
                                  ? "Stripe"
                                  : formData.checkoutMethod === "firstpay_offline"
                                    ? "1stPay"
                                    : "BimPay"}
                              {formData.checkoutMethod === "on_account" && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 border-secondary/40 font-mono text-[9px] uppercase text-secondary"
                                >
                                  Net-30
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formData.checkoutMethod === "on_account"
                                ? "Invoice to follow · Credit available: $12,500"
                                : "Awaiting payment confirmation"}
                            </p>
                          </>
                        ),
                      },
                    ].map(({ label, goTo, content }) => (
                      <div
                        key={label}
                        className="mb-4 last:mb-0 rounded-lg border border-border bg-background px-4 py-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                            {label}
                          </span>
                          <button
                            type="button"
                            onClick={() => setStep(goTo)}
                            className="font-mono text-[10px] text-secondary underline underline-offset-2 hover:text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            Edit
                          </button>
                        </div>
                        {content}
                      </div>
                    ))}

                    {poNumber && (
                      <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3">
                        <p className="mb-1 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                          Purchase Order
                        </p>
                        <p className="font-mono text-sm font-semibold text-foreground">{poNumber}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>
                      By placing this order you confirm the quantities and PO reference are correct. A
                      confirmation email and invoice will be sent to your account email address.
                    </span>
                  </div>
                </div>
              )}

              {/* ── Action bar ── */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="gap-1.5"
                  aria-label={step === 1 ? "Back to cart" : "Previous step"}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {step === 1 ? "Back to cart" : "Back"}
                </Button>

                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  Step {step} of 4
                </span>

                <Button
                  type="button"
                  variant={step === 4 ? "secondary" : "default"}
                  onClick={goNext}
                  className="ml-auto gap-1.5 min-w-[140px]"
                  aria-label={stepLabel}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Processing…
                    </>
                  ) : (
                    <>
                      {stepLabel}
                      {step < 4 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div className="w-full lg:w-72 lg:shrink-0">
              <OrderSummarySidebar
                items={items}
                totalPrice={totalPrice}
                shippingCost={shippingCost}
                isVerifiedB2B={isVerifiedB2B ?? false}
                poNumber={poNumber}
                checkoutMethod={
                  (["on_account", "stripe_offline", "firstpay_offline", "bimpay_offline"].includes(
                    formData.checkoutMethod,
                  )
                    ? formData.checkoutMethod
                    : "stripe_offline") as PaymentMethod
                }
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CheckoutPage;
