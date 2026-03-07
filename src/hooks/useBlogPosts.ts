import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlogPost = {
  id: string;
  title: string;
  slug: string | null;
  content: string;
  excerpt: string | null;
  status: string;
  author_id: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostInsert = Partial<BlogPost> & { title: string };
export type BlogPostUpdate = Partial<BlogPost> & { id: string };

const blogTable = () => (supabase as any).from("blog_posts");

export const usePublicBlogPosts = () => {
  return useQuery({
    queryKey: ["blog_posts", "public"],
    queryFn: async () => {
      const { data, error } = await blogTable()
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

      const { data, error } = await blogTable()
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
      let dbQuery = blogTable()
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
    mutationFn: async (post: BlogPostInsert | BlogPostUpdate) => {
      if ((post as BlogPostUpdate).id) {
        const { id, ...changes } = post as BlogPostUpdate;
        const { error } = await blogTable().update(changes).eq("id", id);
        if (error) throw error;
        return;
      }

      const { error } = await blogTable().insert(post as BlogPostInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog_posts"] });
    },
  });

  const deleteBlogPost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await blogTable().delete().eq("id", id);
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
