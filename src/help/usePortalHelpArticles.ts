import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canonicalToHtml, toCanonicalDocument } from "@/lib/wikiCanonical";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";

export interface PortalHelpArticle {
  id: string;
  title: string;
  content: string;
  body_json: BlogCanonicalContent;
  content_type: string | null;
}

/**
 * Published customer- or public-visibility articles assigned to a portal page (or to portal/all).
 * Read through get_portal_help_articles: customers cannot read help_article_contexts directly.
 */
export const usePortalHelpArticles = (contextSlug: string, enabled: boolean) =>
  useQuery({
    queryKey: ["portal_help_articles", contextSlug],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_portal_help_articles", { _context_slug: contextSlug });
      if (error) throw error;
      return ((data ?? []) as any[]).map((row): PortalHelpArticle => {
        const doc = toCanonicalDocument(row.body_json ?? row.content);
        return { id: row.id, title: row.title, content: canonicalToHtml(doc), body_json: doc, content_type: row.content_type ?? null };
      });
    },
    enabled,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
