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
import { CheckCircle, CreditCard, Loader2, Package } from "lucide-react";
import { CartItem } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_ADDRESS,
  ProfileAddress,
  coerceProfileAddress,
  resolveUserFullName,
  sanitizeProfileAddress,
} from "@/lib/profileData";
import { cn } from "@/lib/utils";

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ProfileAddress;
  billingAddress: ProfileAddress;
  checkoutMethod: "manual" | "google_pay";
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
  shippingAddress: { ...EMPTY_ADDRESS },
  billingAddress: { ...EMPTY_ADDRESS },
  checkoutMethod: "manual",
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
      const { data } = await (supabase
        .from("profiles") as any)
        .select("full_name,phone,shipping_address,billing_address")
        .eq("user_id", user.id)
        .maybeSingle() as { data: Record<string, any> | null };

      const shippingAddress = coerceProfileAddress(data?.shipping_address);
      const billingAddress = coerceProfileAddress(data?.billing_address);
      const fullName = data?.full_name || resolveUserFullName(user);
      const phone = data?.phone || "";

      setFormData({
        fullName,
        email: user.email ?? "",
        phone,
        shippingAddress,
        billingAddress,
        checkoutMethod: "manual",
      });
      setSameAsShipping(
        JSON.stringify(shippingAddress) === JSON.stringify(billingAddress) || !(data as any)?.billing_address
      );
      setIsLoadingProfile(false);
    };

    loadProfile();
  }, [open, user]);

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
            merchantInfo: {
              merchantName: "Classic Visions",
            },
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
      }
    );

    request.canMakePayment().then((result) => setGooglePayAvailable(!!result)).catch(() => setGooglePayAvailable(false));
  }, [open, totalLabel]);

  const updateShippingAddress = (address: ProfileAddress) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddress: address,
      billingAddress: sameAsShipping ? address : prev.billingAddress,
    }));
  };

  const handleCheckout = async (
    checkoutMethod: "manual" | "google_pay" = "manual",
    overrideData?: CheckoutFormData
  ) => {
    const payload = overrideData ?? {
      ...formData,
      billingAddress: sameAsShipping ? formData.shippingAddress : formData.billingAddress,
      checkoutMethod,
    };

    if (!payload.fullName.trim() || !payload.phone.trim()) return;

    setIsProcessing(true);
    const success = await onCheckout({
      ...payload,
      fullName: payload.fullName.trim(),
      phone: payload.phone.trim(),
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
            merchantInfo: {
              merchantName: "Classic Visions",
            },
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
      }
    );

    try {
      const response = await request.show();
      const shippingAddress = buildPaymentAddress(response.shippingAddress as unknown as PaymentAddressLike | undefined);
      const payerName = response.payerName ?? formData.fullName;
      const payerPhone = response.payerPhone ?? formData.phone;
      const payerEmail = response.payerEmail ?? formData.email;

      const nextData: CheckoutFormData = {
        ...formData,
        fullName: payerName,
        phone: payerPhone,
        email: payerEmail,
        shippingAddress,
        billingAddress: shippingAddress,
        checkoutMethod: "google_pay",
      };

      setFormData((prev) => ({
        ...prev,
        fullName: payerName,
        phone: payerPhone,
        email: payerEmail,
        shippingAddress,
        billingAddress: shippingAddress,
        checkoutMethod: "google_pay",
      }));
      setSameAsShipping(true);
      await response.complete("success");
      await handleCheckout("google_pay", nextData);
    } catch {
      // User dismissed or browser could not complete the request.
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

  const isReadyToPlaceOrder = formData.fullName.trim() && formData.phone.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {isComplete ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle className="h-10 w-10 text-accent" />
            </div>
            <DialogTitle className="mb-2 text-xl">Order Confirmed!</DialogTitle>
            <DialogDescription className="mb-6">
              Thank you for your order. Your saved profile, contact details, and checkout addresses are now ready for your next visit.
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
                Confirm your items, keep your account details current, and use Google Pay for faster checkout when your browser supports it.
              </DialogDescription>
            </DialogHeader>

            {isLoadingProfile ? (
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
                        onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
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

                <AddressFields
                  idPrefix="shipping"
                  title="Shipping address"
                  value={formData.shippingAddress}
                  onChange={updateShippingAddress}
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
                      sameAsShipping ? "bg-primary border-primary justify-end" : "bg-muted border-border justify-start"
                    )}
                    onClick={() => {
                      setSameAsShipping((prev) => {
                        const next = !prev;
                        if (next) {
                          setFormData((current) => ({
                            ...current,
                            billingAddress: current.shippingAddress,
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
                  <AddressFields
                    idPrefix="billing"
                    title="Billing address"
                    value={formData.billingAddress}
                    onChange={(billingAddress) => setFormData((prev) => ({ ...prev, billingAddress }))}
                  />
                )}

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
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={() => handleCheckout("manual")}
                    disabled={!isReadyToPlaceOrder || isProcessing}
                  >
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
