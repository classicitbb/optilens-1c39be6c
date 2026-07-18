-- Bulk version of BS1-02's toggle_anchor_exclusion — kicking out a whole
-- supplier or brand from anchor pricing one lens at a time isn't practical
-- once a supplier has 50+ SKUs. Same audit trail (pricing_audit), one row
-- per lens, not a single bulk row, so the existing per-lens audit view keeps
-- working unmodified.

CREATE OR REPLACE FUNCTION public.bulk_toggle_anchor_exclusion(
  p_lens_ids uuid[],
  p_excluded boolean,
  p_reason text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count integer := 0;
  v_lens_id uuid;
  v_before jsonb;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can change anchor exclusion.';
  END IF;

  FOREACH v_lens_id IN ARRAY p_lens_ids LOOP
    SELECT to_jsonb(l) INTO v_before FROM public.lenses l WHERE l.id = v_lens_id;
    IF v_before IS NULL THEN
      CONTINUE; -- lens no longer exists, skip rather than fail the whole batch
    END IF;

    UPDATE public.lenses
    SET excluded_from_anchor = p_excluded,
        excluded_reason = CASE WHEN p_excluded THEN p_reason ELSE NULL END,
        excluded_by = CASE WHEN p_excluded THEN auth.uid() ELSE NULL END,
        excluded_at = CASE WHEN p_excluded THEN now() ELSE NULL END
    WHERE id = v_lens_id;

    INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
    SELECT auth.uid(), 'bulk_toggle_anchor_exclusion', 'lenses', v_lens_id::text, v_before, to_jsonb(l)
    FROM public.lenses l WHERE l.id = v_lens_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.bulk_toggle_anchor_exclusion(uuid[], boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_toggle_anchor_exclusion(uuid[], boolean, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
