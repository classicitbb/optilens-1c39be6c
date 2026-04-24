import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlogPostStatus = "draft" | "published" | "archived";
export type BlogEntryType = "blog_post" | "newsletter";

export type BlogPost = {
  id: string;
  title: string;
  slug: string | null;
  content: string;
  body_json: { blocks: unknown[] } | null;
  excerpt: string | null;
  status: BlogPostStatus;
  entry_type: BlogEntryType;
  author_id: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category: string | null;
  tags: string[] | null;
  related_post_slugs: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  source_url: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostInsert = Partial<BlogPost> & { title: string };
export type BlogPostUpdate = Partial<BlogPost> & { id: string };

type BlogSeedRecord = {
  entry_type?: BlogEntryType;
  status?: BlogPostStatus;
  title: string;
  slug: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  category?: string | null;
  tags?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  source_url?: string | null;
  body_json?: { blocks: unknown[] } | null;
  body_html?: string | null;
  content?: string | null;
  related_post_slugs?: string[] | null;
};

const BLOG_MIGRATION_SEED_URL = new URL("../data/blogMigrationSeed.json", import.meta.url);

const blogTable = () => (supabase as any).from("blog_posts");

const normalizeTags = (tags?: string[] | null) =>
  [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];

const normalizeRelatedSlugs = (slugs?: string[] | null, currentSlug?: string | null) =>
  [...new Set((slugs ?? []).map((slug) => slug.trim()).filter((slug) => slug && slug !== currentSlug))];

const mapSeedRecordToInsert = (record: BlogSeedRecord): BlogPostInsert => ({
  title: record.title,
  slug: record.slug,
  content: record.body_html || record.content || "",
  body_json: record.body_json ?? null,
  excerpt: record.excerpt ?? null,
  status: record.status ?? "draft",
  entry_type: record.entry_type ?? "blog_post",
  author_name: record.author_name ?? null,
  cover_image_url: record.cover_image_url ?? null,
  cover_image_alt: record.cover_image_alt ?? null,
  category: record.category ?? null,
  tags: normalizeTags(record.tags),
  related_post_slugs: normalizeRelatedSlugs(record.related_post_slugs, record.slug),
  seo_title: record.seo_title ?? null,
  seo_description: record.seo_description ?? null,
  source_url: record.source_url ?? null,
  published_at: record.published_at ?? null,
});

export const usePublicBlogPosts = (entryType?: BlogEntryType) => {
  return useQuery({
    queryKey: ["blog_posts", "public", entryType ?? "all"],
    queryFn: async () => {
      let query = blogTable()
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (entryType) {
        query = query.eq("entry_type", entryType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });
};

export const useFeaturedBlogPosts = () => {
  return useQuery({
    queryKey: ["blog_posts", "public", "featured"],
    queryFn: async () => {
      const { data: featured, error: featuredError } = await blogTable()
        .select("*")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(6);
      if (featuredError) throw featuredError;

      if ((featured ?? []).length > 0) return (featured ?? []) as BlogPost[];

      const { data, error } = await blogTable()
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });
};

export const usePublicBlogPostBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["blog_posts", "public", "slug", slug],
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

export const useAdminBlogPosts = (filters?: {
  status?: BlogPostStatus;
  entryType?: BlogEntryType;
}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["blog_posts", "admin", filters?.status ?? "all", filters?.entryType ?? "all"],
    queryFn: async () => {
      let dbQuery = blogTable().select("*").order("updated_at", { ascending: false });

      if (filters?.status) {
        dbQuery = dbQuery.eq("status", filters.status);
      }

      if (filters?.entryType) {
        dbQuery = dbQuery.eq("entry_type", filters.entryType);
      }

      const { data, error } = await dbQuery;
      if (error) throw error;

      return (data ?? []) as BlogPost[];
    },
  });

  const upsertBlogPost = useMutation({
    mutationFn: async (post: BlogPostInsert | BlogPostUpdate) => {
      const normalizedPayload = {
        ...post,
        tags: normalizeTags(post.tags),
        related_post_slugs: normalizeRelatedSlugs(post.related_post_slugs, post.slug),
      };

      if ((post as BlogPostUpdate).id) {
        const { id, ...changes } = normalizedPayload as BlogPostUpdate;
        const { error } = await blogTable().update(changes).eq("id", id);
        if (error) throw error;
        return;
      }

      const { error } = await blogTable().insert(normalizedPayload as BlogPostInsert);
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

  const seedBlogPosts = useMutation({
    mutationFn: async () => {
      const response = await fetch(BLOG_MIGRATION_SEED_URL);
      if (!response.ok) {
        throw new Error(`Failed to load blog migration seed: ${response.status}`);
      }

      const records = (await response.json()) as BlogSeedRecord[];
      if (!Array.isArray(records) || records.length === 0) {
        return 0;
      }

      const payload = records.map(mapSeedRecordToInsert);
      const { error } = await blogTable().upsert(payload, { onConflict: "slug" });
      if (error) throw error;
      return payload.length;
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
    seedBlogPosts: seedBlogPosts.mutateAsync,
    isSaving: upsertBlogPost.isPending,
    isSeeding: seedBlogPosts.isPending,
  };
};
