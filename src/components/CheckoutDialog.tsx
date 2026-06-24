import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, Loader2, Package, WalletCards, Building2, Clock, Info, AlertCircle } from "lucide-react";
import { CartItem } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_ADDRESS, ProfileAddress, resolveUserFullName } from "@/lib/profileData";
import { cn } from "@/lib/utils";
import { useCustomerAddresses, toProfileAddress } from "@/hooks/useCustomerAddresses";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { Link } from "react-router";
import { getStoreProductRoute, resolveStoreProductFromCartRef, useStoreProducts } from "@/hooks/useStoreProducts";

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  shippingAddressId: string | null;
  billingAddressId: string | null;
  shippingAddress: ProfileAddress;
  billingAddress: ProfileAddress;
  checkoutMethod:
    | "saved_demo_card"
    | "new_demo_card"
    | "google_pay"
    | "manual_review"
    | "on_account"
    | "stripe_offline"
    | "firstpay_offline"
    | "bimpay_offline"
    | "scotia_ecom";
  paymentMethodId: string | null;
  savePaymentMethod: boolean;
  cardholderName: string;
  cardBrand: string;
  cardLast4: string;
  expiryMonth: number;
  expiryYear: number;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  totalPrice: number;
  onCheckout: (details: CheckoutFormData) => Promise<boolean>;
}

interface PaymentAddressLike {
  recipient?: string;
  addressLine?: string[];
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

const emptyCheckoutState = (isVerified = false): CheckoutFormData => ({
  fullName: "",
  email: "",
  phone: "",
  shippingAddressId: null,
  billingAddressId: null,
  shippingAddress: { ...EMPTY_ADDRESS },
  billingAddress: { ...EMPTY_ADDRESS },
  checkoutMethod: isVerified ? "on_account" : "stripe_offline",
  paymentMethodId: null,
  savePaymentMethod: false,
  cardholderName: "",
  cardBrand: "Visa",
  cardLast4: "",
  expiryMonth: new Date().getMonth() + 1,
  expiryYear: new Date().getFullYear() + 1,
});

const OFFLINE_PAYMENT_METHODS = [
  {
    id: "stripe_offline" as const,
    label: "Stripe",
    description: "Pay via Stripe bank transfer or card",
    icon: "💳",
  },
  {
    id: "firstpay_offline" as const,
    label: "1stPay",
    description: "Pay via 1stPay payment network",
    icon: "🏦",
  },
  {
    id: "bimpay_offline" as const,
    label: "BimPay",
    description: "Pay via BimPay mobile payment",
    icon: "📱",
  },
] as const;

const buildPaymentAddress = (address?: PaymentAddressLike | null): ProfileAddress => ({
  recipient: address?.recipient ?? "",
  line1: address?.addressLine?.[0] ?? "",
  line2: address?.addressLine?.slice(1).join(", ") ?? "",
  city: address?.city ?? "",
  state: address?.region ?? "",
  postalCode: address?.postalCode ?? "",
  country: address?.country ?? "",
});

const AddressFields = ({
  idPrefix,
  title,
  value,
  onChange,
  errorLine1,
  errorCountry,
  onClearError,
}: {
  idPrefix: string;
  title: string;
  value: ProfileAddress;
  onChange: (next: ProfileAddress) => void;
  errorLine1?: string;
  errorCountry?: string;
  onClearError?: (field: "addressLine1" | "addressCountry") => void;
}) => (
  <div data-scroll-target className="space-y-3 rounded-lg border p-4">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-recipient`}>Recipient</Label>
        <Input
          id={`${idPrefix}-recipient`}
          value={value.recipient}
          onChange={(event) => onChange({ ...value, recipient: event.target.value })}
          placeholder="Jane Smith"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-line1`} className={errorLine1 ? "text-destructive" : ""}>
          Address line 1
        </Label>
        <Input
          id={`${idPrefix}-line1`}
          value={value.line1}
          onChange={(event) => {
            onChange({ ...value, line1: event.target.value });
            if (errorLine1) onClearError?.("addressLine1");
          }}
          placeholder="123 Broad Street"
          className={errorLine1 ? "border-destructive focus-visible:ring-destructive" : ""}
          aria-describedby={errorLine1 ? `error-${idPrefix}-line1` : undefined}
        />
        {errorLine1 && (
          <p id={`error-${idPrefix}-line1`} className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />{errorLine1}
          </p>
        )}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-line2`}>Address line 2</Label>
        <Input
          id={`${idPrefix}-line2`}
          value={value.line2}
          onChange={(event) => onChange({ ...value, line2: event.target.value })}
          placeholder="Suite, district, or landmark"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          placeholder="Bridgetown"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-state`}>State / Parish</Label>
        <Input
          id={`${idPrefix}-state`}
          value={value.state}
          onChange={(event) => onChange({ ...value, state: event.target.value })}
          placeholder="St. Michael"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-postal`}>Postal code</Label>
        <Input
          id={`${idPrefix}-postal`}
          value={value.postalCode}
          onChange={(event) => onChange({ ...value, postalCode: event.target.value })}
          placeholder="BB11000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-country`} className={errorCountry ? "text-destructive" : ""}>
          Country
        </Label>
        <Input
          id={`${idPrefix}-country`}
          value={value.country}
          onChange={(event) => {
            onChange({ ...value, country: event.target.value });
            if (errorCountry) onClearError?.("addressCountry");
          }}
          placeholder="Barbados"
          className={errorCountry ? "border-destructive focus-visible:ring-destructive" : ""}
          aria-describedby={errorCountry ? `error-${idPrefix}-country` : undefined}
        />
        {errorCountry && (
          <p id={`error-${idPrefix}-country`} className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />{errorCountry}
          </p>
        )}
      </div>
    </div>
  </div>
);

export const CheckoutDialog = ({
  open,
  onOpenChange,
  items,
  totalPrice,
  onCheckout,
}: CheckoutDialogProps) => {
  const { user } = useAuth();
  const { identity, isLoading: identityLoading } = usePortalIdentity();
  const isVerifiedB2B = identity?.portalAccessStatus === "approved_customer";

  const { data: storeProducts = [] } = useStoreProducts();
  const { addresses, defaultShipping, defaultBilling, isLoading: addressesLoading } = useCustomerAddresses();
  const { paymentMethods, defaultPaymentMethod, isLoading: paymentMethodsLoading } = useCustomerPaymentMethods();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>(() => emptyCheckoutState(false));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<
    "fullName" | "phone" | "addressLine1" | "addressCountry" | "payment",
    string
  >>>({});

  const totalLabel = useMemo(() => totalPrice.toFixed(2), [totalPrice]);
  const cartLinksByItemId = useMemo(() => {
    const links = new Map<string, string>();
    items.forEach((item) => {
      const linkedProduct = resolveStoreProductFromCartRef(storeProducts, {
        product_id: item.product_id,
        product_type: item.product_type,
      });
      if (linkedProduct) {
        links.set(item.id, getStoreProductRoute(linkedProduct));
      }
    });
    return links;
  }, [items, storeProducts]);

  // When verification status resolves, set the correct default checkout method
  useEffect(() => {
    if (!open || identityLoading) return;
    setFormData((prev) => {
      const isCurrentlyOfflineOrAccount =
        prev.checkoutMethod === "on_account" ||
        prev.checkoutMethod === "stripe_offline" ||
        prev.checkoutMethod === "firstpay_offline" ||
        prev.checkoutMethod === "bimpay_offline";
      if (!isCurrentlyOfflineOrAccount) return prev;
      return {
        ...prev,
        checkoutMethod: isVerifiedB2B ? "on_account" : "stripe_offline",
      };
    });
  }, [open, isVerifiedB2B, identityLoading]);

  useEffect(() => {
    if (!open || !user) return;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      const { data } = await (supabase.from("profiles") as any)
        .select("full_name,phone")
        .eq("user_id", user.id)
        .maybeSingle() as { data: Record<string, any> | null };

      setFormData((prev) => ({
        ...prev,
        fullName: data?.full_name || resolveUserFullName(user),
        email: user.email ?? "",
        phone: data?.phone || "",
        cardholderName: data?.full_name || resolveUserFullName(user),
      }));
      setIsLoadingProfile(false);
    };

    loadProfile();
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      shippingAddressId: defaultShipping?.id ?? prev.shippingAddressId,
      shippingAddress: defaultShipping ? toProfileAddress(defaultShipping) : prev.shippingAddress,
      billingAddressId: defaultBilling?.id ?? defaultShipping?.id ?? prev.billingAddressId,
      billingAddress: defaultBilling ? toProfileAddress(defaultBilling) : defaultShipping ? toProfileAddress(defaultShipping) : prev.billingAddress,
      paymentMethodId: defaultPaymentMethod?.id ?? prev.paymentMethodId,
      checkoutMethod: defaultPaymentMethod ? "saved_demo_card" : prev.checkoutMethod,
      cardholderName: prev.cardholderName || defaultPaymentMethod?.cardholderName || prev.fullName,
    }));
    setSameAsShipping((current) => current || (!!defaultShipping && !!defaultBilling && defaultShipping.id === defaultBilling.id));
  }, [open, defaultShipping, defaultBilling, defaultPaymentMethod]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || !("PaymentRequest" in window)) {
      setGooglePayAvailable(false);
      return;
    }

    const request = new window.PaymentRequest(
      [
        {
          supportedMethods: "https://google.com/pay",
          data: {
            environment: "TEST",
            apiVersion: 2,
            apiVersionMinor: 0,
            merchantInfo: { merchantName: "Classic Visions" },
            allowedPaymentMethods: [
              {
                type: "CARD",
                parameters: {
                  allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                  allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"],
                },
                tokenizationSpecification: {
                  type: "PAYMENT_GATEWAY",
                  parameters: {
                    gateway: "example",
                    gatewayMerchantId: "exampleGatewayMerchantId",
                  },
                },
              },
            ],
          },
        },
      ],
      {
        total: {
          label: "Classic Visions order",
          amount: { currency: "USD", value: totalLabel },
        },
      },
      {
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        requestShipping: true,
      },
    );

    request.canMakePayment().then((result) => setGooglePayAvailable(!!result)).catch(() => setGooglePayAvailable(false));
  }, [open, totalLabel]);

  const updateShippingAddress = (address: ProfileAddress) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddressId: null,
      shippingAddress: address,
      billingAddress: sameAsShipping ? address : prev.billingAddress,
      billingAddressId: sameAsShipping ? null : prev.billingAddressId,
    }));
  };

  const updateBillingAddress = (address: ProfileAddress) => {
    setFormData((prev) => ({
      ...prev,
      billingAddressId: null,
      billingAddress: address,
    }));
  };

  const isOfflineOrAccountMethod = (method: CheckoutFormData["checkoutMethod"]) =>
    method === "on_account" ||
    method === "stripe_offline" ||
    method === "firstpay_offline" ||
    method === "bimpay_offline";

  const validateAndGetErrors = (
    payload: CheckoutFormData,
    checkoutMethod: CheckoutFormData["checkoutMethod"],
  ) => {
    const errors: typeof fieldErrors = {};
    if (!payload.fullName.trim()) errors.fullName = "Full name is required.";
    if (!payload.phone.trim()) errors.phone = "Phone number is required.";
    if (!payload.shippingAddress.line1.trim()) errors.addressLine1 = "Street address is required.";
    if (!payload.shippingAddress.country.trim()) errors.addressCountry = "Country is required.";

    const isNewPath = isOfflineOrAccountMethod(checkoutMethod);
    const hasSavedMethod = checkoutMethod === "saved_demo_card" && !!payload.paymentMethodId;
    const hasNewCard = checkoutMethod !== "saved_demo_card" && payload.cardLast4.replace(/\D/g, "").length === 4;
    if (!isNewPath && checkoutMethod !== "google_pay" && !hasSavedMethod && !hasNewCard) {
      errors.payment = "Please select or enter a payment method.";
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  const handleCheckout = async (
    checkoutMethod: CheckoutFormData["checkoutMethod"] = formData.checkoutMethod,
    overrideData?: CheckoutFormData,
  ) => {
    const payload = overrideData ?? {
      ...formData,
      billingAddress: sameAsShipping ? formData.shippingAddress : formData.billingAddress,
      billingAddressId: sameAsShipping ? formData.shippingAddressId : formData.billingAddressId,
      checkoutMethod,
    };

    const errors = validateAndGetErrors(payload, checkoutMethod);
    if (errors) {
      setFieldErrors(errors);
      // Scroll to the first errored field
      const firstErrorId = errors.fullName
        ? "checkout-full-name"
        : errors.phone
          ? "checkout-phone"
          : errors.addressLine1 || errors.addressCountry
            ? "shipping-line1"
            : "checkout-payment";
      setTimeout(() => {
        document.getElementById(firstErrorId)?.closest("[data-scroll-target]")?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(firstErrorId)?.focus({ preventScroll: true });
      }, 0);
      return;
    }

    setFieldErrors({});

    setIsProcessing(true);
    const success = await onCheckout({
      ...payload,
      fullName: payload.fullName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      cardholderName: payload.cardholderName.trim(),
      cardLast4: payload.cardLast4.replace(/\D/g, "").slice(-4),
      checkoutMethod,
    });
    setIsProcessing(false);
    if (success) {
      setIsComplete(true);
    }
  };

  const handleGooglePay = async () => {
    if (typeof window === "undefined" || !("PaymentRequest" in window)) return;

    const request = new window.PaymentRequest(
      [
        {
          supportedMethods: "https://google.com/pay",
          data: {
            environment: "TEST",
            apiVersion: 2,
            apiVersionMinor: 0,
            merchantInfo: { merchantName: "Classic Visions" },
            allowedPaymentMethods: [
              {
                type: "CARD",
                parameters: {
                  allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                  allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"],
                },
                tokenizationSpecification: {
                  type: "PAYMENT_GATEWAY",
                  parameters: {
                    gateway: "example",
                    gatewayMerchantId: "exampleGatewayMerchantId",
                  },
                },
              },
            ],
          },
        },
      ],
      {
        total: {
          label: "Classic Visions order",
          amount: { currency: "USD", value: totalLabel },
        },
      },
      {
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        requestShipping: true,
      },
    );

    try {
      const response = await request.show();
      const shippingAddress = buildPaymentAddress(response.shippingAddress as unknown as PaymentAddressLike | undefined);
      const nextData: CheckoutFormData = {
        ...formData,
        fullName: response.payerName ?? formData.fullName,
        phone: response.payerPhone ?? formData.phone,
        email: response.payerEmail ?? formData.email,
        shippingAddressId: null,
        billingAddressId: null,
        shippingAddress,
        billingAddress: shippingAddress,
        checkoutMethod: "google_pay",
        paymentMethodId: null,
        savePaymentMethod: false,
        cardholderName: response.payerName ?? formData.fullName,
        cardBrand: "Google Pay",
        cardLast4: "0000",
        expiryMonth: formData.expiryMonth,
        expiryYear: formData.expiryYear,
      };

      setFormData(nextData);
      setSameAsShipping(true);
      await response.complete("success");
      await handleCheckout("google_pay", nextData);
    } catch {
      // dismissed
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setIsComplete(false);
      setFormData(emptyCheckoutState(isVerifiedB2B));
      setSameAsShipping(true);
    }, 300);
  };

  const hasValidAddress = Boolean(
    formData.fullName.trim() &&
      formData.phone.trim() &&
      formData.shippingAddress.line1.trim() &&
      formData.shippingAddress.country.trim(),
  );

  const hasValidPayment =
    isOfflineOrAccountMethod(formData.checkoutMethod) ||
    formData.checkoutMethod === "google_pay" ||
    (formData.checkoutMethod === "saved_demo_card" && !!formData.paymentMethodId) ||
    formData.cardLast4.replace(/\D/g, "").length === 4;

  const isReadyToPlaceOrder = hasValidAddress && hasValidPayment;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl lg:max-w-6xl">
        {isComplete ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle className="h-10 w-10 text-accent" />
            </div>
            <DialogTitle className="mb-2 text-xl">
              {formData.checkoutMethod === "on_account"
                ? "Order Placed on Account!"
                : isOfflineOrAccountMethod(formData.checkoutMethod)
                  ? "Order Received — Pending Payment"
                  : "Order Confirmed!"}
            </DialogTitle>
            <DialogDescription className="mb-6 space-y-1">
              {formData.checkoutMethod === "on_account" ? (
                <span>Your order has been placed on your account. An invoice will follow.</span>
              ) : isOfflineOrAccountMethod(formData.checkoutMethod) ? (
                <span>
                  Your order is reserved. Once our team confirms receipt of your{" "}
                  <strong>
                    {formData.checkoutMethod === "stripe_offline"
                      ? "Stripe"
                      : formData.checkoutMethod === "firstpay_offline"
                        ? "1stPay"
                        : "BimPay"}
                  </strong>{" "}
                  payment, your order will be fulfilled.
                </span>
              ) : (
                <span>Your order, payment confirmation, and saved checkout preferences are now attached to your account.</span>
              )}
            </DialogDescription>
            <Button onClick={handleClose} className="w-full">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Checkout
              </DialogTitle>
              <DialogDescription>
                {isVerifiedB2B
                  ? "Place your order on account or choose an offline payment method. Addresses prefill from your profile."
                  : "Choose your preferred payment method. Your order will be held until payment is confirmed by our team."}
              </DialogDescription>
            </DialogHeader>

            {isLoadingProfile || addressesLoading || paymentMethodsLoading || identityLoading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {googlePayAvailable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-center gap-2 border-neutral-900 bg-neutral-950 text-white hover:bg-neutral-900 hover:text-white"
                    onClick={handleGooglePay}
                    disabled={isProcessing}
                  >
                    <CreditCard className="h-4 w-4" />
                    Google Pay Express
                  </Button>
                )}

                <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
                  <div className="space-y-6">
                    <div data-scroll-target className={cn("grid gap-4", googlePayAvailable && "pt-1")}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="checkout-full-name" className={fieldErrors.fullName ? "text-destructive" : ""}>
                            Full name
                          </Label>
                          <Input
                            id="checkout-full-name"
                            value={formData.fullName}
                            onChange={(event) => {
                              setFormData((prev) => ({ ...prev, fullName: event.target.value, cardholderName: prev.cardholderName || event.target.value }));
                              if (fieldErrors.fullName) setFieldErrors((e) => ({ ...e, fullName: undefined }));
                            }}
                            placeholder="Jane Smith"
                            className={fieldErrors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
                            aria-describedby={fieldErrors.fullName ? "error-full-name" : undefined}
                          />
                          {fieldErrors.fullName && (
                            <p id="error-full-name" className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.fullName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="checkout-phone" className={fieldErrors.phone ? "text-destructive" : ""}>
                            Phone number
                          </Label>
                          <Input
                            id="checkout-phone"
                            value={formData.phone}
                            onChange={(event) => {
                              setFormData((prev) => ({ ...prev, phone: event.target.value }));
                              if (fieldErrors.phone) setFieldErrors((e) => ({ ...e, phone: undefined }));
                            }}
                            placeholder="+1 (246) 555-0101"
                            className={fieldErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                            aria-describedby={fieldErrors.phone ? "error-phone" : undefined}
                          />
                          {fieldErrors.phone && (
                            <p id="error-phone" className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkout-email">Email address</Label>
                        <Input
                          id="checkout-email"
                          value={formData.email}
                          onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Saved shipping addresses</p>
                          <p className="text-xs text-muted-foreground">Choose from up to 2 saved profile addresses or edit below for a one-off shipment.</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/profile/address-book">Manage in profile</a>
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {addresses.map((address) => (
                          <button
                            key={`shipping-${address.id}`}
                            type="button"
                            className={cn(
                              "rounded-lg border px-3 py-3 text-left transition-colors",
                              formData.shippingAddressId === address.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                            )}
                            onClick={() => {
                              const nextAddress = toProfileAddress(address);
                              setFormData((prev) => ({
                                ...prev,
                                shippingAddressId: address.id,
                                shippingAddress: nextAddress,
                                billingAddress: sameAsShipping ? nextAddress : prev.billingAddress,
                                billingAddressId: sameAsShipping ? address.id : prev.billingAddressId,
                              }));
                            }}
                          >
                            <p className="font-medium text-foreground">{address.label}</p>
                            <p className="text-xs text-muted-foreground">{address.line1}, {address.city}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {address.isDefaultShipping ? "Default shipping" : "Saved address"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <AddressFields
                      idPrefix="shipping"
                      title="Shipping address"
                      value={formData.shippingAddress}
                      onChange={updateShippingAddress}
                      errorLine1={fieldErrors.addressLine1}
                      errorCountry={fieldErrors.addressCountry}
                      onClearError={(f) => setFieldErrors((e) => ({ ...e, [f]: undefined }))}
                    />

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Billing address matches shipping</p>
                        <p className="text-xs text-muted-foreground">Disable this if you want a separate billing destination.</p>
                      </div>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                          sameAsShipping ? "bg-primary border-primary justify-end" : "bg-muted border-border justify-start",
                        )}
                        onClick={() => {
                          setSameAsShipping((prev) => {
                            const next = !prev;
                            if (next) {
                              setFormData((current) => ({
                                ...current,
                                billingAddress: current.shippingAddress,
                                billingAddressId: current.shippingAddressId,
                              }));
                            }
                            return next;
                          });
                        }}
                      >
                        <span className="mx-0.5 h-5 w-5 rounded-full bg-background shadow-sm" />
                      </button>
                    </div>

                    {!sameAsShipping && (
                      <>
                        <div className="space-y-3 rounded-lg border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Saved billing addresses</p>
                              <p className="text-xs text-muted-foreground">Choose another saved address or edit below for this order only.</p>
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {addresses.map((address) => (
                              <button
                                key={`billing-${address.id}`}
                                type="button"
                                className={cn(
                                  "rounded-lg border px-3 py-3 text-left transition-colors",
                                  formData.billingAddressId === address.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                                )}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    billingAddressId: address.id,
                                    billingAddress: toProfileAddress(address),
                                  }));
                                }}
                              >
                                <p className="font-medium text-foreground">{address.label}</p>
                                <p className="text-xs text-muted-foreground">{address.line1}, {address.city}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {address.isDefaultBilling ? "Default billing" : "Saved address"}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                        <AddressFields idPrefix="billing" title="Billing address" value={formData.billingAddress} onChange={updateBillingAddress} onClearError={() => {}} />
                      </>
                    )}

                    {/* ── B2B: Pay on Account (verified customers) ── */}
                    {isVerifiedB2B && (
                      <div id="checkout-payment" data-scroll-target className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Payment</p>
                            <p className="text-xs text-muted-foreground">Your account is approved for on-account ordering.</p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {/* On account option */}
                          <button
                            type="button"
                            className={cn(
                              "rounded-lg border px-3 py-3 text-left transition-colors",
                              formData.checkoutMethod === "on_account"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40",
                            )}
                            onClick={() => setFormData((prev) => ({ ...prev, checkoutMethod: "on_account", paymentMethodId: null }))}
                          >
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                              <p className="font-medium text-foreground">Pay on Account</p>
                              <Badge variant="outline" className="ml-auto text-[10px] border-primary/40 text-primary">Default</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Invoice to follow — no payment required now.</p>
                          </button>

                          {/* Offline payment option */}
                          <button
                            type="button"
                            className={cn(
                              "rounded-lg border px-3 py-3 text-left transition-colors",
                              isOfflineOrAccountMethod(formData.checkoutMethod) && formData.checkoutMethod !== "on_account"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40",
                            )}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                checkoutMethod: prev.checkoutMethod === "on_account" ? "stripe_offline" : prev.checkoutMethod,
                                paymentMethodId: null,
                              }))
                            }
                          >
                            <div className="flex items-center gap-1.5">
                              <WalletCards className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="font-medium text-foreground">Pay Offline</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Stripe, 1stPay, or BimPay — confirm payment with our team.</p>
                          </button>
                        </div>

                        {/* Show offline method selector when Pay Offline is chosen */}
                        {isOfflineOrAccountMethod(formData.checkoutMethod) && formData.checkoutMethod !== "on_account" && (
                          <div className="grid gap-2 pt-1 sm:grid-cols-3">
                            {OFFLINE_PAYMENT_METHODS.map((method) => (
                              <button
                                key={method.id}
                                type="button"
                                className={cn(
                                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                                  formData.checkoutMethod === method.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/40",
                                )}
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, checkoutMethod: method.id, paymentMethodId: null }));
                                  if (fieldErrors.payment) setFieldErrors((e) => ({ ...e, payment: undefined }));
                                }}
                              >
                                <p className="text-sm font-medium text-foreground">{method.icon} {method.label}</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">{method.description}</p>
                              </button>
                            ))}
                          </div>
                        )}

                        {formData.checkoutMethod === "on_account" && (
                          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>Your order will be processed immediately. An invoice will be sent to your email address for settlement.</span>
                          </div>
                        )}
                        {fieldErrors.payment && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.payment}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── B2C: Offline payment selector (unverified customers) ── */}
                    {!isVerifiedB2B && (
                      <div id="checkout-payment" data-scroll-target className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center gap-2">
                          <WalletCards className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Payment method</p>
                            <p className="text-xs text-muted-foreground">
                              Select how you will pay. Your order will be held until our team confirms receipt of your payment.
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          {OFFLINE_PAYMENT_METHODS.map((method) => (
                            <button
                              key={method.id}
                              type="button"
                              className={cn(
                                "rounded-lg border px-3 py-3 text-left transition-colors",
                                formData.checkoutMethod === method.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/40",
                              )}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, checkoutMethod: method.id, paymentMethodId: null }));
                                if (fieldErrors.payment) setFieldErrors((e) => ({ ...e, payment: undefined }));
                              }}
                            >
                              <p className="font-medium text-foreground">{method.icon} {method.label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{method.description}</p>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Your order will be reserved and fulfilled once our team confirms your payment. You will receive an email notification.
                          </span>
                        </div>

                        {fieldErrors.payment && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.payment}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Want to order on account?{" "}
                          <a href="/contact" className="text-primary underline underline-offset-2">
                            Contact us to apply for a verified account.
                          </a>
                        </p>
                      </div>
                    )}
                  </div>

                  <aside className="space-y-4 rounded-lg border p-4 lg:sticky lg:top-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-foreground">Order summary</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">USD</span>
                    </div>
                    <div className="max-h-80 space-y-3 overflow-y-auto">
                      {items.map((item) => {
                        const itemLink = cartLinksByItemId.get(item.id);
                        return (
                          <div key={item.id} className="flex justify-between gap-3 text-sm">
                            <span className="text-foreground">
                              {itemLink ? (
                                <Link to={itemLink} className="hover:text-primary hover:underline">
                                  {item.product_name}
                                </Link>
                              ) : (
                                item.product_name
                              )}{" "}
                              <span className="text-muted-foreground">× {item.quantity}</span>
                            </span>
                            <span className="font-medium">${(item.product_price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>${totalLabel} <span className="text-[10px] font-semibold uppercase text-muted-foreground">USD</span></span>
                    </div>

                    <div className="grid gap-3 pt-2 sm:grid-cols-3 lg:grid-cols-1">
                      <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                        Cancel
                      </Button>
                      <Button variant="secondary" asChild disabled={isProcessing}>
                        <Link to="/store" onClick={() => onOpenChange(false)}>Keep Shopping</Link>
                      </Button>
                      <Button variant="hero" onClick={() => handleCheckout(formData.checkoutMethod)} disabled={isProcessing}>
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Place Order"
                        )}
                      </Button>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
