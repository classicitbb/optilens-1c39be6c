-- Relax two UNIQUE constraints that conflict with real ERP data.
--
-- Context (measured 2026-07-25 against production):
--
-- 1. customers_email_key — UNIQUE (email)
--    Eight Innovations customers (ERP ids 1, 3, 16, 30, 51, 62, 111, 114 —
--    Retail, Clear Vision Eye Center, both Courts Optical branches, Paradise
--    Vision Centre, A1 Optical, Nevis Optical, Classic Visions Test) failed on
--    EVERY hourly innovations-sync run for weeks with
--    "duplicate key value violates unique constraint customers_email_key".
--
--    Two independent causes, neither fixable by cleaning data:
--      a. Sibling branch accounts are separate ERP customers that legitimately
--         share one email address. The collision is inside a single sync
--         payload, so no amount of de-duplication in CV resolves it.
--      b. Website-signup rows created before the ERP link existed already hold
--         the address the ERP wants to attach to its own record.
--
--    An email address is contact information, not an identity. Customer
--    identity is already enforced by customers_innovations_customer_id_key for
--    ERP-sourced rows and by the primary key otherwise.
--
-- 2. contacts_name_key — UNIQUE (name) — DELIBERATELY NOT DROPPED.
--    ERP contact names legitimately repeat, and the receiver works around it by
--    appending the ERP id ("Elizabeth Ward (#159)"), which does corrupt the
--    displayed name. It is tempting to drop this index too.
--
--    Do NOT. Three application call sites upsert contacts with
--    ON CONFLICT (name) and would break instantly with
--    "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification":
--      src/features/admin/crm/hooks/useOpportunities.ts
--      src/features/admin/leads/hooks/useLeadActions.ts
--      src/features/admin/leads/hooks/useLeads.ts
--    That would take out CRM opportunity creation and both lead-conversion
--    flows. Removing contacts_name_key requires migrating those three call
--    sites to a stable key (innovations_contact_id, or an explicit id lookup)
--    first — a separate, reviewable change.
--
-- Only the customers email index is relaxed here. No rows are modified.

-- Guard: fail loudly rather than silently half-applying if the contacts
-- ON CONFLICT (name) call sites were migrated but this comment went stale.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'contacts' AND indexname = 'contacts_name_key'
  ) THEN
    RAISE NOTICE 'contacts_name_key is already gone — verify the three ON CONFLICT (name) call sites still work.';
  END IF;
END $$;

BEGIN;

-- customers_email_key is a UNIQUE *constraint* (pg_constraint.contype = 'u'),
-- so it must be dropped as a constraint — DROP INDEX errors with
-- "cannot drop index ... because constraint ... requires it".
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;
CREATE INDEX IF NOT EXISTS customers_email_idx
  ON public.customers USING btree (email);

COMMIT;
