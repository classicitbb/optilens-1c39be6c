-- Help system phase 1: move help_article_contexts rows off context slugs that no longer match any
-- page (pre-reorganisation admin paths) onto the current context slugs derived from
-- src/features/admin/core/config/apps.ts, so the articles show in the help panel again.
--
-- Only help_article_contexts changes. help_articles.page_slug is left alone: legal pages are
-- looked up by page_slug and Atlas' website space stores page_slug 'knowledge'.
-- Left untouched on purpose: privacy-policy and terms-conditions (legal pages, not page help),
-- moonshot (archived article, no current page) and help/... slugs (SOP placement, see Atlas).

CREATE TEMPORARY TABLE help_context_remap (old_slug text, new_slug text, article_id uuid) ON COMMIT DROP;

INSERT INTO help_context_remap (old_slug, new_slug, article_id) VALUES
  ('quotations',       'orders/quotations',  NULL),
  ('sales/quotations', 'orders/quotations',  NULL),
  ('catalog',          'pricing/catalog',    NULL),
  ('imports',          'pricing/imports',    NULL),
  ('reference',        'pricing/reference',  NULL),
  ('supplies-prices',  'pricing/pricelists', NULL),
  ('users',            'settings/users',     NULL),
  ('parameters',       'settings/company',   NULL),
  ('settings',         'settings/company',   NULL),
  ('wiki',             'knowledge/wiki',     NULL),
  ('knowledge',        'knowledge/wiki',     NULL),
  -- "pricing" held two articles: the pricing overview belongs on Pricelists, the catalog guide on Product Catalog.
  ('pricing',          'pricing/catalog',    '59e6f03e-658c-4208-b2dc-94e8a8544ad4'),
  ('pricing',          'pricing/pricelists', NULL),
  -- "content" (old website content page) held two customer-facing articles; they belong on portal pages.
  ('content',          'portal/rx-order',    '59fbac88-e1ba-49f4-bb15-2a59b601cdfe'),
  ('content',          'portal/helpdesk',    '59ae80dd-44d7-4314-b4b5-363fbffe0f3f');

-- An article-specific row wins over the generic row for the same old slug.
INSERT INTO public.help_article_contexts (article_id, context_slug)
SELECT c.article_id, COALESCE(specific.new_slug, generic.new_slug)
FROM public.help_article_contexts c
LEFT JOIN help_context_remap specific ON specific.old_slug = c.context_slug AND specific.article_id = c.article_id
LEFT JOIN help_context_remap generic ON generic.old_slug = c.context_slug AND generic.article_id IS NULL
WHERE COALESCE(specific.new_slug, generic.new_slug) IS NOT NULL
ON CONFLICT (article_id, context_slug) DO NOTHING;

DELETE FROM public.help_article_contexts c
WHERE c.context_slug IN (SELECT DISTINCT old_slug FROM help_context_remap);
