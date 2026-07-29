import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AssistantMessage } from "@/features/assistant/CompanionAssistantContext";

type ConversationRow = { id: string; title: string; audience: string; created_at: string; updated_at: string };

const AssistantConversationsSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["assistant-conversations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assistant_conversations")
        .select("id,title,audience,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConversationRow[];
    },
  });

  const openConversation = async (conversation: ConversationRow) => {
    const { data: rows, error } = await (supabase as any)
      .from("assistant_messages")
      .select("id,role,content,metadata,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    if (error) return;

    const messages: AssistantMessage[] = (rows ?? []).map((row: any) => row.role === "user"
      ? { id: row.id, role: "user", kind: "user", text: row.content }
      : { id: row.id, role: "assistant", kind: "text", text: row.content });

    try {
      window.sessionStorage.setItem("companion-assistant-popout", JSON.stringify({ messages, currentQuery: "", formState: null }));
    } catch {
      // The assistant can still be opened without restoring the transcript.
    }
    window.location.assign("/assistant/window");
  };

  const deleteConversation = async (id: string) => {
    if (!window.confirm("Delete this saved assistant chat?")) return;
    const { error } = await (supabase as any).from("assistant_conversations").delete().eq("id", id);
    if (!error) await queryClient.invalidateQueries({ queryKey: ["assistant-conversations", user?.id] });
  };

  const renameConversation = async (conversation: ConversationRow) => {
    const title = editingTitle.trim();
    if (!title) return;
    const { error } = await (supabase as any).from("assistant_conversations").update({ title }).eq("id", conversation.id);
    if (!error) {
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ["assistant-conversations", user?.id] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><MessageSquare className="h-5 w-5" />Saved assistant chats</CardTitle>
        <CardDescription>Chats you chose to save for later reference.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading saved chats…</p> : null}
        {!isLoading && !conversations.length ? <p className="text-sm text-muted-foreground">You have not saved an assistant chat yet.</p> : null}
        {conversations.map((conversation) => (
          <div key={conversation.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            {editingId === conversation.id ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void renameConversation(conversation); }} autoFocus className="h-8" />
                <Button type="button" size="sm" onClick={() => void renameConversation(conversation)}>Save</Button>
              </div>
            ) : (
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => void openConversation(conversation)}>
                <p className="truncate font-medium">{conversation.title}</p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{conversation.audience} · {new Date(conversation.updated_at).toLocaleString()}</p>
              </button>
            )}
            <Button type="button" size="icon" variant="ghost" aria-label={`Rename ${conversation.title}`} onClick={() => { setEditingId(conversation.id); setEditingTitle(conversation.title); }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${conversation.title}`} onClick={() => void deleteConversation(conversation.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AssistantConversationsSection;
