
-- Add CMS columns to help_articles
ALTER TABLE public.help_articles
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'wiki',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- Add an index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_help_articles_content_type ON public.help_articles(content_type);
CREATE INDEX IF NOT EXISTS idx_help_articles_visibility ON public.help_articles(visibility);

-- Update existing RLS: allow all authenticated users to read public/customer articles
-- (current policy already allows has_any_role, which is fine for internal users)
-- We need a policy for public content that doesn't require a role
CREATE POLICY "Anyone authenticated can read public articles"
  ON public.help_articles
  FOR SELECT
  USING (visibility = 'public');
