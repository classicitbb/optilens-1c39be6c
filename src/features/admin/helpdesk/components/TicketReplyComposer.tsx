import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, StickyNote } from "lucide-react";
import { useTicketMessageMutation } from "../hooks/useTicketMessageMutation";
import { useToast } from "@/hooks/use-toast";

interface TicketReplyComposerProps {
  ticketId: string;
  senderName?: string;
  senderEmail?: string;
}

export const TicketReplyComposer = ({ ticketId, senderName, senderEmail }: TicketReplyComposerProps) => {
  const [replyBody, setReplyBody] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const { mutateAsync, isPending } = useTicketMessageMutation();
  const { toast } = useToast();

  const handleSendReply = async () => {
    const body = replyBody.trim();
    if (!body) return;

    await mutateAsync({
      ticketId,
      direction: "outbound",
      body,
      senderName,
      senderEmail,
      setFirstResponse: true,
    });

    setReplyBody("");
    toast({ title: "Reply sent" });
  };

  const handleAddNote = async () => {
    const body = noteBody.trim();
    if (!body) return;

    await mutateAsync({
      ticketId,
      direction: "internal_note",
      body,
      senderName,
      senderEmail,
    });

    setNoteBody("");
    toast({ title: "Note added" });
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
          <Textarea
            placeholder="Write a reply to the customer…"
            className="min-h-[90px] resize-none text-sm"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSendReply();
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ctrl + Enter to send</span>
            <Button size="sm" onClick={handleSendReply} disabled={isPending || !replyBody.trim()}>
              <Send size={13} className="mr-1.5" />
              Send reply
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="note" className="space-y-2">
          <Textarea
            placeholder="Add an internal note (not visible to the customer)…"
            className="min-h-[90px] resize-none text-sm border-amber-500/40 focus-visible:ring-amber-500/30"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddNote();
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Only visible to your team</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddNote}
              disabled={isPending || !noteBody.trim()}
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
