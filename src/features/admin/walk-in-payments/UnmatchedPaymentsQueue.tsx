import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Loader2 } from "lucide-react";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type UnmatchedPayment = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  amount: number;
  reason: string | null;
  paid_at: string | null;
  created_at: string;
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "BBD" }).format(amount);
const when = (value: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

/**
 * Self-service payments arrive with a customer-typed name and no order
 * reference, so the money is real but unattributed. This queue is how that gets
 * resolved — nothing settles silently into the ledger unmatched.
 */
const UnmatchedPaymentsQueue = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { reference: string; contactId: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["walk-in-payments-unmatched"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("walk_in_payments")
        .select("id,customer_name,customer_email,amount,reason,paid_at,created_at")
        .eq("needs_matching", true)
        .eq("status", "settled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UnmatchedPayment[];
    },
  });

  const draftFor = (id: string) => drafts[id] ?? { reference: "", contactId: "" };

  const match = async (id: string) => {
    const draft = draftFor(id);
    if (!draft.reference.trim() && !draft.contactId) {
      toast({
        variant: "destructive",
        title: "Nothing to match to",
        description: "Enter an order reference or choose a contact.",
      });
      return;
    }
    setSaving(id);
    try {
      const { error } = await (supabase.rpc as any)("match_walk_in_payment", {
        p_payment_id: id,
        p_order_reference: draft.reference.trim() || null,
        p_contact_id: draft.contactId || null,
      });
      if (error) throw error;
      toast({ title: "Payment matched" });
      void queryClient.invalidateQueries({ queryKey: ["walk-in-payments-unmatched"] });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not match the payment",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="print:hidden">
        <CardContent className="py-8 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) return null;

  return (
    <Card className="border-amber-300 print:hidden dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
          <CircleAlert className="h-5 w-5" />
          {payments.length} self-service {payments.length === 1 ? "payment needs" : "payments need"} matching
        </CardTitle>
        <CardDescription>
          These were paid by customers without staff assistance. Attach each one to an order or a
          contact so it can be reconciled.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {payments.map((payment) => {
          const draft = draftFor(payment.id);
          return (
            <div key={payment.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <div className="text-sm sm:col-span-2">
                <span className="font-semibold">{money(Number(payment.amount))}</span>
                <span className="text-muted-foreground"> — {payment.customer_name}</span>
                {payment.customer_email ? (
                  <span className="text-muted-foreground"> ({payment.customer_email})</span>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {when(payment.paid_at || payment.created_at)}
                  {payment.reason ? ` · ${payment.reason}` : ""}
                </p>
              </div>
              <Input
                value={draft.reference}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [payment.id]: { ...draft, reference: event.target.value },
                  }))}
                placeholder="Order / reference"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <ContactPickerSelect
                  value={draft.contactId}
                  onValueChange={(contactId) =>
                    setDrafts((current) => ({ ...current, [payment.id]: { ...draft, contactId } }))}
                  placeholder="Contact (optional)"
                  className="flex-1"
                />
                <Button onClick={() => match(payment.id)} disabled={saving === payment.id}>
                  {saving === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Match"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default UnmatchedPaymentsQueue;
