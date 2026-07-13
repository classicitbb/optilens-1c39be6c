-- Route catalog writes through a draft pricelist_version per API key.
-- If the draft has been promoted to a template (is_template=true), continue
-- updating that same version. Otherwise create a fresh draft on first write.

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS draft_pricelist_version_id integer
    REFERENCES public.pricelist_versions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.api_get_or_create_catalog_draft(p_api_key_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id integer;
  v_is_template boolean;
  v_new_id integer;
  v_key_name text;
BEGIN
  SELECT k.draft_pricelist_version_id, k.name
    INTO v_existing_id, v_key_name
  FROM public.api_keys k
  WHERE k.id = p_api_key_id;

  IF v_existing_id IS NOT NULL THEN
    SELECT pv.is_template INTO v_is_template
    FROM public.pricelist_versions pv
    WHERE pv.id = v_existing_id;
    -- Reuse the existing draft whether it is still a draft or has been saved
    -- as a template; only rotate if the underlying version no longer exists.
    IF v_is_template IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  INSERT INTO public.pricelist_versions (name, is_template)
  VALUES (coalesce('API Draft – ' || v_key_name, 'API Draft'), false)
  RETURNING id INTO v_new_id;

  UPDATE public.api_keys
     SET draft_pricelist_version_id = v_new_id
   WHERE id = p_api_key_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.api_get_or_create_catalog_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_get_or_create_catalog_draft(uuid) TO service_role;