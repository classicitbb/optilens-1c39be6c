import { useRef, useState } from "react";
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
  const { data, error } = await (supabase as any)
    .from("helpdesk_ticket_stages")
    .select("id")
    .ilike("name", "new")
    .order("sequence", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
};

/**
 * Staff view of a customer's "My orders" page. The life-buoy icons raise an
 * helpdesk ticket from staff to the selected contact; email defaults on.
 */
const CustomerOrdersPanel = ({ target, contactId }: { target: StaffOrdersTarget; contactId: string | null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTicket = useCreateHelpdeskTicket();
  const [draft, setDraft] = useState<{ title: string; description: string; notifyContact: boolean } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sending = useRef(false);

  const submit = async () => {
    if (!draft?.title.trim() || sending.current || !contactId || !user) return;
    sending.current = true;
    setIsSending(true);
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
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  };

  return (
    <InquireHandlerContext.Provider value={(title, description) => !isSending && setDraft({ title, description, notifyContact: true })}>
      <MyOrdersSection staffTarget={target} />
      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg [&_input]:text-base [&_textarea]:text-base sm:[&_input]:text-sm sm:[&_textarea]:text-sm">
          <DialogHeader>
            <DialogTitle>Raise a ticket</DialogTitle>
            <DialogDescription>From you to this contact. The ticket is linked to their account and assigned to you. Email tells them to sign in to read and reply.</DialogDescription>
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
          {!contactId ? <p role="alert" className="text-sm text-destructive">Select a saved contact before creating a ticket.</p> : null}
          <DialogFooter className="gap-2">
            <Button type="button" className="min-h-11" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button type="button" className="min-h-11" onClick={() => void submit()} disabled={isSending || !user || !contactId || !draft?.title.trim()}>
              {isSending ? "Sending…" : "Confirm & send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InquireHandlerContext.Provider>
  );
};

export default CustomerOrdersPanel;
