import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Brain, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MEMORY_ACTIVE_MAX, MEMORY_CATEGORIES, MEMORY_CONTENT_MAX,
  addAssistantMemory, clearAssistantMemory, deleteAssistantMemory,
  fetchAssistantMemory, updateAssistantMemory,
  type AssistantMemory, type MemoryCategory,
} from "@/features/admin/settings/assistantMemoryApi";

const CATEGORY_LABEL: Record<MemoryCategory, string> = {
  general: "General",
  preference: "Preference",
  role: "Role",
  workflow: "Workflow",
  contact: "Contact",
};

function MemoryRow({
  memory,
  onSave,
  onDelete,
  busy,
}: {
  memory: AssistantMemory;
  onSave: (patch: { content?: string; is_active?: boolean }) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(memory.content);
  const dirty = draft.trim() !== memory.content;

  return (
    <div className="space-y-2 border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{CATEGORY_LABEL[memory.category]}</Badge>
        <Badge variant="outline">{memory.source === "manual" ? "Added by you" : "Saved by Iris"}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{memory.is_active ? "In use" : "Paused"}</span>
          <Switch
            checked={memory.is_active}
            disabled={busy}
            onCheckedChange={(is_active) => onSave({ is_active })}
            aria-label={memory.is_active ? "Pause this memory" : "Use this memory"}
          />
          <Button size="icon" variant="ghost" disabled={busy} onClick={onDelete} aria-label="Delete this memory">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Textarea
        value={draft}
        maxLength={MEMORY_CONTENT_MAX}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-[60px] text-sm"
      />
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft(memory.content)}>Cancel</Button>
          <Button size="sm" disabled={busy || draft.trim().length === 0} onClick={() => onSave({ content: draft })}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

export function AssistantMemoryCard({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("preference");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["assistant-memory", "admin"],
    queryFn: () => fetchAssistantMemory("admin"),
    enabled,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["assistant-memory", "admin"] });
  const onError = (mutationError: unknown) =>
    toast({
      title: "Memory not saved",
      description: mutationError instanceof Error ? mutationError.message : "Unknown error",
      variant: "destructive",
    });

  const add = useMutation({
    mutationFn: () => addAssistantMemory({ content, category }, "admin"),
    onSuccess: () => {
      setContent("");
      refresh();
      toast({ title: "Iris will remember that" });
    },
    onError,
  });

  const update = useMutation({
    mutationFn: (input: { id: string; patch: { content?: string; is_active?: boolean } }) =>
      updateAssistantMemory(input.id, input.patch),
    onSuccess: refresh,
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAssistantMemory(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Memory deleted" });
    },
    onError,
  });

  const clearAll = useMutation({
    mutationFn: () => clearAssistantMemory("admin"),
    onSuccess: () => {
      refresh();
      toast({ title: "All memories cleared" });
    },
    onError,
  });

  const memories = data ?? [];
  const activeCount = memories.filter((memory) => memory.is_active).length;
  const busy = update.isPending || remove.isPending || clearAll.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4" /> What Iris remembers about you
        </CardTitle>
        <CardDescription>
          Personal facts added to your Portal Copilot prompt on every message. Only you can see or use these — they
          are not company knowledge and never override platform policy or pricing. Facts everyone should know belong
          in a knowledge article instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={content}
            maxLength={MEMORY_CONTENT_MAX}
            placeholder="e.g. I handle the Innova stock orders — always show me quantities in trays, not units."
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[70px] text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={(value) => setCategory(value as MemoryCategory)}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMORY_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>{CATEGORY_LABEL[value]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {content.trim().length}/{MEMORY_CONTENT_MAX} · {activeCount}/{MEMORY_ACTIVE_MAX} active
            </span>
            <Button
              size="sm"
              className="ml-auto"
              disabled={content.trim().length === 0 || add.isPending}
              onClick={() => add.mutate()}
            >
              {add.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
              Add memory
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading memories…
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Unable to load memories: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        )}
        {data && memories.length === 0 && (
          <p className="text-sm text-muted-foreground">Iris has nothing saved about you yet.</p>
        )}

        {memories.length > 0 && (
          <div className="space-y-2">
            {memories.map((memory) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                busy={busy}
                onSave={(patch) => update.mutate({ id: memory.id, patch })}
                onDelete={() => remove.mutate(memory.id)}
              />
            ))}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={busy}>Clear all memories</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear everything Iris remembers about you?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes all {memories.length} of your saved memories. It cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearAll.mutate()}>Clear all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AssistantMemoryCard;
