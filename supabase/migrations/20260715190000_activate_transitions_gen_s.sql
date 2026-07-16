-- BS1-05: root cause of the Trans Gen S auto-price fill bug (2026-07-15).
-- Confirmed live: transitions_gen_s.is_active = false — the whole grouping
-- was invisible to buildRxPricingStructure() (which filters is_active
-- groupings) regardless of classification correctness. Everything else
-- about Trans Gen S classification/labeling was already fixed
-- (classifier.ts's "Gray 8 SRC" pattern, taxonomy reconciliation label
-- rename); this is the last piece.
--
-- Not touching transitions_gen_s_2 (correctly deactivated as a duplicate,
-- migration 20260715170000) or the orphaned zero-category "transitions"
-- grouping (unrelated — nothing in the classifier ever produces that key).

UPDATE public.rx_price_groupings SET is_active = true WHERE key = 'transitions_gen_s';

NOTIFY pgrst, 'reload schema';
