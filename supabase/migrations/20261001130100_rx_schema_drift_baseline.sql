-- Rx order data model, Phase 0 (part 2): record schema that exists on the live
-- database but was never captured in a migration, so a fresh database built
-- from this repo matches production. Every statement is idempotent and a no-op
-- where the live schema already has the object (verified 2026-10-01).
--
--  * public.rx_order_drafts      — Lens Assistant / form draft handoff
--  * quote_frame_details.trace_geometry — full frame-trace geometry
--  * job_scope gains 'remote_edge'      — remote edge is its own scope, not
--    'full_glaze'. The lab spelling ("traced_uncut" / "remote trace") is a
--    delivery-layer mapping, not stored here.

CREATE TABLE IF NOT EXISTS public.rx_order_drafts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL,
  status                  text NOT NULL DEFAULT 'draft',
  name                    text NOT NULL,
  patient_reference       text,
  input_payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation_snapshot jsonb,
  rule_set_id             uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.lens_recommendation_rule_sets') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rx_order_drafts_rule_set_id_fkey') THEN
    ALTER TABLE public.rx_order_drafts
      ADD CONSTRAINT rx_order_drafts_rule_set_id_fkey
      FOREIGN KEY (rule_set_id) REFERENCES public.lens_recommendation_rule_sets(id);
  END IF;
END $$;

ALTER TABLE public.rx_order_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers manage their own Rx drafts" ON public.rx_order_drafts;
CREATE POLICY "Customers manage their own Rx drafts"
  ON public.rx_order_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.quote_frame_details
  ADD COLUMN IF NOT EXISTS trace_geometry jsonb;

ALTER TABLE public.quote_frame_details
  DROP CONSTRAINT IF EXISTS quote_frame_details_job_scope_check;
ALTER TABLE public.quote_frame_details
  ADD CONSTRAINT quote_frame_details_job_scope_check
  CHECK (job_scope IN ('surface_only', 'full_glaze', 'remote_edge'));
