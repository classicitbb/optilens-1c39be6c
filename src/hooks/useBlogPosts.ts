import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];
export type BlogPostInsert = Database["public"]["Tables"]["blog_posts"]["Insert"];
export type BlogPostUpdate = Database["public"]["Tables"]["blog_posts"]["Update"];

export const usePublicBlogPosts = () => {
  return useQuery({
    queryKey: ["blog_posts", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });
};

export const usePublicBlogPostBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["blog_posts", "public", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return (data as BlogPost | null) ?? null;
    },
    enabled: !!slug,
  });
};

export const useAdminBlogPosts = (status?: BlogPost["status"]) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["blog_posts", "admin", status],
    queryFn: async () => {
      let dbQuery = supabase
        .from("blog_posts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (status) {
        dbQuery = dbQuery.eq("status", status);
      }

      const { data, error } = await dbQuery;
      if (error) throw error;

      return (data ?? []) as BlogPost[];
    },
  });

  const upsertBlogPost = useMutation({
    mutationFn: async (post: BlogPostInsert | (BlogPostUpdate & { id: string })) => {
      if ((post as { id?: string }).id) {
        const { id, ...changes } = post as BlogPostUpdate & { id: string };
        const { error } = await supabase.from("blog_posts").update(changes).eq("id", id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("blog_posts").insert(post as BlogPostInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog_posts"] });
    },
  });

  const deleteBlogPost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog_posts"] });
    },
  });

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    upsertBlogPost: upsertBlogPost.mutateAsync,
    deleteBlogPost: deleteBlogPost.mutateAsync,
    isSaving: upsertBlogPost.isPending,
  };
};
