DROP FUNCTION IF EXISTS public.select_contacts_for_enrichment(integer, text);
CREATE FUNCTION public.select_contacts_for_enrichment(p_limit integer DEFAULT 40, p_mode text DEFAULT 'scheduled'::text)
 RETURNS TABLE(id uuid, name text, business_name text, street text, city text, state text, zip text, country text, country_code text, website text, phone text, google_place_id text, innovations_contact_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'select_contacts_for_enrichment requires the service role';
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.business_name, c.street, c.city, c.state, c.zip,
         c.country, c.country_code, c.website, c.phone, c.google_place_id,
         c.innovations_contact_id
  FROM public.contacts c
  LEFT JOIN LATERAL (
    SELECT max(a.attempted_at) AS last_at
    FROM public.contact_enrichment_attempts a
    WHERE a.contact_id = c.id
  ) a ON true
  WHERE c.is_archived = false
    AND COALESCE(NULLIF(BTRIM(c.business_name), ''), NULLIF(BTRIM(c.name), '')) IS NOT NULL
    AND (p_mode <> 'oncreate' OR (a.last_at IS NULL AND c.created_at > now() - interval '24 hours'))
    AND (a.last_at IS NULL OR a.last_at < now() - interval '30 days')
    AND (
      NULLIF(BTRIM(c.website), '') IS NULL
      OR NULLIF(BTRIM(c.city), '') IS NULL
      OR NULLIF(BTRIM(c.phone), '') IS NULL
      OR c.google_place_id IS NULL
    )
  ORDER BY a.last_at NULLS FIRST, c.updated_at DESC
  LIMIT least(greatest(p_limit, 1), 100);
END;
$function$;
REVOKE ALL ON FUNCTION public.select_contacts_for_enrichment(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_contacts_for_enrichment(integer, text) TO service_role;