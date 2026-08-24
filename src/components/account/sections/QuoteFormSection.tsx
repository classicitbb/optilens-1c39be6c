import { useState } from "react";
import { FileSignature, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const QuoteFormSection = () => {
  const { user } = useAuth();
<<<<<<< Updated upstream
  const { emulation } = usePortalIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
=======
  const { emulation, portalSessionEmulation, identity } = usePortalIdentity();
  // Read-only identity preview only: a real "signed in as" emulation session
  // (portalSessionEmulation) is a genuine customer auth session and gets full
  // write access, same as the customer signing in themselves.
  const submissionDisabled = !!emulation && !portalSessionEmulation;
  const location = useLocation();
  const navigate = useNavigate();
  const { openAssistant } = useCompanionAssistant();
  const activeCustomerId = typeof identity?.crmCustomerId === "number" ? identity.crmCustomerId : null;
>>>>>>> Stashed changes
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
    if (!user) return;
    const { error } = await (supabase as any).from("quotes").insert({
      created_by: user.id,
      quote_type: "STOCK",
      customer_name: customerName.trim() || user.email,
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
    await queryClient.invalidateQueries({ queryKey: ["customer-quotes", user.id] });
    toast({ title: "Quote request submitted", description: "Your request is now in the quotation pipeline." });
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
<<<<<<< Updated upstream
        <div className="space-y-3 rounded-lg border p-4">
          <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer/business name" />
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Tell us what products and quantities you need." />
          <Button onClick={submitQuote} disabled={!!emulation} title={emulation ? "Submitting is disabled while emulating a customer" : undefined}>
            <Plus className="mr-2 h-4 w-4" />
            Submit quote request
          </Button>
=======
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><p className="text-sm font-semibold text-foreground">Start a quote request</p><p className="text-sm text-muted-foreground">The assistant uses this signed-in account, lets you edit the quote title and details, then asks you to confirm before submitting.</p></div>
          <Button type="button" onClick={() => openAssistant({ formKind: "quote_request", formValues: { summary: (location.state as { prefillNote?: string } | null)?.prefillNote ?? "" } })} disabled={submissionDisabled} title={submissionDisabled ? "Submitting is disabled while previewing a customer read-only" : undefined}><MessageCircle className="mr-2 h-4 w-4" />Request a quote</Button>
>>>>>>> Stashed changes
        </div>
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
