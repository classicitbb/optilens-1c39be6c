import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clearStoredDraft, hasStoredDraft, usePersistentDraft } from "@/hooks/usePersistentDraft";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Shown in place of a message its author withdrew. */
export const RETRACTED_MESSAGE_LABEL = "This message was retracted";

const refreshThread = (qc: ReturnType<typeof useQueryClient>, ticketId: string) => {
  for (const key of ["helpdesk-ticket-messages", "helpdesk-ticket-timeline", "portal-helpdesk-messages"]) {
    void qc.invalidateQueries({ queryKey: [key, ticketId] });
  }
};

/** Edit or retract one of your own Helpdesk messages. The database enforces who may. */
export const useHelpdeskMessageChange = (ticketId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = (err: Error) => toast({ title: "Could not change message", description: err.message, variant: "destructive" });

  const edit = useMutation({
    mutationFn: async ({ messageId, body }: { messageId: string; body: string }) => {
      const { error } = await (supabase.rpc as any)("edit_helpdesk_ticket_message", { p_message_id: messageId, p_body: body });
      if (error) throw error;
    },
    onSuccess: () => { refreshThread(qc, ticketId); toast({ title: "Message updated" }); },
    onError,
  });

  const retract = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await (supabase.rpc as any)("retract_helpdesk_ticket_message", { p_message_id: messageId });
      if (error) throw error;
    },
    onSuccess: () => { refreshThread(qc, ticketId); toast({ title: "Message retracted" }); },
    onError,
  });

  return { edit, retract };
};

interface HelpdeskMessageAuthorControlsProps {
  ticketId: string;
  messageId: string;
  body: string;
  /** Who can still see the message, for the retract confirmation ("the customer", "your team"). */
  audience: string;
  /** `editor` replaces the message bubble while editing; `actions` are the Edit / Retract links. */
  children: (parts: { editor: React.ReactNode | null; actions: React.ReactNode }) => React.ReactNode;
}

/** Wrap a message the signed-in user wrote to give it Edit and Retract. */
export const HelpdeskMessageAuthorControls = ({ ticketId, messageId, body, audience, children }: HelpdeskMessageAuthorControlsProps) => {
  const { edit, retract } = useHelpdeskMessageChange(ticketId);
  const draftKey = `helpdesk-edit:${messageId}`;
  // An unsaved edit reopens in edit mode after a tab switch or refresh.
  const [editing, setEditing] = useState(() => hasStoredDraft(draftKey));
  const [confirmRetract, setConfirmRetract] = useState(false);

  const editor = editing ? (
    <MessageEditor
      initial={body}
      draftKey={draftKey}
      saving={edit.isPending}
      onCancel={() => { clearStoredDraft(draftKey); setEditing(false); }}
      onSave={(next) => edit.mutate({ messageId, body: next }, { onSuccess: () => { clearStoredDraft(draftKey); setEditing(false); } })}
    />
  ) : null;

  const actions = editing ? null : (
    <>
      <span className="inline-flex items-center gap-2">
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setEditing(true)}>
          <Pencil size={10} /> Edit
        </button>
        <button type="button" className="inline-flex items-center gap-1 hover:text-destructive" onClick={() => setConfirmRetract(true)}>
          <Undo2 size={10} /> Retract
        </button>
      </span>
      <AlertDialog open={confirmRetract} onOpenChange={setConfirmRetract}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retract this message?</AlertDialogTitle>
            <AlertDialogDescription>
              The text will be removed and {audience} will see “{RETRACTED_MESSAGE_LABEL}” instead. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep message</AlertDialogCancel>
            <AlertDialogAction onClick={() => retract.mutate(messageId)}>Retract</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return <>{children({ editor, actions })}</>;
};

const MessageEditor = ({ initial, draftKey, saving, onSave, onCancel }: {
  initial: string; draftKey: string; saving: boolean; onSave: (body: string) => void; onCancel: () => void;
}) => {
  const [draft, setDraft] = usePersistentDraft(draftKey, initial);
  const unchanged = draft.trim() === initial.trim();
  return (
    <div className="w-full max-w-[80%] space-y-2 text-foreground">
      <Textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-[80px] resize-none text-sm"
        aria-label="Edit message"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(draft.trim())} disabled={saving || !draft.trim() || unchanged}>Save</Button>
      </div>
    </div>
  );
};
