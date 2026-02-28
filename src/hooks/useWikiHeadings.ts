import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WikiHeading {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
}

const toSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const useWikiHeadings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["wiki_headings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wiki_headings")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("title");

      if (error) throw error;
      return (data ?? []) as WikiHeading[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const trimmed = title.trim();
      const slug = toSlug(trimmed);
      if (!slug) throw new Error("Heading title is required");

      const { data: existing, error: existingError } = await supabase
        .from("wiki_headings")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) return existing;

      const { data, error } = await supabase
        .from("wiki_headings")
        .insert({ title: trimmed, slug })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki_headings"] });
    },
  });

  return {
    headings: query.data ?? [],
    isLoading: query.isLoading,
    createHeading: createMutation.mutateAsync,
  };
};
