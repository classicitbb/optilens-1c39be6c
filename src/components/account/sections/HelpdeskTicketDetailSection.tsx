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
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const HelpdeskTicketDetailSection = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { identity } = usePortalIdentity();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [replyBody, setReplyBody] = useState("");

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

  const closeTicket = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("close_helpdesk_ticket_by_token", { p_token: ticketId });
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
    mutationFn: async (body: string) => {
      const { error } = await (supabase as any)
        .from("helpdesk_ticket_messages")
        .insert({
          ticket_id: ticketId,
          direction: "inbound",
          body,
          sender_user_id: user?.id ?? null,
          sender_name: identity?.customerName ?? identity?.organizationName ?? null,
          sender_email: user?.email ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyBody("");
      qc.invalidateQueries({ queryKey: ["portal-helpdesk-messages", ticketId] });
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
              <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
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
                <div key={msg.id} className={`flex flex-col gap-1 ${isCustomer ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      isCustomer
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border"
                    }`}
                  >
                    {msg.body}
                  </div>
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
            />
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
                onClick={() => sendReply.mutate(replyBody.trim())}
                disabled={sendReply.isPending || !replyBody.trim()}
              >
                <Send size={13} className="mr-1.5" />
                Send reply
              </Button>
            </div>
          </div>
        )}

        {isClosed && (
          <div className="rounded-md bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground text-center">
            This ticket is closed.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HelpdeskTicketDetailSection;
