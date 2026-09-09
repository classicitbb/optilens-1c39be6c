import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLiveHelpdeskTicketUpdates } from "@/features/admin/helpdesk/hooks/useLiveHelpdeskUpdates";
import { useScrollToLatestMessage } from "@/features/admin/helpdesk/hooks/useScrollToLatestMessage";
import NpsPrompt from "@/components/feedback/NpsPrompt";
import { HelpdeskImageAttachments } from "@/components/account/HelpdeskImageAttachments";
import { uploadHelpdeskImages, type HelpdeskAttachment, validateHelpdeskImages } from "@/lib/helpdeskAttachments";
import { RichMarkdown } from "@/components/content/RichMarkdown";

const HelpdeskTicketDetailSection = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const [replyImages, setReplyImages] = useState<File[]>([]);
  const [composerKey, setComposerKey] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  useLiveHelpdeskTicketUpdates(ticketId);

  const { data: ticket, isLoading: loadingTicket } = useQuery({
    queryKey: ["portal-helpdesk-ticket", ticketId],
    enabled: !!ticketId && !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,title,description,source_channel,created_at,closed_at,stage:helpdesk_ticket_stages(name,is_closed)")
        .eq("id", ticketId)
        .single();
      if (error) throw error;
      return data as {
        id: string; ticket_number: string; title: string; description: string;
        source_channel: string; created_at: string; closed_at: string | null;
        stage: { name: string; is_closed: boolean } | null;
      };
    },
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["portal-helpdesk-messages", ticketId],
    enabled: !!ticketId && !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_messages")
        .select("id,direction,body,sender_name,sender_email,sent_at")
        .eq("ticket_id", ticketId)
        .in("direction", ["inbound", "outbound"])
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; direction: "inbound" | "outbound";
        body: string; sender_name: string | null; sender_email: string | null; sent_at: string;
      }>;
    },
  });

  const latestMessage = messages[messages.length - 1];
  // A support reply reads from its first line down; your own send just needs
  // the thread to sit at the bottom, next to the reply box.
  const latestMessageRef = useScrollToLatestMessage(
    loadingMessages ? undefined : `${latestMessage?.id ?? "none"}-${messages.length}`,
    latestMessage?.direction === "outbound" ? "start" : "end",
  );

  const { data: attachments = [] } = useQuery({
    queryKey: ["portal-helpdesk-attachments", ticketId], enabled: !!ticketId && !!user,
    queryFn: async () => { const { data, error } = await (supabase as any).from("helpdesk_ticket_attachments").select("*").eq("ticket_id", ticketId).order("created_at"); if (error) throw error; return (data ?? []) as HelpdeskAttachment[]; },
  });

  const closeTicket = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("close_helpdesk_ticket_for_participant", { p_ticket_id: ticketId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-helpdesk-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["customer-helpdesk"] });
      toast({ title: "Ticket closed", description: "Your ticket has been marked as resolved." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendReply = useMutation({
    mutationFn: async ({ body, images }: { body: string; images: File[] }) => {
      const { data, error } = await (supabase.rpc as any)("send_helpdesk_ticket_message", {
        p_ticket_id: ticketId,
        p_body: body,
        p_client_message_id: crypto.randomUUID(),
        p_internal_note: false,
      });
      if (error) throw error;
      const message = Array.isArray(data) ? data[0] : data;
      if (images.length) await uploadHelpdeskImages(ticketId!, images, message.id);
      return message;
    },
    onSuccess: () => {
      setReplyBody("");
      setReplyImages([]);
      setComposerKey((key) => key + 1);
      qc.invalidateQueries({ queryKey: ["portal-helpdesk-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["portal-helpdesk-attachments", ticketId] });
      toast({ title: "Reply sent" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (loadingTicket) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="text-sm">Loading ticket…</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Ticket not found.{" "}
        <button className="underline" onClick={() => navigate("/profile/helpdesk")}>
          Back to tickets
        </button>
      </div>
    );
  }

  const isClosed = !!ticket.closed_at || ticket.stage?.is_closed;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 mt-0.5" onClick={() => navigate("/profile/helpdesk")}>
            <ArrowLeft size={15} />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
              <Badge variant={isClosed ? "secondary" : "default"} className="text-xs">
                {isClosed ? "Closed" : "Open"}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight">{ticket.title}</CardTitle>
            {ticket.description && (
              <div className="text-sm text-muted-foreground mt-1"><RichMarkdown content={ticket.description.replace(/\n\nAssistant context:\n[\s\S]*$/u, "")} /></div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Message thread */}
        <div className="space-y-3">
          {loadingMessages ? (
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <Loader2 size={14} className="animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Use the form below to send a reply.</p>
          ) : (
            messages.map((msg) => {
              const isCustomer = msg.direction === "inbound";
              return (
                <div
                  key={msg.id}
                  ref={msg.id === latestMessage?.id ? latestMessageRef : undefined}
                  className={`flex w-full flex-col gap-1 ${isCustomer ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      isCustomer
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border"
                    }`}
                  >
                    {msg.body}
                  </div>
                  {attachments.filter((attachment) => attachment.message_id === msg.id).length ? <HelpdeskImageAttachments ticketId={ticket.id} attachments={attachments.filter((attachment) => attachment.message_id === msg.id)} onFilesChange={() => undefined} disabled readOnly /> : null}
                  <span className="text-xs text-muted-foreground px-1">
                    {isCustomer ? "You" : "Support"} · {format(new Date(msg.sent_at), "MMM d, h:mm a")}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Reply form */}
        {!isClosed && (
          <div className="space-y-2 border-t pt-4">
            <Textarea
              placeholder="Write a reply…"
              className="min-h-[80px] resize-none text-sm"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onPaste={(event) => {
                const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
                if (!images.length) return;
                const error = validateHelpdeskImages(images);
                setImageError(error);
                if (!error) { event.preventDefault(); setReplyImages(images); }
              }}
              onDrop={(event) => {
                const images = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
                if (!images.length) return;
                event.preventDefault();
                const error = validateHelpdeskImages(images);
                setImageError(error);
                if (!error) setReplyImages(images);
              }}
            />
            <HelpdeskImageAttachments key={composerKey} ticketId={ticket.id} attachments={[]} onFilesChange={(files) => { setImageError(null); setReplyImages(files); }} disabled={sendReply.isPending} />
            {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => closeTicket.mutate()}
                disabled={closeTicket.isPending}
              >
                Close ticket (resolved)
              </Button>
              <Button
                size="sm"
                onClick={() => sendReply.mutate({ body: replyBody.trim() || "Image attached", images: replyImages })}
                disabled={sendReply.isPending || (!replyBody.trim() && !replyImages.length)}
              >
                <Send size={13} className="mr-1.5" />
                Send reply
              </Button>
            </div>
          </div>
        )}

        {isClosed && (
          <>
            <div className="rounded-md bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground text-center">
              This ticket is closed.
            </div>
            <NpsPrompt
              triggerContext="helpdesk_ticket"
              sourceId={ticket.id}
              sourceLabel={`Ticket ${ticket.ticket_number}`}
              title="How likely are you to recommend Classic Visions based on this support experience?"
              className="mt-3"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HelpdeskTicketDetailSection;
