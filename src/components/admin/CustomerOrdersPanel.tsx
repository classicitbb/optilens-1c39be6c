import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import MyOrdersSection, { type StaffOrdersTarget } from "@/components/account/sections/MyOrdersSection";
import { InquireHandlerContext } from "@/components/account/InquireButton";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Staff-created tickets start in the "New" stage, matching the helpdesk board.
const findNewStageId = async (): Promise<string | null> => {
  const { data } = await (supabase as any)
    .from("helpdesk_ticket_stages")
    .select("id")
    .ilike("name", "new")
    .order("sequence", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
};

/**
 * Staff view of a customer's "My orders" page. The life-buoy icons raise an
 * internal helpdesk ticket linked to the customer's contact; the customer is
 * only emailed when staff opt in.
 */
const CustomerOrdersPanel = ({ target, contactId }: { target: StaffOrdersTarget; contactId: string | null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTicket = useCreateHelpdeskTicket();
  const [draft, setDraft] = useState<{ title: string; description: string; notifyContact: boolean } | null>(null);

  const submit = async () => {
    if (!draft?.title.trim()) return;
    const submitted = draft;
    // Close the form before saving: a disabled, focused submit button drops
    // focus to <body>, which the parent contact dialog treats as a dismiss.
    setDraft(null);
    try {
      await createTicket.mutateAsync({
        title: submitted.title,
        description: submitted.description,
        partnerContactId: contactId,
        ownerUserId: user?.id,
        stageId: await findNewStageId(),
        sourceChannel: "manual",
        notifyContact: submitted.notifyContact,
      });
      await queryClient.invalidateQueries({ queryKey: ["website-portals-customer-detail"] });
      toast({ title: "Ticket created", description: submitted.title });
    } catch (error) {
      toast({ title: "Ticket creation failed", description: (error as Error).message, variant: "destructive" });
      setDraft(submitted);
    }
  };

  return (
    <InquireHandlerContext.Provider value={(title, description) => setDraft({ title, description, notifyContact: false })}>
      <MyOrdersSection staffTarget={target} />
      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a ticket</DialogTitle>
            <DialogDescription>Creates a helpdesk ticket{contactId ? " linked to this customer's contact" : ""}, assigned to you.</DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="staff-ticket-title">Title</Label>
                <Input id="staff-ticket-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="staff-ticket-description">Details</Label>
                <Textarea id="staff-ticket-description" rows={8} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </div>
              {contactId ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={draft.notifyContact} onCheckedChange={(checked) => setDraft({ ...draft, notifyContact: checked === true })} />
                  Email the customer that a ticket was opened
                </label>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={createTicket.isPending || !draft?.title.trim()}>
              {createTicket.isPending ? "Creating…" : "Create ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InquireHandlerContext.Provider>
  );
};

export default CustomerOrdersPanel;
