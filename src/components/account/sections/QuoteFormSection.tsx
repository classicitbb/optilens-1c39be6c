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

const QuoteFormSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["customer-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quotes")
        .select("id,quote_number,status,quote_type,created_at,notes_customer")
        .eq("created_by", user.id)
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
        <div className="space-y-3 rounded-lg border p-4">
          <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer/business name" />
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Tell us what products and quantities you need." />
          <Button onClick={submitQuote}>
            <Plus className="mr-2 h-4 w-4" />
            Submit quote request
          </Button>
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
