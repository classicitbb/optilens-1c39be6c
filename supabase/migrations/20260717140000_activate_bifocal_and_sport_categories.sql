-- specific_use_bifocal_round existed under every active grouping but was
-- left is_active = false everywhere (a leftover from the 2026-07-15 taxonomy
-- reconciliation rename), so buildRxPricingStructure() filtered it out of
-- every grouping's category list — Auto Price's classifier maps Bifocal-tier
-- lenses to this category key (groupingMap.ts), found no matching category
-- in the structure, and silently skipped them as unmapped in every grouping,
-- not just non-clear ones.
--
-- specific_use_sport existed in 6 of 7 active groupings (added by the same
-- 2026-07-15 migration, scoped to "every active grouping" at the time) but
-- was never backfilled for transitions_gen_s specifically — same failure
-- mode, narrower blast radius.

UPDATE public.rx_price_categories
SET is_active = true, updated_at = now()
WHERE key = 'specific_use_bifocal_round'
  AND grouping_id IN (SELECT id FROM public.rx_price_groupings WHERE is_active = true);

INSERT INTO public.rx_price_categories (grouping_id, key, default_name, sort_order, is_active)
SELECT g.id, 'specific_use_sport', 'Specific Use - Sport', 5, true
FROM public.rx_price_groupings g
WHERE g.key = 'transitions_gen_s'
ON CONFLICT (grouping_id, key) DO UPDATE
SET is_active = true, sort_order = EXCLUDED.sort_order, updated_at = now();

NOTIFY pgrst, 'reload schema';
