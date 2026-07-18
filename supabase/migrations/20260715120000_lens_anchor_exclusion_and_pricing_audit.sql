-- BS1-02: per-item supplier-exclusion flag on lenses (see docs/PRICING_SCHEMA.md).
-- One `lenses` row already is one supplier's cost for one item, so exclusion is
-- new columns here rather than a separate supplier-cost table.

ALTER TABLE public.lenses
  ADD COLUMN IF NOT EXISTS excluded_from_anchor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluded_reason text,
  ADD COLUMN IF NOT EXISTS excluded_by uuid,
  ADD COLUMN IF NOT EXISTS excluded_at timestamptz;

-- Minimal audit table (BS1-08 extends this to cover every pricing mutation).
-- Created now so the RPC below has somewhere real to log to.
CREATE TABLE IF NOT EXISTS public.pricing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  before jsonb,
  after jsonb,
  at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can view pricing audit"
  ON public.pricing_audit FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- No INSERT/UPDATE/DELETE policy for authenticated/anon: rows are written only
-- by SECURITY DEFINER RPCs (e.g. toggle_anchor_exclusion below), never directly.

CREATE OR REPLACE FUNCTION public.toggle_anchor_exclusion(
  p_lens_id uuid,
  p_excluded boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_before jsonb;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can change anchor exclusion.';
  END IF;

  SELECT to_jsonb(l) INTO v_before FROM public.lenses l WHERE l.id = p_lens_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Lens % not found.', p_lens_id;
  END IF;

  UPDATE public.lenses
  SET excluded_from_anchor = p_excluded,
      excluded_reason = CASE WHEN p_excluded THEN p_reason ELSE NULL END,
      excluded_by = CASE WHEN p_excluded THEN auth.uid() ELSE NULL END,
      excluded_at = CASE WHEN p_excluded THEN now() ELSE NULL END
  WHERE id = p_lens_id;

  INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
  SELECT auth.uid(), 'toggle_anchor_exclusion', 'lenses', p_lens_id::text,
         v_before, to_jsonb(l)
  FROM public.lenses l WHERE l.id = p_lens_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.toggle_anchor_exclusion(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_anchor_exclusion(uuid, boolean, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
