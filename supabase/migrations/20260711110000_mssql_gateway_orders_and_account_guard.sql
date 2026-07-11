-- MSSQL-SVR is the only private source for portal order status. Replace the
-- old InnovaAPI-specific operation with a general customer orders operation.
ALTER TABLE public.live_data_gateway_requests
  DROP CONSTRAINT IF EXISTS live_data_gateway_requests_operation_check;

ALTER TABLE public.live_data_gateway_requests
  ADD CONSTRAINT live_data_gateway_requests_operation_check
  CHECK (operation IN (
    'innovations.customer_account',
    'innovations.customer_statement',
    'innovations.customer_orders',
    'optilens.customer_deliveries'
  ));

-- Normalize account numbers before comparing them. This is the website-side
-- customer -> Innovations account link, so blanks are treated as no link.
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

CREATE OR REPLACE FUNCTION public.enforce_customer_account_number_unique()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_account text;
  v_conflict_id integer;
BEGIN
  v_account := public.normalized_customer_account_number(NEW.account_number);
  NEW.account_number := v_account;

  IF v_account IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_conflict_id
  FROM public.customers
  WHERE id <> NEW.id
    AND public.normalized_customer_account_number(account_number) = v_account
  LIMIT 1;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'Innovations account number % is already linked to customer id %', v_account, v_conflict_id
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_account_number_unique_guard ON public.customers;
CREATE TRIGGER customers_account_number_unique_guard
  BEFORE INSERT OR UPDATE OF account_number ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_customer_account_number_unique();

CREATE INDEX IF NOT EXISTS customers_account_number_normalized_idx
  ON public.customers (public.normalized_customer_account_number(account_number))
  WHERE public.normalized_customer_account_number(account_number) IS NOT NULL;

-- If existing data is already clean, add a hard unique index immediately. If
-- duplicates exist, the trigger still blocks new duplicates and the audit view
-- tells operators which rows must be fixed before re-running this migration.
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
