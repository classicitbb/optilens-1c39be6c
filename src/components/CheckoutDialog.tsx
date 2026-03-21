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
import { CheckCircle, CreditCard, Loader2, Package, WalletCards } from "lucide-react";
import { CartItem } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_ADDRESS, ProfileAddress, resolveUserFullName } from "@/lib/profileData";
import { cn } from "@/lib/utils";
import { useCustomerAddresses, toProfileAddress } from "@/hooks/useCustomerAddresses";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  shippingAddressId: string | null;
  billingAddressId: string | null;
  shippingAddress: ProfileAddress;
  billingAddress: ProfileAddress;
  checkoutMethod: "saved_demo_card" | "new_demo_card" | "google_pay";
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

const emptyCheckoutState = (): CheckoutFormData => ({
  fullName: "",
  email: "",
  phone: "",
  shippingAddressId: null,
  billingAddressId: null,
  shippingAddress: { ...EMPTY_ADDRESS },
  billingAddress: { ...EMPTY_ADDRESS },
  checkoutMethod: "new_demo_card",
  paymentMethodId: null,
  savePaymentMethod: false,
  cardholderName: "",
  cardBrand: "Visa",
  cardLast4: "",
  expiryMonth: new Date().getMonth() + 1,
  expiryYear: new Date().getFullYear() + 1,
});

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
}: {
  idPrefix: string;
  title: string;
  value: ProfileAddress;
  onChange: (next: ProfileAddress) => void;
}) => (
  <div className="space-y-3 rounded-lg border p-4">
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
        <Label htmlFor={`${idPrefix}-line1`}>Address line 1</Label>
        <Input
          id={`${idPrefix}-line1`}
          value={value.line1}
          onChange={(event) => onChange({ ...value, line1: event.target.value })}
          placeholder="123 Broad Street"
        />
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
        <Label htmlFor={`${idPrefix}-country`}>Country</Label>
        <Input
          id={`${idPrefix}-country`}
          value={value.country}
          onChange={(event) => onChange({ ...value, country: event.target.value })}
          placeholder="Barbados"
        />
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
  const { addresses, defaultShipping, defaultBilling, isLoading: addressesLoading } = useCustomerAddresses();
  const { paymentMethods, defaultPaymentMethod, isLoading: paymentMethodsLoading } = useCustomerPaymentMethods();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>(emptyCheckoutState);

  const totalLabel = useMemo(() => totalPrice.toFixed(2), [totalPrice]);

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

    const hasSavedMethod = checkoutMethod === "saved_demo_card" && !!payload.paymentMethodId;
    const hasNewCard = checkoutMethod !== "saved_demo_card" && payload.cardLast4.replace(/\D/g, "").length === 4;

    if (!payload.fullName.trim() || !payload.phone.trim() || !payload.shippingAddress.line1.trim() || !payload.shippingAddress.country.trim()) {
      return;
    }

    if (!hasSavedMethod && !hasNewCard && checkoutMethod !== "google_pay") {
      return;
    }

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
      setFormData(emptyCheckoutState());
      setSameAsShipping(true);
    }, 300);
  };

  const isReadyToPlaceOrder = Boolean(
    formData.fullName.trim() &&
      formData.phone.trim() &&
      formData.shippingAddress.line1.trim() &&
      formData.shippingAddress.country.trim() &&
      ((formData.checkoutMethod === "saved_demo_card" && formData.paymentMethodId) ||
        formData.checkoutMethod === "google_pay" ||
        formData.cardLast4.replace(/\D/g, "").length === 4),
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {isComplete ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle className="h-10 w-10 text-accent" />
            </div>
            <DialogTitle className="mb-2 text-xl">Order Confirmed!</DialogTitle>
            <DialogDescription className="mb-6">
              Your order, payment confirmation, and saved checkout preferences are now attached to your account.
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
                Use a saved demo card or enter a new demo payment method. Saved addresses and payment methods prefill automatically.
              </DialogDescription>
            </DialogHeader>

            {isLoadingProfile || addressesLoading || paymentMethodsLoading ? (
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

                <div className={cn("grid gap-4", googlePayAvailable && "pt-1")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-full-name">Full name</Label>
                      <Input
                        id="checkout-full-name"
                        value={formData.fullName}
                        onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value, cardholderName: prev.cardholderName || event.target.value }))}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-phone">Phone number</Label>
                      <Input
                        id="checkout-phone"
                        value={formData.phone}
                        onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="+1 (246) 555-0101"
                      />
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

                <AddressFields idPrefix="shipping" title="Shipping address" value={formData.shippingAddress} onChange={updateShippingAddress} />

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
                    <AddressFields idPrefix="billing" title="Billing address" value={formData.billingAddress} onChange={updateBillingAddress} />
                  </>
                )}

                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <WalletCards className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Payment method</p>
                      <p className="text-xs text-muted-foreground">Save demo cards to speed up future orders or let staff charge saved cards on your behalf.</p>
                    </div>
                  </div>

                  {paymentMethods.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          className={cn(
                            "rounded-lg border px-3 py-3 text-left transition-colors",
                            formData.paymentMethodId === method.id && formData.checkoutMethod === "saved_demo_card"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                          )}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              paymentMethodId: method.id,
                              checkoutMethod: "saved_demo_card",
                              cardholderName: method.cardholderName,
                              cardBrand: method.brand,
                              cardLast4: method.last4,
                              expiryMonth: method.expiryMonth,
                              expiryYear: method.expiryYear,
                              savePaymentMethod: false,
                            }));
                          }}
                        >
                          <p className="font-medium text-foreground">{method.brand} •••• {method.last4}</p>
                          <p className="text-xs text-muted-foreground">Expires {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{method.isDefault ? "Default card" : "Saved demo card"}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant={formData.checkoutMethod === "new_demo_card" ? "default" : "outline"}
                    onClick={() => setFormData((prev) => ({ ...prev, checkoutMethod: "new_demo_card", paymentMethodId: null }))}
                  >
                    Use a new demo card
                  </Button>

                  {formData.checkoutMethod !== "saved_demo_card" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="checkout-cardholder">Cardholder name</Label>
                        <Input
                          id="checkout-cardholder"
                          value={formData.cardholderName}
                          onChange={(event) => setFormData((prev) => ({ ...prev, cardholderName: event.target.value }))}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkout-card-brand">Card brand</Label>
                        <Input
                          id="checkout-card-brand"
                          value={formData.cardBrand}
                          onChange={(event) => setFormData((prev) => ({ ...prev, cardBrand: event.target.value }))}
                          placeholder="Visa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkout-card-last4">Card last 4</Label>
                        <Input
                          id="checkout-card-last4"
                          value={formData.cardLast4}
                          onChange={(event) => setFormData((prev) => ({ ...prev, cardLast4: event.target.value.replace(/\D/g, "").slice(-4) }))}
                          placeholder="4242"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkout-card-expiry-month">Expiry month</Label>
                        <Input
                          id="checkout-card-expiry-month"
                          type="number"
                          min={1}
                          max={12}
                          value={formData.expiryMonth}
                          onChange={(event) => setFormData((prev) => ({ ...prev, expiryMonth: Number(event.target.value || prev.expiryMonth) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkout-card-expiry-year">Expiry year</Label>
                        <Input
                          id="checkout-card-expiry-year"
                          type="number"
                          min={new Date().getFullYear()}
                          value={formData.expiryYear}
                          onChange={(event) => setFormData((prev) => ({ ...prev, expiryYear: Number(event.target.value || prev.expiryYear) }))}
                        />
                      </div>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center justify-between rounded-lg border px-4 py-3 text-left md:col-span-2",
                          formData.savePaymentMethod ? "border-primary bg-primary/5" : "border-border",
                        )}
                        onClick={() => setFormData((prev) => ({ ...prev, savePaymentMethod: !prev.savePaymentMethod }))}
                      >
                        <span>
                          <span className="block text-sm font-medium text-foreground">Save this demo card to your profile</span>
                          <span className="block text-xs text-muted-foreground">Stored as a tokenized demo method only. No full card data or CVV is saved.</span>
                        </span>
                        <span className="text-xs font-semibold text-primary">{formData.savePaymentMethod ? "On" : "Off"}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4">
                  <div className="max-h-52 space-y-3 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.product_name} <span className="text-muted-foreground">× {item.quantity}</span>
                        </span>
                        <span className="font-medium">${(item.product_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${totalLabel}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isProcessing}>
                    Cancel
                  </Button>
                  <Button variant="hero" className="flex-1" onClick={() => handleCheckout(formData.checkoutMethod)} disabled={!isReadyToPlaceOrder || isProcessing}>
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
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
