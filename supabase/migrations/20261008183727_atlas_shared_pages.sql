-- Nullable layout setting preserves browser-only legacy preferences until selected again.
ALTER TABLE public.help_articles ADD COLUMN IF NOT EXISTS full_width boolean;
-- Local preparation only. Explicit shared-page access does not alter help_articles RLS.
CREATE TABLE public.atlas_page_shares (
  page_id uuid PRIMARY KEY REFERENCES public.help_articles(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_page_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_page_shares FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.atlas_page_shares TO authenticated;
CREATE POLICY atlas_shares_admin_read ON public.atlas_page_shares
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.atlas_page_accesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL, -- keep audit snapshots after page removal
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  account_email text,
  page_title text NOT NULL,
  version_number integer NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX atlas_page_accesses_page_time ON public.atlas_page_accesses(page_id, accessed_at DESC);
ALTER TABLE public.atlas_page_accesses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_page_accesses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.atlas_page_accesses TO authenticated;
CREATE POLICY atlas_accesses_admin_read ON public.atlas_page_accesses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Definer is required for a narrow projection of staff-only rows and an append-only audit.
-- Each function fixes search_path, authenticates the actor, and has explicit execution grants.
CREATE FUNCTION public.atlas_set_page_sharing(p_page_id uuid, p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_page public.help_articles; v_share public.atlas_page_shares;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') IS NOT TRUE THEN
    RAISE EXCEPTION 'Administrator permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_page FROM public.help_articles WHERE id = p_page_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Page not found' USING ERRCODE = 'P0002'; END IF;
  IF p_enabled AND (
    v_page.status IS DISTINCT FROM 'published' OR v_page.is_active IS NOT TRUE
    OR v_page.body_json ? 'lock'
    OR jsonb_path_exists(COALESCE(v_page.body_json, '{}'::jsonb), '$.** ? (@.type == "secret")')
  ) THEN RAISE EXCEPTION 'Only active published pages without passwords or secrets can be shared'; END IF;
  INSERT INTO public.atlas_page_shares(page_id, enabled) VALUES (p_page_id, p_enabled)
  ON CONFLICT (page_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()
  RETURNING * INTO v_share;
  RETURN jsonb_build_object('token', v_share.token, 'enabled', v_share.enabled);
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_set_page_sharing(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atlas_set_page_sharing(uuid, boolean) TO authenticated;

CREATE FUNCTION public.atlas_open_shared_page(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_page public.help_articles; v_actor auth.users; v_share public.atlas_page_shares;
BEGIN
  SELECT * INTO v_actor FROM auth.users WHERE id = auth.uid() AND NOT COALESCE(is_anonymous, false);
  IF NOT FOUND THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  -- Lock the share while projecting/auditing: disabling it cannot race an unaudited read.
  SELECT * INTO v_share FROM public.atlas_page_shares WHERE token = p_token AND enabled FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_page FROM public.help_articles WHERE id = v_share.page_id
    AND status = 'published' AND is_active
    AND NOT (COALESCE(body_json, '{}'::jsonb) ? 'lock')
    AND NOT jsonb_path_exists(COALESCE(body_json, '{}'::jsonb), '$.** ? (@.type == "secret")') FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO public.atlas_page_accesses(page_id, user_id, account_email, page_title, version_number)
    VALUES (v_page.id, v_actor.id, v_actor.email, v_page.title, v_page.version_number);
  -- Explicit allowlist: no draft fields, contexts, account data, share token or staff metadata.
  RETURN jsonb_build_object('title', v_page.title, 'body', v_page.body_json,
    'legacyContent', CASE WHEN v_page.body_json IS NULL THEN v_page.content ELSE '' END,
    'version', v_page.version_number, 'publishedAt', v_page.published_at, 'fullWidth', COALESCE(v_page.full_width, false));
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_open_shared_page(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atlas_open_shared_page(uuid) TO authenticated;


NOTIFY pgrst, 'reload schema';
