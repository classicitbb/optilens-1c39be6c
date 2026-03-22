import { useMemo, useState } from "react";
import { BookUser, Plus, Save, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { EMPTY_ADDRESS, ProfileAddress } from "@/lib/profileData";
import { useCustomerAddresses, type CustomerAddress, type SaveCustomerAddressInput } from "@/hooks/useCustomerAddresses";

const emptyDraft = (): SaveCustomerAddressInput => ({
  label: "",
  ...EMPTY_ADDRESS,
  isDefaultShipping: false,
  isDefaultBilling: false,
});

const AddressEditor = ({
  value,
  onChange,
}: {
  value: SaveCustomerAddressInput;
  onChange: (next: SaveCustomerAddressInput) => void;
}) => (
  <div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2">
      <Label>Label</Label>
      <Input value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} placeholder="Main office" />
    </div>
    <div className="space-y-2">
      <Label>Recipient</Label>
      <Input value={value.recipient} onChange={(event) => onChange({ ...value, recipient: event.target.value })} placeholder="Jane Smith" />
    </div>
    <div className="space-y-2 md:col-span-2">
      <Label>Address line 1</Label>
      <Input value={value.line1} onChange={(event) => onChange({ ...value, line1: event.target.value })} placeholder="123 Broad Street" />
    </div>
    <div className="space-y-2 md:col-span-2">
      <Label>Address line 2</Label>
      <Input value={value.line2} onChange={(event) => onChange({ ...value, line2: event.target.value })} placeholder="Suite, district, or landmark" />
    </div>
    <div className="space-y-2">
      <Label>City</Label>
      <Input value={value.city} onChange={(event) => onChange({ ...value, city: event.target.value })} placeholder="Bridgetown" />
    </div>
    <div className="space-y-2">
      <Label>State / Parish</Label>
      <Input value={value.state} onChange={(event) => onChange({ ...value, state: event.target.value })} placeholder="St. Michael" />
    </div>
    <div className="space-y-2">
      <Label>Postal code</Label>
      <Input value={value.postalCode} onChange={(event) => onChange({ ...value, postalCode: event.target.value })} placeholder="BB11000" />
    </div>
    <div className="space-y-2">
      <Label>Country</Label>
      <Input value={value.country} onChange={(event) => onChange({ ...value, country: event.target.value })} placeholder="Barbados" />
    </div>
    <button
      type="button"
      className={`rounded-lg border px-4 py-3 text-left ${value.isDefaultShipping ? "border-primary bg-primary/5" : "border-border"}`}
      onClick={() => onChange({ ...value, isDefaultShipping: !value.isDefaultShipping })}
    >
      <span className="block text-sm font-medium text-foreground">Default shipping</span>
      <span className="block text-xs text-muted-foreground">Use this address first at checkout.</span>
    </button>
    <button
      type="button"
      className={`rounded-lg border px-4 py-3 text-left ${value.isDefaultBilling ? "border-primary bg-primary/5" : "border-border"}`}
      onClick={() => onChange({ ...value, isDefaultBilling: !value.isDefaultBilling })}
    >
      <span className="block text-sm font-medium text-foreground">Default billing</span>
      <span className="block text-xs text-muted-foreground">Reuse this address for billing by default.</span>
    </button>
  </div>
);

const toDraft = (address: CustomerAddress): SaveCustomerAddressInput => ({
  id: address.id,
  label: address.label,
  recipient: address.recipient,
  line1: address.line1,
  line2: address.line2,
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  isDefaultShipping: address.isDefaultShipping,
  isDefaultBilling: address.isDefaultBilling,
});

const addressSummary = (address: ProfileAddress) =>
  [address.line1, address.city, address.state || address.country].filter(Boolean).join(", ");

interface AddressBookSectionProps {
  targetUserId?: string;
  title?: string;
  description?: string;
}

const AddressBookSection = ({
  targetUserId,
  title = "Address Book",
  description = "Save up to 2 reusable addresses for premium checkout. Choose default shipping and billing destinations.",
}: AddressBookSectionProps) => {
  const { toast } = useToast();
  const { addresses, isLoading, saveAddress, removeAddress } = useCustomerAddresses(targetUserId);
  const [draft, setDraft] = useState<SaveCustomerAddressInput>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const canAddAddress = useMemo(() => addresses.length < 2 || !!editingId, [addresses.length, editingId]);

  const handleSave = async () => {
    try {
      await saveAddress.mutateAsync({
        ...draft,
        label: draft.label.trim() || `Address ${addresses.length + (editingId ? 0 : 1)}`,
      });
      toast({ title: editingId ? "Address updated" : "Address saved", description: "Your profile address book is ready for checkout." });
      setDraft(emptyDraft());
      setEditingId(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save address.", variant: "destructive" });
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      await removeAddress.mutateAsync(addressId);
      toast({ title: "Address removed", description: "The address has been removed from your profile." });
      if (editingId === addressId) {
        setDraft(emptyDraft());
        setEditingId(null);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete address.", variant: "destructive" });
    }
  };

  if (isLoading) {
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
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{address.label}</p>
                  <p className="text-sm text-muted-foreground">{address.recipient || "No recipient"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{addressSummary(address)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {address.isDefaultShipping ? <span className="rounded-full border px-2 py-0.5">Default shipping</span> : null}
                    {address.isDefaultBilling ? <span className="rounded-full border px-2 py-0.5">Default billing</span> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingId(address.id); setDraft(toDraft(address)); }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(address.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!addresses.length ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground md:col-span-2">
              No saved addresses yet. Add one below to prefill checkout and support staff-assisted ordering.
            </div>
          ) : null}
        </div>

        <Separator className="my-2" />

        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{editingId ? "Edit saved address" : "Add saved address"}</p>
              <p className="text-xs text-muted-foreground">Maximum 2 saved addresses per account.</p>
            </div>
            {!editingId && (
              <Button variant="outline" size="sm" disabled={!canAddAddress}>
                <Plus className="mr-2 h-4 w-4" />
                {canAddAddress ? "Ready to add" : "Limit reached"}
              </Button>
            )}
          </div>

          <AddressEditor value={draft} onChange={setDraft} />

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saveAddress.isPending || !canAddAddress}>
              <Save className="mr-2 h-4 w-4" />
              {saveAddress.isPending ? "Saving…" : editingId ? "Save changes" : "Save address"}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={() => { setEditingId(null); setDraft(emptyDraft()); }}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddressBookSection;
