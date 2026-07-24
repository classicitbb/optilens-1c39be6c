import { useState } from "react";
import { useNavigate } from "react-router";
import { LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InquireButtonProps {
  title: string;
  description: string;
  label?: string;
  className?: string;
}

const InquireButton = ({ title, description, label = "Ask about this", className }: InquireButtonProps) => {
  const { user } = useAuth();
  const { identity, emulation } = usePortalIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState(title);
  const [ticketDescription, setTicketDescription] = useState(description);
  const [submitting, setSubmitting] = useState(false);

  const openDialog = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTicketTitle(title);
      setTicketDescription(description);
    }
  };

  const submit = async () => {
    if (!user || !ticketTitle.trim() || !!emulation) return;
    setSubmitting(true);
    const { data, error } = await (supabase as any)
      .from("helpdesk_tickets")
      .insert({
        ticket_number: `PTL-${Date.now().toString().slice(-8)}`,
        title: ticketTitle.trim(),
        description: ticketDescription.trim(),
        source_channel: "portal",
        owner_user_id: user.id,
        partner_contact_id: identity?.crmContactId ?? null,
        priority: 1,
        opened_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message || "Failed to create ticket.", variant: "destructive" });
      return;
    }
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["customer-helpdesk"] });
    toast({ title: "Ticket created", description: "Your support ticket has been submitted." });
    if (data?.id) navigate(`/profile/helpdesk/${data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className ?? "h-8 w-8 shrink-0"}
          title={label}
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
        >
          <LifeBuoy className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" onClick={(event) => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
          <DialogDescription>We've prefilled this with the details from what you selected — edit as needed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={ticketTitle} onChange={(event) => setTicketTitle(event.target.value)} placeholder="Ticket title" />
          <Textarea
            value={ticketDescription}
            onChange={(event) => setTicketDescription(event.target.value)}
            placeholder="Describe your question."
            rows={8}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !ticketTitle.trim() || !!emulation}
            title={emulation ? "Ticket creation is disabled while emulating a customer" : undefined}
          >
            Create ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InquireButton;
