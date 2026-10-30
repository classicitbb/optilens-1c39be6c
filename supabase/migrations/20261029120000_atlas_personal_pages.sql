-- Atlas "My pages": per-user private pages in help_articles (space = 'personal'), optionally shared
-- with chosen people. Existing rows (wiki / website / null space) are untouched, and every existing
-- policy is only NARROWED to exclude personal rows, so nothing is widened.
--
-- Access model for space = 'personal':
--   owner            read / edit / delete / manage shares
--   shared (view)    read
--   shared (edit)    read + edit (cannot change owner, space, or delete)
--   everyone else    nothing (including admins and staff: the old policies no longer match these rows)

ALTER TABLE public.help_articles ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.help_article_shares (
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_help_article_shares_user ON public.help_article_shares (user_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_owner ON public.help_articles (owner_id) WHERE space = 'personal';
ALTER TABLE public.help_article_shares ENABLE ROW LEVEL SECURITY;

-- Definer helpers break the help_articles <-> help_article_shares policy recursion.
CREATE OR REPLACE FUNCTION public.atlas_personal_owner(p_article uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.help_articles a WHERE a.id = p_article AND a.space = 'personal' AND a.owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.atlas_personal_can_read(p_article uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_staff_role(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.help_articles a
    WHERE a.id = p_article AND a.space = 'personal'
      AND (a.owner_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.help_article_shares s WHERE s.article_id = a.id AND s.user_id = auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.atlas_personal_can_edit(p_article uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_staff_role(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.help_articles a
    WHERE a.id = p_article AND a.space = 'personal'
      AND (a.owner_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.help_article_shares s WHERE s.article_id = a.id AND s.user_id = auth.uid() AND s.can_edit))
  );
$$;
REVOKE ALL ON FUNCTION public.atlas_personal_owner(uuid), public.atlas_personal_can_read(uuid), public.atlas_personal_can_edit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atlas_personal_owner(uuid), public.atlas_personal_can_read(uuid), public.atlas_personal_can_edit(uuid) TO authenticated;

-- 1. Narrow the existing help_articles policies so they never match personal rows.
DROP POLICY IF EXISTS "Admins can delete help_articles" ON public.help_articles;
CREATE POLICY "Admins can delete help_articles" ON public.help_articles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND space IS DISTINCT FROM 'personal');

DROP POLICY IF EXISTS "Anyone authenticated can read public articles" ON public.help_articles;
CREATE POLICY "Anyone authenticated can read public articles" ON public.help_articles
  FOR SELECT USING (visibility = 'public' AND space IS DISTINCT FROM 'personal');

DROP POLICY IF EXISTS "Editors can insert help_articles" ON public.help_articles;
CREATE POLICY "Editors can insert help_articles" ON public.help_articles
  FOR INSERT WITH CHECK (has_edit_role(auth.uid()) AND space IS DISTINCT FROM 'personal');

DROP POLICY IF EXISTS "Editors can update help_articles" ON public.help_articles;
CREATE POLICY "Editors can update help_articles" ON public.help_articles
  FOR UPDATE USING (has_edit_role(auth.uid()) AND space IS DISTINCT FROM 'personal')
  WITH CHECK (space IS DISTINCT FROM 'personal');

DROP POLICY IF EXISTS "Role users can select help_articles" ON public.help_articles;
CREATE POLICY "Role users can select help_articles" ON public.help_articles
  FOR SELECT TO authenticated
  USING (space IS DISTINCT FROM 'personal' AND (((visibility <> 'internal'::text) AND has_any_role(auth.uid())) OR has_staff_role(auth.uid())));

-- 2. Personal-page policies. The owner test is inline (not only via the helper) because INSERT ... RETURNING
-- evaluates the select policy before the new row is visible to a helper function's snapshot.
DROP POLICY IF EXISTS "Personal pages: read own or shared" ON public.help_articles;
CREATE POLICY "Personal pages: read own or shared" ON public.help_articles
  FOR SELECT TO authenticated
  USING (space = 'personal' AND has_staff_role(auth.uid()) AND (owner_id = auth.uid() OR public.atlas_personal_can_read(id)));

DROP POLICY IF EXISTS "Personal pages: create own" ON public.help_articles;
CREATE POLICY "Personal pages: create own" ON public.help_articles
  FOR INSERT TO authenticated
  WITH CHECK (space = 'personal' AND owner_id = auth.uid() AND visibility = 'internal' AND has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Personal pages: edit own or shared" ON public.help_articles;
CREATE POLICY "Personal pages: edit own or shared" ON public.help_articles
  FOR UPDATE TO authenticated
  USING (space = 'personal' AND has_staff_role(auth.uid()) AND (owner_id = auth.uid() OR public.atlas_personal_can_edit(id)))
  WITH CHECK (space = 'personal' AND visibility = 'internal');

DROP POLICY IF EXISTS "Personal pages: delete own" ON public.help_articles;
CREATE POLICY "Personal pages: delete own" ON public.help_articles
  FOR DELETE TO authenticated USING (space = 'personal' AND owner_id = auth.uid());

-- Owner and space are frozen once a page is personal, and a non-personal page can never become one
-- (or the reverse), so no edit path can reassign or leak a page across the boundary.
CREATE OR REPLACE FUNCTION public.atlas_freeze_personal_page()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (OLD.space = 'personal' OR NEW.space = 'personal')
     AND (NEW.space IS DISTINCT FROM OLD.space OR NEW.owner_id IS DISTINCT FROM OLD.owner_id) THEN
    RAISE EXCEPTION 'A personal page cannot change owner or space' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS atlas_freeze_personal_page ON public.help_articles;
CREATE TRIGGER atlas_freeze_personal_page BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.atlas_freeze_personal_page();

-- 3. Shares: the owner manages them; a recipient can see their own row.
REVOKE ALL ON public.help_article_shares FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_article_shares TO authenticated;
DROP POLICY IF EXISTS "Shares: owner manages" ON public.help_article_shares;
CREATE POLICY "Shares: owner manages" ON public.help_article_shares
  FOR ALL TO authenticated
  USING (public.atlas_personal_owner(article_id))
  WITH CHECK (public.atlas_personal_owner(article_id) AND user_id <> auth.uid() AND public.has_staff_role(user_id));
DROP POLICY IF EXISTS "Shares: recipient sees own" ON public.help_article_shares;
CREATE POLICY "Shares: recipient sees own" ON public.help_article_shares
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. Child tables must not leak personal pages.
DROP POLICY IF EXISTS "Role users can select help_article_versions" ON public.help_article_versions;
CREATE POLICY "Role users can select help_article_versions" ON public.help_article_versions
  FOR SELECT USING (
    has_any_role(auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.help_articles a WHERE a.id = article_id AND a.space = 'personal')
  );
DROP POLICY IF EXISTS "Personal page versions: read" ON public.help_article_versions;
CREATE POLICY "Personal page versions: read" ON public.help_article_versions
  FOR SELECT TO authenticated USING (public.atlas_personal_can_read(article_id));
DROP POLICY IF EXISTS "Personal page versions: insert" ON public.help_article_versions;
CREATE POLICY "Personal page versions: insert" ON public.help_article_versions
  FOR INSERT TO authenticated WITH CHECK (public.atlas_personal_can_edit(article_id));

DROP POLICY IF EXISTS "Staff can select internal help_article_contexts" ON public.help_article_contexts;
CREATE POLICY "Staff can select internal help_article_contexts" ON public.help_article_contexts
  FOR SELECT TO authenticated
  USING ((SELECT has_staff_role(auth.uid())) AND NOT EXISTS (SELECT 1 FROM public.help_articles a WHERE a.id = article_id AND a.space = 'personal'));

-- 5. A personal page can never get a public share link.
CREATE OR REPLACE FUNCTION public.atlas_block_personal_public_share()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.help_articles a WHERE a.id = NEW.page_id AND a.space = 'personal') THEN
    RAISE EXCEPTION 'Personal pages cannot have a public share link' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS atlas_block_personal_public_share ON public.atlas_page_shares;
CREATE TRIGGER atlas_block_personal_public_share BEFORE INSERT OR UPDATE ON public.atlas_page_shares
  FOR EACH ROW EXECUTE FUNCTION public.atlas_block_personal_public_share();

NOTIFY pgrst, 'reload schema';
