-- BS1-05: align rx_price_categories.sort_order with the already-released
-- customer-facing pricelist order (operator screenshot, 2026-07-15):
-- Best, Better, Good, Adept/Conventional, Office, Sport, Anti-Fatigue,
-- Single Vision (Endless), Single Vision (Conventional), Bifocal (Endless),
-- Adept Bifocal/Conventional (Conventional BF/TF). This independently
-- confirms the "Adept" spelling and category set from the taxonomy
-- reconciliation migration (20260715170000) — this screenshot is the
-- released source of truth for both naming and order.
--
-- Sets the SAME sort_order for a given key across every grouping (not just
-- one), since buildRxPricingStructure() takes the minimum sort_order across
-- groupings sharing a key — leaving them inconsistent would just be
-- confusing to read, even though it wouldn't visibly break rendering.

UPDATE public.rx_price_categories SET sort_order = 0  WHERE key = 'progressive_best';
UPDATE public.rx_price_categories SET sort_order = 1  WHERE key = 'progressive_better';
UPDATE public.rx_price_categories SET sort_order = 2  WHERE key = 'progressive_good';
UPDATE public.rx_price_categories SET sort_order = 3  WHERE key = 'progressive_adapt';
UPDATE public.rx_price_categories SET sort_order = 4  WHERE key = 'specific_use_office';
UPDATE public.rx_price_categories SET sort_order = 5  WHERE key = 'specific_use_sport';
UPDATE public.rx_price_categories SET sort_order = 6  WHERE key = 'single_vision_antifatigue';
UPDATE public.rx_price_categories SET sort_order = 7  WHERE key = 'single_vision_hd';
UPDATE public.rx_price_categories SET sort_order = 8  WHERE key = 'single_vision_regular';
UPDATE public.rx_price_categories SET sort_order = 9  WHERE key = 'specific_use_bifocal_round';
UPDATE public.rx_price_categories SET sort_order = 10 WHERE key = 'specific_use_bifocal_ft';

-- Not part of the released structure and unreachable by the classifier
-- (nothing in TIER_MAP maps here) — push to the end rather than leaving it
-- interleaved at its old position.
UPDATE public.rx_price_categories SET sort_order = 11 WHERE key = 'single_vision_curved_wrap';

NOTIFY pgrst, 'reload schema';
