-- Help system phase 1: page help for the customer portal.
-- Customers can already read non-internal help_articles, but help_article_contexts stays
-- staff-only (see 20260721235144_harden_customer_internal_data_access.sql and
-- scripts/audit_customer_data_access.mjs), so customers cannot see which page an article is on.
-- Rather than open that table, this function answers one question for signed-in users: the
-- published customer/public articles assigned to one portal page (portal/...) or to portal/all.
-- It never returns internal articles or non-portal assignments.

CREATE OR REPLACE FUNCTION public.get_portal_help_articles(_context_slug text)
RETURNS TABLE (id uuid, title text, content text, body_json jsonb, content_type text, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT a.id, a.title, a.content, a.body_json, a.content_type, a.sort_order
  FROM public.help_articles a
  JOIN public.help_article_contexts c ON c.article_id = a.id
  WHERE auth.uid() IS NOT NULL
    AND _context_slug LIKE 'portal/%'
    AND c.context_slug IN (_context_slug, 'portal/all')
    AND a.status = 'published'
    AND a.is_active
    AND a.visibility IN ('customer', 'public')
    AND a.space IS DISTINCT FROM 'personal'
  ORDER BY a.sort_order, a.title;
$$;

REVOKE ALL ON FUNCTION public.get_portal_help_articles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portal_help_articles(text) TO authenticated;
