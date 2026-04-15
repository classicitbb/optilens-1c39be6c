ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_json jsonb,
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'blog_post',
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS cover_image_alt text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_post_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'content_json'
  ) THEN
    EXECUTE 'UPDATE public.blog_posts SET body_json = COALESCE(body_json, content_json) WHERE content_json IS NOT NULL';
  END IF;
END $$;

UPDATE public.blog_posts
SET entry_type = 'blog_post'
WHERE entry_type IS NULL;

ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_entry_type_check;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_entry_type_check
  CHECK (entry_type IN ('blog_post', 'newsletter'));

ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_status_check;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_blog_posts_entry_type ON public.blog_posts(entry_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING gin(tags);
