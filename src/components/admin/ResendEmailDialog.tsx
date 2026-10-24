import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ResendInfo = { recipientEmail: string; subject: string; contacts: Array<{ id: string; name: string }> };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Resends a logged email. Mount with a fresh key per message so edits reset. The address is pre-filled so it can be corrected; if
// it is changed and CRM contacts hold the old address, the admin can fix it there too.
export default function ResendEmailDialog({ messageId, onClose }: { messageId: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [edited, setEdited] = useState<string | null>(null);
  const [updateContacts, setUpdateContacts] = useState(true);

  const { data: info, isLoading, error } = useQuery({
    queryKey: ["email-resend-info", messageId],
    enabled: !!messageId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("docstudio-api/email/resend-info", { method: "POST", body: { messageId } });
      if (error) throw error;
      return data as ResendInfo;
    },
  });

  const recipient = edited ?? info?.recipientEmail ?? "";
  const trimmed = recipient.trim();
  const changed = !!info && trimmed.toLowerCase() !== info.recipientEmail.toLowerCase();
  const matches = info?.contacts ?? [];

  const resend = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("docstudio-api/email/resend", {
        method: "POST",
        body: { messageId, recipientEmail: trimmed, updateContacts: changed && updateContacts },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.reason === "email_suppressed" ? `${trimmed} is on the suppression list (unsubscribed or bounced previously).` : "Send failed.");
      return data as { updatedContacts: string[] };
    },
    onSuccess: (data) => {
      const updated = data.updatedContacts.length ? ` Email updated on ${data.updatedContacts.join(", ")}.` : "";
      toast({ title: "Email resent", description: `Sent to ${trimmed}.${updated}` });
      void queryClient.invalidateQueries({ queryKey: ["email-delivery-health"] });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Could not resend email", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!messageId} onOpenChange={(open) => { if (!open && !resend.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resend email</DialogTitle>
          <DialogDescription>{info ? <>“{info.subject}” — originally sent to {info.recipientEmail}.</> : "Loading the original email…"}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : error || !info ? (
          <p className="text-sm text-red-600">This email can't be resent: {(error as Error | null)?.message ?? "it was not stored."}</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resend-recipient">Send to</Label>
              <Input id="resend-recipient" type="email" value={recipient} onChange={(e) => setEdited(e.target.value)} />
              <p className="text-xs text-muted-foreground">Change this if the address was wrong.</p>
            </div>
            {changed && matches.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
                <Checkbox id="resend-update-contacts" checked={updateContacts} onCheckedChange={(v) => setUpdateContacts(v === true)} className="mt-0.5" />
                <Label htmlFor="resend-update-contacts" className="text-sm font-normal leading-snug">
                  Also replace {info.recipientEmail} with {trimmed || "the new address"} on {matches.length === 1 ? "contact" : "contacts"}: <strong>{matches.map((c) => c.name).join(", ")}</strong>
                </Label>
              </div>
            )}
            {changed && matches.length === 0 && <p className="text-xs text-muted-foreground">No CRM contact has {info.recipientEmail}, so no contact will be updated.</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={resend.isPending}>Cancel</Button>
          <Button onClick={() => resend.mutate()} disabled={!info || !emailRegex.test(trimmed) || resend.isPending}>
            {resend.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Resend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
