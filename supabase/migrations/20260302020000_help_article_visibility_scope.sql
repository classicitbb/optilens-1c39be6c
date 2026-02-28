CREATE OR REPLACE FUNCTION public.context_slug_feature(_context_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _context_slug IS NULL OR _context_slug = '' THEN NULL
    WHEN _context_slug = 'all' THEN 'wiki'
    WHEN _context_slug IN ('knowledge/wiki', 'knowledge/help') THEN 'wiki'
    WHEN _context_slug IN ('pricing/catalog') THEN 'catalog'
    WHEN _context_slug IN ('pricing/reference') THEN 'reference'
    WHEN _context_slug IN ('pricing/rx-lenses') THEN 'rx-lens-prices'
    WHEN _context_slug IN ('pricing/stock-lenses') THEN 'stock-lens-prices'
    WHEN _context_slug IN ('pricing/supplies') THEN 'supplies-prices'
    WHEN _context_slug IN ('pricing/settings') THEN 'pricing-settings'
    WHEN _context_slug IN ('pricing/imports') THEN 'imports'
    WHEN _context_slug IN ('pricing/costings', 'pricing/costings/reports') THEN 'costings'
    WHEN _context_slug IN ('pricing/publisher') THEN 'catalog-publisher'
    WHEN _context_slug IN ('sales/quotations') THEN 'quotations'
    WHEN _context_slug LIKE 'crm%' THEN 'crm'
    WHEN _context_slug IN ('contacts') THEN 'contacts'
    WHEN _context_slug IN ('website/content') THEN 'content'
    WHEN _context_slug IN ('settings/company') THEN 'parameters'
    WHEN _context_slug IN ('settings/users') THEN 'users'
    WHEN _context_slug IN ('settings/roles') THEN 'roles'
    WHEN _context_slug IN ('settings/audit') THEN 'audit'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_visible_help_articles(requested_page_slug text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  page_slug text,
  category text,
  sort_order integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  help_article_contexts jsonb
)
LANGUAGE sql
STABLE
AS $$
  WITH user_roles_for_session AS (
    SELECT role
    FROM public.user_roles
    WHERE user_id = auth.uid()
  ),
  visible_articles AS (
    SELECT
      a.id,
      a.title,
      a.content,
      a.page_slug,
      a.category,
      a.sort_order,
      a.is_active,
      a.created_at,
      a.updated_at,
      COALESCE(
        jsonb_agg(DISTINCT jsonb_build_object('context_slug', c.context_slug))
          FILTER (WHERE c.context_slug IS NOT NULL),
        '[]'::jsonb
      ) AS help_article_contexts,
      COALESCE(array_agg(DISTINCT c.context_slug) FILTER (WHERE c.context_slug IS NOT NULL), ARRAY[a.page_slug]) AS context_slugs
    FROM public.help_articles a
    LEFT JOIN public.help_article_contexts c ON c.article_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id
  )
  SELECT
    va.id,
    va.title,
    va.content,
    va.page_slug,
    va.category,
    va.sort_order,
    va.is_active,
    va.created_at,
    va.updated_at,
    va.help_article_contexts
  FROM visible_articles va
  WHERE EXISTS (
    SELECT 1
    FROM unnest(va.context_slugs) AS scope(context_slug)
    WHERE (requested_page_slug IS NULL OR scope.context_slug = requested_page_slug OR scope.context_slug = 'all')
      AND EXISTS (
        SELECT 1
        FROM user_roles_for_session ur
        JOIN public.role_permissions rp ON rp.role = ur.role
        WHERE rp.feature = public.context_slug_feature(scope.context_slug)
          AND rp.can_view = true
      )
  )
  ORDER BY va.sort_order, va.title;
$$;
