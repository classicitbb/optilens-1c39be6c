import { useState } from "react";
import { useLocation } from "react-router";
import { FileSignature, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const QuoteFormSection = () => {
  const { user } = useAuth();
  const { emulation } = usePortalIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = customerName.trim().length > 0 && notes.trim().length > 0;
  // Lazy initializer: seeds once from an "Add to Rx" navigation off the
  // pricelist page (state.prefillNote), then behaves as a normal textarea.
  const [notes, setNotes] = useState(() => (location.state as { prefillNote?: string } | null)?.prefillNote ?? "");
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["customer-quotes", emulation?.userId ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      // The quotes_customer view is bound to the signed-in user server-side;
      // under admin emulation read the base table (admin RLS) for the target.
      const { data, error } = emulation
        ? await (supabase as any)
            .from("quotes")
            .select("id,quote_number,status,quote_type,created_at,notes_customer")
            .eq("created_by", emulation.userId)
            .order("created_at", { ascending: false })
            .limit(20)
        : await (supabase as any)
            .from("quotes_customer")
            .select("id,quote_number,status,quote_type,created_at,notes_customer")
            .order("created_at", { ascending: false })
            .limit(20);
      if (error) throw error;
      return data as Array<{ id: string; quote_number: string; status: string; quote_type: string; created_at: string; notes_customer: string | null }>;
    },
  });

  const submitQuote = async () => {
    if (!user || !canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).from("quotes").insert({
        created_by: user.id,
        quote_type: "STOCK",
        customer_name: customerName.trim(),
        contact_email: user.email,
        notes_customer: notes.trim() || null,
        quote_number: "",
      });
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to submit quote request.", variant: "destructive" });
        return;
      }
      setCustomerName("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["customer-quotes", emulation?.userId ?? user.id] });
      toast({ title: "Quote request submitted", description: "Your request is now in the quotation pipeline." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileSignature className="h-5 w-5" />
          Quote Requests
        </CardTitle>
        <CardDescription>Submit quote requests and track their status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuote();
          }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Start a quote request</h3>
              <p className="text-sm text-muted-foreground">Share the customer and product details so we can prepare pricing.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="quote-customer-name">Customer or business</Label>
              <Input
                id="quote-customer-name"
                name="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Enter a customer or business name…"
                autoComplete="organization"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-request-details">Request details</Label>
              <Textarea
                id="quote-request-details"
                name="request-details"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Tell us what products and quantities you need…"
                className="min-h-24 resize-y"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit || !!emulation || isSubmitting} title={emulation ? "Submitting is disabled while emulating a customer" : undefined}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? "Submitting…" : "Submit quote request"}
            </Button>
          </div>
        </form>
        <div className="space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading quote requests…</p> : null}
          {!isLoading && !quotes.length ? <p className="text-sm text-muted-foreground">No quote requests yet.</p> : null}
          {quotes.map((quote) => (
            <div key={quote.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{quote.quote_number}</p>
              <p className="text-muted-foreground">{quote.status} · {new Date(quote.created_at).toLocaleString()}</p>
              {quote.notes_customer ? <p className="mt-1 text-muted-foreground">{quote.notes_customer}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteFormSection;
