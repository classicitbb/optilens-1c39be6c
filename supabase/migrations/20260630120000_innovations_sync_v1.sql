-- Innovations -> Classic Visions cloud sync (v1): customers + contacts.
-- Outbound push from the OptiLens Local office agent; idempotent upsert by
-- immutable Innovations ids. Contract: docs/integration-innovations-sync-contract.md
-- All changes are additive and reversible.

-- 1. Allow 'innovations' as an integration provider alongside 'odoo'.
ALTER TABLE public.integration_connections
  DROP CONSTRAINT IF EXISTS integration_connections_provider_check;
ALTER TABLE public.integration_connections
  ADD CONSTRAINT integration_connections_provider_check
  CHECK (provider IN ('odoo', 'innovations'));

-- 2. Immutable external-id columns on existing targets.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS innovations_customer_id bigint,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS country_code text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_innovations_customer_id_key
  ON public.customers (innovations_customer_id)
  WHERE innovations_customer_id IS NOT NULL;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS innovations_contact_id bigint,
  ADD COLUMN IF NOT EXISTS innovations_parent_customer_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_innovations_contact_id_key
  ON public.contacts (innovations_contact_id)
  WHERE innovations_contact_id IS NOT NULL;

-- 3. Sync observability (decoupled from the odoo-locked contact_sync_* tables).
CREATE TABLE IF NOT EXISTS public.innovations_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL CHECK (entity IN ('customers','contacts','invoices','statements','balances')),
  api_key_id uuid,
  dry_run boolean NOT NULL DEFAULT true,
  received integer NOT NULL DEFAULT 0,
  upserted integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','failed')),
  error_summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.innovations_sync_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  external_id text,
  api_key_id uuid,
  last_error text,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','failed_permanent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.innovations_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innovations_sync_dead_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage innovations_sync_runs" ON public.innovations_sync_runs;
CREATE POLICY "Admins manage innovations_sync_runs"
  ON public.innovations_sync_runs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage innovations_sync_dead_letters" ON public.innovations_sync_dead_letters;
CREATE POLICY "Admins manage innovations_sync_dead_letters"
  ON public.innovations_sync_dead_letters FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_innovations_sync_runs_entity_started
  ON public.innovations_sync_runs (entity, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_innovations_sync_dead_letters_status
  ON public.innovations_sync_dead_letters (status, created_at DESC);

DROP TRIGGER IF EXISTS update_innovations_sync_dead_letters_updated_at ON public.innovations_sync_dead_letters;
CREATE TRIGGER update_innovations_sync_dead_letters_updated_at
  BEFORE UPDATE ON public.innovations_sync_dead_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
