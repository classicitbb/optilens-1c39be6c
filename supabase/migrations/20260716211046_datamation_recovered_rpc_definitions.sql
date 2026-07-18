-- Recovered from the Lovable source project's read-only function-definition export.
-- SECURITY DEFINER routines use a fixed empty search_path and explicit grants.

CREATE OR REPLACE FUNCTION public.effective_prices_for_customer(p_customer_id integer)
RETURNS TABLE(item_ref uuid, treatment text, tier text, material text, price numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT (
    public.has_edit_role(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid()
        AND pr.crm_customer_id = p_customer_id
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to read prices for this customer.';
  END IF;

  RETURN QUERY
  SELECT
    pi.id,
    pi.treatment,
    pi.tier,
    pi.material,
    COALESCE(custom_line.custom_price, master_line.custom_price) AS price
  FROM public.pricing_items pi
  LEFT JOIN public.pricelists custom_pl
    ON custom_pl.kind = 'custom'
    AND custom_pl.customer_id = p_customer_id
  LEFT JOIN public.pricelist_lines custom_line
    ON custom_line.pricelist_id = custom_pl.id
    AND custom_line.item_ref = pi.id
  LEFT JOIN public.pricelists master_pl
    ON master_pl.kind = 'master'
  LEFT JOIN public.pricelist_lines master_line
    ON master_line.pricelist_id = master_pl.id
    AND master_line.item_ref = pi.id
  WHERE COALESCE(custom_line.custom_price, master_line.custom_price) IS NOT NULL
  ORDER BY pi.tier, pi.treatment, pi.material;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_contact_customer_links()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.contacts c
  SET linked_customer_id = cu.id
  FROM public.customers cu
  WHERE c.innovations_parent_customer_id IS NOT NULL
    AND c.innovations_parent_customer_id = cu.innovations_customer_id
    AND c.linked_customer_id IS DISTINCT FROM cu.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.contacts c
  SET linked_customer_id = NULL
  WHERE c.linked_customer_id IS NOT NULL
    AND (
      c.innovations_parent_customer_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM public.customers cu
        WHERE cu.innovations_customer_id = c.innovations_parent_customer_id
      )
    );

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_api_key_scopes(p_id uuid, p_scopes text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can edit API keys.';
  END IF;

  UPDATE public.api_keys
  SET scopes = COALESCE(p_scopes, '{}')
  WHERE id = p_id
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'API key not found or already revoked.';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.effective_prices_for_customer(integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.resolve_contact_customer_links()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.update_api_key_scopes(uuid, text[])
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.effective_prices_for_customer(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_contact_customer_links() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_api_key_scopes(uuid, text[]) TO authenticated;
