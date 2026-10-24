import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, StickyNote } from "lucide-react";
import { useTicketMessageMutation } from "../hooks/useTicketMessageMutation";
import { useToast } from "@/hooks/use-toast";
import { HelpdeskImageAttachments } from "@/components/account/HelpdeskImageAttachments";
import InlineDictationButton from "@/components/admin/InlineDictationButton";
import TidySuggestionChip from "@/components/admin/TidySuggestionChip";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";

interface TicketReplyComposerProps {
  ticketId: string;
}

const DICTATION_VOCABULARY = "Classic Visions, Helpdesk, ticket, customer, Innovations, ERP, lens";

export const TicketReplyComposer = ({ ticketId }: TicketReplyComposerProps) => {
  // Unsent text is kept per ticket so it survives a tab switch or a refresh.
  const [replyBody, setReplyBody, clearReplyBody] = usePersistentDraft(`helpdesk-reply:${ticketId}`);
  const [noteBody, setNoteBody, clearNoteBody] = usePersistentDraft(`helpdesk-note:${ticketId}`);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  // Bumping the key remounts the pickers, clearing their selection after a send.
  const [pickerKey, setPickerKey] = useState(0);
  const { mutateAsync, isPending } = useTicketMessageMutation();
  const { toast } = useToast();

  const handleSendReply = async () => {
    const body = replyBody.trim() || (replyFiles.length ? "File attached" : "");
    if (!body) return;

    try {
      await mutateAsync({
        ticketId,
        direction: "outbound",
        body,
        files: replyFiles,
      });

      clearReplyBody();
      setReplyFiles([]);
      setPickerKey((key) => key + 1);
      toast({ title: "Reply sent" });
    } catch {
      // The mutation displays the customer-safe error toast. Catching here
      // prevents React event handlers from surfacing it as an unhandled promise.
    }
  };

  const handleAddNote = async () => {
    const body = noteBody.trim() || (noteFiles.length ? "File attached" : "");
    if (!body) return;

    try {
      await mutateAsync({
        ticketId,
        direction: "internal_note",
        body,
        files: noteFiles,
      });

      clearNoteBody();
      setNoteFiles([]);
      setPickerKey((key) => key + 1);
      toast({ title: "Note added" });
    } catch {
      // The mutation displays the customer-safe error toast. Catching here
      // prevents React event handlers from surfacing it as an unhandled promise.
    }
  };

  return (
    <div className="border-t border-border bg-background pt-3">
      <Tabs defaultValue="reply">
        <TabsList className="mb-2 h-8">
          <TabsTrigger value="reply" className="text-xs gap-1.5">
            <Send size={12} />
            Reply to customer
          </TabsTrigger>
          <TabsTrigger value="note" className="text-xs gap-1.5">
            <StickyNote size={12} />
            Internal note
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reply" className="space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Write a reply to the customer…"
              className="min-h-[90px] resize-none pb-10 pr-3 text-sm"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSendReply();
              }}
            />
            <InlineDictationButton ariaLabel="Dictate reply" position="bottom" showLevelMeter onValueChange={setReplyBody} vocabulary={DICTATION_VOCABULARY} />
            <TidySuggestionChip value={replyBody} onApply={setReplyBody} className="absolute bottom-1.5 left-2 z-10" />
          </div>
          <HelpdeskImageAttachments key={`reply-${pickerKey}`} ticketId={ticketId} attachments={[]} onFilesChange={setReplyFiles} disabled={isPending} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ctrl + Enter to send</span>
            <Button size="sm" onClick={handleSendReply} disabled={isPending || (!replyBody.trim() && !replyFiles.length)}>
              <Send size={13} className="mr-1.5" />
              Send reply
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="note" className="space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Add an internal note (not visible to the customer)…"
              className="min-h-[90px] resize-none pb-10 pr-3 text-sm border-amber-500/40 focus-visible:ring-amber-500/30"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddNote();
              }}
            />
            <InlineDictationButton ariaLabel="Dictate note" position="bottom" showLevelMeter onValueChange={setNoteBody} vocabulary={DICTATION_VOCABULARY} />
            <TidySuggestionChip value={noteBody} onApply={setNoteBody} className="absolute bottom-1.5 left-2 z-10" />
          </div>
          <HelpdeskImageAttachments key={`note-${pickerKey}`} ticketId={ticketId} attachments={[]} onFilesChange={setNoteFiles} disabled={isPending} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Only visible to your team</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddNote}
              disabled={isPending || (!noteBody.trim() && !noteFiles.length)}
            >
              <StickyNote size={13} className="mr-1.5" />
              Add note
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
