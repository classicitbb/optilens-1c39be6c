-- Fix: upsert (ON CONFLICT) failed for every row — a PARTIAL unique index
-- (WHERE ... IS NOT NULL) cannot be used as an ON CONFLICT arbiter. Replace the
-- partial indexes from 20260630120000 with plain unique indexes. NULLs are still
-- distinct in a plain unique index, so pre-existing rows without the external id
-- are unaffected.

DROP INDEX IF EXISTS public.customers_innovations_customer_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS customers_innovations_customer_id_key
  ON public.customers (innovations_customer_id);

DROP INDEX IF EXISTS public.contacts_innovations_contact_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_innovations_contact_id_key
  ON public.contacts (innovations_contact_id);
