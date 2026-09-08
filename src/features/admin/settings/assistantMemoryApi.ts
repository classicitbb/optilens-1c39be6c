import { supabase } from "@/integrations/supabase/client";

// Kept in step with the category CHECK constraint on public.assistant_user_memory.
export const MEMORY_CATEGORIES = ["general", "preference", "role", "workflow", "contact"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CONTENT_MAX = 500;
export const MEMORY_ACTIVE_MAX = 40;

export interface AssistantMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  source: "assistant" | "manual";
  is_active: boolean;
  created_at: string;
}

// The table is owner-scoped by RLS, so every query here is implicitly "mine".
// Casts are needed because the generated Supabase types predate this table.
const table = () => (supabase.from("assistant_user_memory") as any);

export async function fetchAssistantMemory(surface = "admin"): Promise<AssistantMemory[]> {
  const { data, error } = await table()
    .select("id,category,content,source,is_active,created_at")
    .eq("surface", surface)
    .order("category")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as AssistantMemory[];
}

export async function addAssistantMemory(
  input: { content: string; category: MemoryCategory },
  surface = "admin",
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You must be signed in to save a memory.");

  const { error } = await table().insert({
    user_id: userId,
    surface,
    category: input.category,
    content: input.content.trim(),
    source: "manual",
  });
  if (error) throw new Error(friendlyWriteError(error.message));
}

export async function updateAssistantMemory(
  id: string,
  patch: { content?: string; category?: MemoryCategory; is_active?: boolean },
): Promise<void> {
  const next: Record<string, unknown> = { ...patch };
  if (typeof next.content === "string") next.content = (next.content as string).trim();

  const { error } = await table().update(next).eq("id", id);
  if (error) throw new Error(friendlyWriteError(error.message));
}

export async function deleteAssistantMemory(id: string): Promise<void> {
  const { error } = await table().delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function clearAssistantMemory(surface = "admin"): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You must be signed in to clear memories.");

  const { error } = await table().delete().eq("user_id", userId).eq("surface", surface);
  if (error) throw new Error(error.message);
}

// Postgres constraint text is not something to show an admin as-is.
function friendlyWriteError(message: string): string {
  if (message.includes("assistant_user_memory_dedupe_idx")) {
    return "Iris already remembers that — edit the existing entry instead.";
  }
  if (message.includes("assistant memory budget exceeded")) {
    return `Memory is full (${MEMORY_ACTIVE_MAX} active facts). Delete or deactivate one first.`;
  }
  if (message.includes("assistant_user_memory_content_check")) {
    return `A memory must be between 1 and ${MEMORY_CONTENT_MAX} characters.`;
  }
  return message;
}
