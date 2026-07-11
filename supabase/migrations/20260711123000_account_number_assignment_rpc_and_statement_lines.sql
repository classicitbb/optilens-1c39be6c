-- Guided Innovations account-number assignment.
--
-- customers.account_number is a single-owner portal link by policy. Operators
-- should get a structured conflict result before any unique-index exception
-- reaches the UI.

DROP INDEX IF EXISTS public.customers_account_number_key;

CREATE OR REPLACE FUNCTION public.normalized_customer_account_number(p_account_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(upper(btrim(p_account_number)), '')
$$;

CREATE OR REPLACE VIEW public.customer_account_number_duplicates AS
SELECT
  public.normalized_customer_account_number(account_number) AS account_number,
  count(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS customer_ids,
  array_agg(name ORDER BY id) AS customer_names
FROM public.customers
WHERE public.normalized_customer_account_number(account_number) IS NOT NULL
GROUP BY public.normalized_customer_account_number(account_number)
HAVING count(*) > 1;

REVOKE ALL ON public.customer_account_number_duplicates FROM anon, PUBLIC;
GRANT SELECT ON public.customer_account_number_duplicates TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.customer_account_number_duplicates)
     AND NOT EXISTS (
       SELECT 1 FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname = 'customers_account_number_normalized_key'
     ) THEN
    CREATE UNIQUE INDEX customers_account_number_normalized_key
      ON public.customers (public.normalized_customer_account_number(account_number))
      WHERE public.normalized_customer_account_number(account_number) IS NOT NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_customer_by_account_number(p_account_number text)
RETURNS TABLE (
  id integer,
  name text,
  account_number text,
  innovations_customer_id integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT c.id, c.name, c.account_number, c.innovations_customer_id
  FROM public.customers c
  WHERE public.normalized_customer_account_number(c.account_number) = public.normalized_customer_account_number(p_account_number)
  ORDER BY c.updated_at DESC NULLS LAST, c.id DESC
$$;

GRANT EXECUTE ON FUNCTION public.find_customer_by_account_number(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_customer_account_number(
  p_customer_id integer,
  p_account_number text
)
RETURNS TABLE (
  ok boolean,
  status text,
  customer_id integer,
  account_number text,
  conflict_customer_id integer,
  conflict_customer_name text,
  conflict_account_number text,
  message text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account text;
  v_target_id integer;
  v_conflict record;
BEGIN
  v_account := public.normalized_customer_account_number(p_account_number);

  -- Serialize operator assignments so the preflight conflict check and update
  -- agree even if two admins save the same account number at nearly the same time.
  LOCK TABLE public.customers IN SHARE ROW EXCLUSIVE MODE;

  SELECT c.id INTO v_target_id
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF v_target_id IS NULL THEN
    RETURN QUERY SELECT
      false,
      'not_found'::text,
      p_customer_id,
      v_account,
      NULL::integer,
      NULL::text,
      NULL::text,
      format('Customer #%s was not found.', p_customer_id);
    RETURN;
  END IF;

  IF v_account IS NOT NULL THEN
    SELECT c.id, c.name, c.account_number
    INTO v_conflict
    FROM public.customers c
    WHERE c.id <> p_customer_id
      AND public.normalized_customer_account_number(c.account_number) = v_account
    ORDER BY c.updated_at DESC NULLS LAST, c.id DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT
        false,
        'conflict'::text,
        p_customer_id,
        v_account,
        v_conflict.id::integer,
        v_conflict.name::text,
        v_conflict.account_number::text,
        format('%s is already linked to Customer #%s: %s', v_account, v_conflict.id, coalesce(v_conflict.name, 'Unnamed customer'));
      RETURN;
    END IF;
  END IF;

  UPDATE public.customers
  SET account_number = v_account
  WHERE id = p_customer_id;

  RETURN QUERY SELECT
    true,
    CASE WHEN v_account IS NULL THEN 'cleared' ELSE 'assigned' END::text,
    p_customer_id,
    v_account,
    NULL::integer,
    NULL::text,
    NULL::text,
    CASE WHEN v_account IS NULL
      THEN format('Customer #%s account number was cleared.', p_customer_id)
      ELSE format('Customer #%s account number was set to %s.', p_customer_id, v_account)
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_customer_account_number(integer, text) TO authenticated, service_role;
