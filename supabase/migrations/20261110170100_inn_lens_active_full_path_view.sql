-- Innovations lens on/off, locked rule (docs/pricing/lens-active-rule.md in Innova Training, locked 2026-11-10).
--
-- A lens option is ON only when EVERY level of its path is ON:
--   material group -> material -> MF type -> lens type (design) -> lens option
-- A level is OFF when its raw Innovations flag has the inactive bit, (flags & 2) <> 0.
-- An option whose ancestor row is missing from the mirror counts as OFF (state 'missing').
-- Lens items are not part of this view: they matter for stocked lenses only (inn_lens_items.on_active_path).
-- Reads the inn_* mirror only; apply 20261110170000_inn_pricing_mirror_tables.sql first and run the sync.

-- Every option, with the state of each level and the first level (top down) that fails.
CREATE OR REPLACE VIEW public.inn_lens_path_status WITH (security_invoker = true) AS
WITH lv AS (
  SELECT
    lo.lens_option_id, lo.group_num, lo.material_num, lo.mf_num, lo.lens_type_num, lo.option_num,
    mg.name AS material_group_name, ma.name AS material_name, mt.name AS mf_type_name, lt.name AS lens_type_name, lo.name AS option_name,
    CASE WHEN mg.material_group_id IS NULL THEN 'missing' WHEN mg.is_off THEN 'off' ELSE 'on' END AS group_state,
    CASE WHEN ma.material_id       IS NULL THEN 'missing' WHEN ma.is_off THEN 'off' ELSE 'on' END AS material_state,
    CASE WHEN mt.mf_type_id        IS NULL THEN 'missing' WHEN mt.is_off THEN 'off' ELSE 'on' END AS mf_type_state,
    CASE WHEN lt.lens_type_id      IS NULL THEN 'missing' WHEN lt.is_off THEN 'off' ELSE 'on' END AS lens_type_state,
    CASE WHEN lo.is_off THEN 'off' ELSE 'on' END AS option_state
  FROM public.inn_lens_options lo
  LEFT JOIN public.inn_lens_types lt
    ON lt.group_num = lo.group_num AND lt.material_num = lo.material_num AND lt.mf_num = lo.mf_num AND lt.lens_type_num = lo.lens_type_num
  LEFT JOIN public.inn_mf_types mt
    ON mt.group_num = lo.group_num AND mt.material_num = lo.material_num AND mt.mf_num = lo.mf_num
  LEFT JOIN public.inn_materials ma
    ON ma.group_num = lo.group_num AND ma.material_num = lo.material_num
  LEFT JOIN public.inn_material_groups mg
    ON mg.group_num = lo.group_num
)
SELECT
  lv.*,
  concat_ws('-', lv.group_num, lv.material_num, lv.mf_num, lv.lens_type_num, lv.option_num) AS path_code,
  (lv.group_state = 'on' AND lv.material_state = 'on' AND lv.mf_type_state = 'on'
    AND lv.lens_type_state = 'on' AND lv.option_state = 'on') AS on_full_path,
  (lv.option_state = 'on') AS option_only_on,
  (lv.group_state = 'missing' OR lv.material_state = 'missing' OR lv.mf_type_state = 'missing' OR lv.lens_type_state = 'missing') AS has_missing_ancestor,
  CASE
    WHEN lv.group_state     <> 'on' THEN 'material_group'
    WHEN lv.material_state  <> 'on' THEN 'material'
    WHEN lv.mf_type_state   <> 'on' THEN 'mf_type'
    WHEN lv.lens_type_state <> 'on' THEN 'lens_type'
    WHEN lv.option_state    <> 'on' THEN 'option'
  END AS first_failing_level,
  CASE
    WHEN lv.group_state     <> 'on' THEN lv.group_state
    WHEN lv.material_state  <> 'on' THEN lv.material_state
    WHEN lv.mf_type_state   <> 'on' THEN lv.mf_type_state
    WHEN lv.lens_type_state <> 'on' THEN lv.lens_type_state
    WHEN lv.option_state    <> 'on' THEN lv.option_state
  END AS first_failing_reason
FROM lv;

-- The sellable set: options ON at every level, with the alias count.
CREATE OR REPLACE VIEW public.inn_lens_active_full_path WITH (security_invoker = true) AS
SELECT
  ps.lens_option_id, ps.path_code,
  ps.material_group_name, ps.material_name, ps.mf_type_name, ps.lens_type_name, ps.option_name,
  ps.group_num, ps.material_num, ps.mf_num, ps.lens_type_num, ps.option_num,
  (SELECT count(*) FROM public.inn_lens_alias a WHERE a.lens_option_id = ps.lens_option_id)::int AS alias_count
FROM public.inn_lens_path_status ps
WHERE ps.on_full_path;

-- Counts to compare with a direct SQL Server COUNT(*) (see the runbook).
CREATE OR REPLACE VIEW public.inn_lens_path_summary WITH (security_invoker = true) AS
SELECT 'options_total'::text AS metric, count(*)::int AS n FROM public.inn_lens_path_status
UNION ALL SELECT 'option_only_on', count(*)::int FROM public.inn_lens_path_status WHERE option_only_on
UNION ALL SELECT 'full_path_on', count(*)::int FROM public.inn_lens_path_status WHERE on_full_path
UNION ALL SELECT 'full_path_on_with_alias', count(*)::int FROM public.inn_lens_active_full_path WHERE alias_count > 0
UNION ALL SELECT 'option_on_but_dropped_by_' || first_failing_level, count(*)::int
  FROM public.inn_lens_path_status WHERE option_only_on AND NOT on_full_path GROUP BY first_failing_level
UNION ALL SELECT 'options_with_missing_ancestor', count(*)::int FROM public.inn_lens_path_status WHERE has_missing_ancestor;

GRANT SELECT ON public.inn_lens_path_status, public.inn_lens_active_full_path, public.inn_lens_path_summary TO authenticated;
GRANT SELECT ON public.inn_lens_path_status, public.inn_lens_active_full_path, public.inn_lens_path_summary TO service_role;
NOTIFY pgrst, 'reload schema';
