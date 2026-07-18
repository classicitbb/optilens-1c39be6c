import { useState } from "react";
import { useNavigate } from "react-router";
import { LifeBuoy, Plus, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const HelpdeskTicketsSection = () => {
  const { identity, emulation, effectiveUserId } = usePortalIdentity();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { data: tickets = [] } = useQuery({
    queryKey: ["customer-helpdesk", effectiveUserId, identity?.crmContactId],
    enabled: !!user,
    queryFn: async () => {
      let query = (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,title,description,source_channel,created_at,closed_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (identity?.crmContactId) {
        query = query.eq("partner_contact_id", identity.crmContactId);
      } else {
        query = query.eq("owner_user_id", effectiveUserId ?? user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Array<{ id: string; ticket_number: string; title: string; description: string; source_channel: string; created_at: string; closed_at: string | null }>;
    },
  });

  const createTicket = async () => {
    if (!user || !title.trim()) return;
    const { error } = await (supabase as any).from("helpdesk_tickets").insert({
      ticket_number: `PTL-${Date.now().toString().slice(-8)}`,
      title: title.trim(),
      description: description.trim(),
      source_channel: "portal",
      owner_user_id: user.id,
      partner_contact_id: identity?.crmContactId ?? null,
      priority: 1,
      opened_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Error", description: error.message || "Failed to create helpdesk ticket.", variant: "destructive" });
      return;
    }
    setTitle("");
    setDescription("");
    await queryClient.invalidateQueries({ queryKey: ["customer-helpdesk", user.id, identity?.crmContactId] });
    toast({ title: "Ticket created", description: "Your support ticket has been submitted." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <LifeBuoy className="h-5 w-5" />
          Helpdesk Tickets
        </CardTitle>
        <CardDescription>Create tickets and follow updates from support.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg border p-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ticket title" />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe your issue." />
          <Button onClick={createTicket} disabled={!title.trim() || !!emulation} title={emulation ? "Ticket creation is disabled while emulating a customer" : undefined}>
            <Plus className="mr-2 h-4 w-4" />
            Create ticket
          </Button>
        </div>
        <div className="space-y-2">
          {!tickets.length ? <p className="text-sm text-muted-foreground">No tickets yet.</p> : null}
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              className="w-full rounded-lg border p-3 text-sm text-left hover:bg-muted/40 transition-colors flex items-center justify-between gap-2"
              onClick={() => navigate(`/profile/helpdesk/${ticket.id}`)}
            >
              <div>
                <p className="font-medium">{ticket.ticket_number} · {ticket.title}</p>
                <p className="text-muted-foreground">{ticket.closed_at ? "Closed" : "Open"} · {new Date(ticket.created_at).toLocaleString()}</p>
              </div>
              <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HelpdeskTicketsSection;
