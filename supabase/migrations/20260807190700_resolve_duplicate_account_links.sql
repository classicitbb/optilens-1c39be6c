-- Resolve duplicate website links without deleting any CRM or portal data.
-- The Innovations-owned row is canonical. Any non-ERP rows that happen to
-- carry the same account number retain their record and relationships, but
-- lose the invalid ERP-link value. This makes the repair safe to automate.

CREATE OR REPLACE VIEW public.customer_account_number_duplicates
WITH (security_invoker = true) AS
SELECT
  public.normalized_customer_account_number(account_number) AS account_number,
  count(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS customer_ids,
  array_agg(name ORDER BY id) AS customer_names,
  array_agg(contact_id ORDER BY id) AS customer_contact_ids,
  array_agg(innovations_customer_id IS NOT NULL ORDER BY id) AS customer_is_erp
FROM public.customers
WHERE public.normalized_customer_account_number(account_number) IS NOT NULL
GROUP BY public.normalized_customer_account_number(account_number)
HAVING count(*) > 1;

REVOKE ALL ON public.customer_account_number_duplicates FROM anon, PUBLIC;
GRANT SELECT ON public.customer_account_number_duplicates TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_non_erp_duplicate_account_link(
  p_account_number text
)
RETURNS TABLE (
  ok boolean,
  status text,
  account_number text,
  canonical_customer_id integer,
  cleared_customer_ids integer[],
  message text
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_account text := public.normalized_customer_account_number(p_account_number);
  v_canonical_customer_id integer;
  v_erp_count integer;
  v_cleared_customer_ids integer[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only an administrator can resolve duplicate Innovations account links'
      USING ERRCODE = '42501';
  END IF;

  IF v_account IS NULL THEN
    RETURN QUERY SELECT false, 'invalid_account', NULL::text, NULL::integer, ARRAY[]::integer[], 'An account number is required.';
    RETURN;
  END IF;

  -- Keep the decision and update atomic with any concurrent account changes.
  PERFORM 1
  FROM public.customers
  WHERE public.normalized_customer_account_number(account_number) = v_account
  FOR UPDATE;

  SELECT count(*), min(id)
  INTO v_erp_count, v_canonical_customer_id
  FROM public.customers
  WHERE public.normalized_customer_account_number(account_number) = v_account
    AND innovations_customer_id IS NOT NULL;

  IF v_erp_count <> 1 THEN
    RETURN QUERY SELECT
      false,
      'manual_review',
      v_account,
      NULL::integer,
      ARRAY[]::integer[],
      CASE WHEN v_erp_count = 0
        THEN 'No Innovations-owned account was found, so nothing was changed.'
        ELSE 'More than one Innovations-owned account was found, so nothing was changed.'
      END;
    RETURN;
  END IF;

  WITH cleared AS (
    UPDATE public.customers
    SET account_number = NULL
    WHERE public.normalized_customer_account_number(account_number) = v_account
      AND id <> v_canonical_customer_id
      AND innovations_customer_id IS NULL
    RETURNING id
  )
  SELECT coalesce(array_agg(id ORDER BY id), ARRAY[]::integer[])
  INTO v_cleared_customer_ids
  FROM cleared;

  IF cardinality(v_cleared_customer_ids) = 0 THEN
    RETURN QUERY SELECT false, 'manual_review', v_account, v_canonical_customer_id, v_cleared_customer_ids,
      'No non-ERP duplicate account link was found to clear.';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'resolved', v_account, v_canonical_customer_id, v_cleared_customer_ids,
    format('Kept Innovations account on Customer #%s and cleared it from %s non-ERP record%s.',
      v_canonical_customer_id, cardinality(v_cleared_customer_ids),
      CASE WHEN cardinality(v_cleared_customer_ids) = 1 THEN '' ELSE 's' END);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_non_erp_duplicate_account_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_non_erp_duplicate_account_link(text) TO authenticated, service_role;
