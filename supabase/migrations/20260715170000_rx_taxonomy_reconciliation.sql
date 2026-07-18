-- BS1-05: reconcile rx_price_groupings/rx_price_categories labels with the
-- pricelist-automation classifier's taxonomy (operator decision 2026-07-15:
-- the local tool's naming/structure is authoritative going forward). See
-- src/lib/pricing/groupingMap.ts for the full classifier-output -> live-key
-- mapping this unblocks.
--
-- Every change here is a default_name rename, an is_active flip, or a new
-- additive row — matrix_allocations.category/treatment_type match by KEY
-- STRING, not id, and no key values change below, so nothing existing can
-- break: no matrix cell that was priced before this migration re-resolves
-- to a different category/grouping after it.

-- Groupings: relabel to match the classifier's exact strings.
UPDATE public.rx_price_groupings SET default_name = 'Trans Gen S™' WHERE key = 'transitions_gen_s';
UPDATE public.rx_price_groupings SET default_name = 'Trans® XtrActive® New Gen' WHERE key = 'transitions_xtractive_new_generation';
UPDATE public.rx_price_groupings SET default_name = 'Trans® XtrActive® Polarized' WHERE key = 'transitions_xtractive_polarized';

-- transitions_gen_s_2 is a redundant duplicate of transitions_gen_s (operator
-- confirmed 2026-07-15) — deactivate, do not delete (may already be
-- referenced by existing matrix_allocations rows for some pricelist_version).
UPDATE public.rx_price_groupings SET is_active = false WHERE key = 'transitions_gen_s_2';

-- Categories: relabel to match the classifier.
UPDATE public.rx_price_categories SET default_name = 'Progressive - Adept' WHERE key = 'progressive_adapt';
UPDATE public.rx_price_categories SET default_name = 'Anti-Fatigue' WHERE key = 'single_vision_antifatigue';

-- Collapse the live round/FT bifocal split onto the classifier's
-- digital/conventional split (operator confirmed 2026-07-15: round vs FT
-- carries no real price distinction today, safe to collapse).
UPDATE public.rx_price_categories SET default_name = 'Specific Use - Bifocal' WHERE key = 'specific_use_bifocal_round';
UPDATE public.rx_price_categories SET default_name = 'Specific Use - Adept Bifocal' WHERE key = 'specific_use_bifocal_ft';

-- Specific Use - Sport did not exist live at all. rx_price_categories has
-- one row PER grouping (UNIQUE(grouping_id, key), confirmed against the live
-- data dump — the same category key legitimately repeats once per grouping),
-- so add it once per active, non-deprecated grouping.
INSERT INTO public.rx_price_categories (grouping_id, key, default_name, sort_order, is_active)
SELECT
  g.id,
  'specific_use_sport',
  'Specific Use - Sport',
  COALESCE((SELECT MAX(c2.sort_order) + 1 FROM public.rx_price_categories c2 WHERE c2.grouping_id = g.id), 0),
  true
FROM public.rx_price_groupings g
WHERE g.is_active = true
  AND g.key <> 'transitions_gen_s_2'
  AND NOT EXISTS (
    SELECT 1 FROM public.rx_price_categories c WHERE c.grouping_id = g.id AND c.key = 'specific_use_sport'
  );

NOTIFY pgrst, 'reload schema';
