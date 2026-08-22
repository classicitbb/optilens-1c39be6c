-- Fix a regression from 20260617174130_d66da831-ed25-4237-8aac-86516e322907.sql.
-- That migration replaced the public "is_active" read policy on
-- store_product_variants with a staff-only policy while introducing a
-- security_invoker=true store_product_variants_public view. Because
-- security_invoker views enforce RLS as the *querying* role (not the view
-- owner), anonymous visitors and signed-in non-staff customers silently got
-- zero rows back from every variant query — the ordering grid never rendered
-- on the storefront (or on the admin variant-config preview for non-edit-role
-- accounts).
--
-- store_product_variant_settings was left in the same state: staff-only,
-- despite holding nothing but UI config (labels, chirality, templates) — no
-- cost data.
--
-- store_product_media and store_product_overrides never had an anon policy at
-- all, so anonymous storefront visitors got no product images and no
-- badge/VAT overrides either. Also no cost data in either table.
--
-- Applied directly to production via the Lovable SQL tool on 2026-08-09
-- (see project_sql_migration_deploys memory: pushed migration files do not
-- auto-apply to the live DB). This file exists to keep history in sync.

CREATE POLICY "Public can read active store variants"
  ON public.store_product_variants FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Public can read variant settings"
  ON public.store_product_variant_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "store_product_media_read_anon"
  ON public.store_product_media FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "store_product_overrides_read_anon"
  ON public.store_product_overrides FOR SELECT
  TO anon
  USING (true);

NOTIFY pgrst, 'reload schema';
