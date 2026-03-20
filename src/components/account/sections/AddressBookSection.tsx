import { useEffect, useState } from "react";
import { BookUser, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EMPTY_ADDRESS, ProfileAddress, coerceProfileAddress, sanitizeProfileAddress } from "@/lib/profileData";

const AddressFields = ({
  title,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  value: ProfileAddress;
  onChange: (next: ProfileAddress) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-4 rounded-xl border p-4">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Recipient</Label>
        <Input
          value={value.recipient}
          onChange={(event) => onChange({ ...value, recipient: event.target.value })}
          placeholder="Jane Smith"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Address line 1</Label>
        <Input
          value={value.line1}
          onChange={(event) => onChange({ ...value, line1: event.target.value })}
          placeholder="123 Broad Street"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Address line 2</Label>
        <Input
          value={value.line2}
          onChange={(event) => onChange({ ...value, line2: event.target.value })}
          placeholder="Suite, district, or landmark"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>City</Label>
        <Input
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          placeholder="Bridgetown"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>State / Parish</Label>
        <Input
          value={value.state}
          onChange={(event) => onChange({ ...value, state: event.target.value })}
          placeholder="St. Michael"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>Postal code</Label>
        <Input
          value={value.postalCode}
          onChange={(event) => onChange({ ...value, postalCode: event.target.value })}
          placeholder="BB11000"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>Country</Label>
        <Input
          value={value.country}
          onChange={(event) => onChange({ ...value, country: event.target.value })}
          placeholder="Barbados"
          disabled={disabled}
        />
      </div>
    </div>
  </div>
);

const AddressBookSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [shippingAddress, setShippingAddress] = useState<ProfileAddress>({ ...EMPTY_ADDRESS });
  const [billingAddress, setBillingAddress] = useState<ProfileAddress>({ ...EMPTY_ADDRESS });

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;

      const { data, error } = await (supabase
        .from("profiles") as any)
        .select("shipping_address,billing_address")
        .eq("user_id", user.id)
        .maybeSingle() as { data: Record<string, any> | null; error: any };

      if (error) {
        toast({ title: "Error", description: "Failed to load saved addresses.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const shipping = coerceProfileAddress(data?.shipping_address);
      const billing = coerceProfileAddress(data?.billing_address);

      setShippingAddress(shipping);
      setBillingAddress(billing);
      setSameAsShipping(JSON.stringify(shipping) === JSON.stringify(billing) || !data?.billing_address);
      setLoading(false);
    };

    fetchAddresses();
  }, [toast, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const normalizedShipping = sanitizeProfileAddress(shippingAddress);
    const normalizedBilling = sameAsShipping ? normalizedShipping : sanitizeProfileAddress(billingAddress);

    const { error } = await supabase
      .from("profiles")
      .update({
        shipping_address: normalizedShipping,
        billing_address: normalizedBilling,
      } as never)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to save addresses.", variant: "destructive" });
      return;
    }

    if (sameAsShipping) {
      setBillingAddress(shippingAddress);
    }

    toast({ title: "Addresses saved", description: "Your billing and shipping details are ready for checkout." });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-[220px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BookUser className="h-5 w-5" />
          Address Book
        </CardTitle>
        <CardDescription>Manage shipping and billing addresses for quick checkout.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AddressFields
          title="Shipping address"
          value={shippingAddress}
          onChange={(next) => {
            setShippingAddress(next);
            if (sameAsShipping) setBillingAddress(next);
          }}
        />

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Billing matches shipping</p>
            <p className="text-xs text-muted-foreground">Turn this off if you need a separate billing address.</p>
          </div>
          <Switch
            checked={sameAsShipping}
            onCheckedChange={(checked) => {
              setSameAsShipping(checked);
              if (checked) setBillingAddress(shippingAddress);
            }}
          />
        </div>

        {!sameAsShipping && (
          <AddressFields title="Billing address" value={billingAddress} onChange={setBillingAddress} />
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save addresses"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddressBookSection;
