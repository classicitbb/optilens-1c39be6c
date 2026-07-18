import { useState } from "react";
import { CreditCard, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCustomerPaymentMethods, type CustomerPaymentMethod, type SaveCustomerPaymentMethodInput } from "@/hooks/useCustomerPaymentMethods";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const emptyDraft = (): SaveCustomerPaymentMethodInput => ({
  cardholderName: "",
  brand: "Visa",
  last4: "",
  expiryMonth: new Date().getMonth() + 1,
  expiryYear: new Date().getFullYear() + 1,
  isDefault: false,
});

const toDraft = (method: CustomerPaymentMethod): SaveCustomerPaymentMethodInput => ({
  id: method.id,
  cardholderName: method.cardholderName,
  brand: method.brand,
  last4: method.last4,
  expiryMonth: method.expiryMonth,
  expiryYear: method.expiryYear,
  isDefault: method.isDefault,
});

interface PaymentMethodsSectionProps {
  targetUserId?: string;
  title?: string;
  description?: string;
}

const PaymentMethodsSection = ({
  targetUserId,
  title = "Payment Methods",
  description = "Store tokenized demo cards for fast checkout. No full card number or CVV is stored.",
}: PaymentMethodsSectionProps) => {
  const { toast } = useToast();
  const { emulation } = usePortalIdentity();
  const { paymentMethods, isLoading, savePaymentMethod, archivePaymentMethod } = useCustomerPaymentMethods(targetUserId ?? emulation?.userId);
  const [draft, setDraft] = useState<SaveCustomerPaymentMethodInput>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await savePaymentMethod.mutateAsync({
        ...draft,
        cardholderName: draft.cardholderName.trim() || "Account holder",
      });
      toast({ title: editingId ? "Payment method updated" : "Payment method saved", description: "Your tokenized demo card is ready for future checkout." });
      setDraft(emptyDraft());
      setEditingId(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save payment method.", variant: "destructive" });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archivePaymentMethod.mutateAsync(id);
      toast({ title: "Payment method removed", description: "The saved demo card is no longer available for checkout." });
      if (editingId === id) {
        setDraft(emptyDraft());
        setEditingId(null);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove payment method.", variant: "destructive" });
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
          <CreditCard className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {paymentMethods.map((method) => (
            <div key={method.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{method.brand} •••• {method.last4}</p>
                  <p className="text-sm text-muted-foreground">{method.cardholderName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Expires {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{method.isDefault ? "Default saved card" : "Saved demo card"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingId(method.id); setDraft(toDraft(method)); }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleArchive(method.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!paymentMethods.length ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground md:col-span-2">
              No saved payment methods yet. Add a demo card below to allow saved-card checkout and staff-assisted payment flows.
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <p className="text-sm font-semibold text-foreground">{editingId ? "Edit saved demo card" : "Add saved demo card"}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Cardholder name</Label>
              <Input value={draft.cardholderName} onChange={(event) => setDraft({ ...draft, cardholderName: event.target.value })} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} placeholder="Visa" />
            </div>
            <div className="space-y-2">
              <Label>Last 4 digits</Label>
              <Input value={draft.last4} onChange={(event) => setDraft({ ...draft, last4: event.target.value.replace(/\D/g, "").slice(-4) })} placeholder="4242" />
            </div>
            <div className="space-y-2">
              <Label>Expiry month</Label>
              <Input type="number" min={1} max={12} value={draft.expiryMonth} onChange={(event) => setDraft({ ...draft, expiryMonth: Number(event.target.value || draft.expiryMonth) })} />
            </div>
            <div className="space-y-2">
              <Label>Expiry year</Label>
              <Input type="number" min={new Date().getFullYear()} value={draft.expiryYear} onChange={(event) => setDraft({ ...draft, expiryYear: Number(event.target.value || draft.expiryYear) })} />
            </div>
            <button
              type="button"
              className={`rounded-lg border px-4 py-3 text-left md:col-span-2 ${draft.isDefault ? "border-primary bg-primary/5" : "border-border"}`}
              onClick={() => setDraft((prev) => ({ ...prev, isDefault: !prev.isDefault }))}
            >
              <span className="block text-sm font-medium text-foreground">Default payment method</span>
              <span className="block text-xs text-muted-foreground">Use this saved card first during checkout and staff-assisted ordering.</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={savePaymentMethod.isPending || draft.last4.length !== 4}>
              <Save className="mr-2 h-4 w-4" />
              {savePaymentMethod.isPending ? "Saving…" : editingId ? "Save changes" : "Save card"}
            </Button>
            {editingId ? <Button variant="outline" onClick={() => { setEditingId(null); setDraft(emptyDraft()); }}>Cancel edit</Button> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsSection;
