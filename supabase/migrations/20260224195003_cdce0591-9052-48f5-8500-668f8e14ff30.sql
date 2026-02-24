
-- Update column defaults to include wspl
ALTER TABLE pricing_settings
  ALTER COLUMN category_margin_floors SET DEFAULT '{"addons":0.20,"frames":0.35,"lenses":0.30,"wspl":0.25,"supplies":0.25}'::jsonb,
  ALTER COLUMN category_target_margins SET DEFAULT '{"addons":0.40,"frames":0.50,"lenses":0.50,"wspl":0.40,"supplies":0.45}'::jsonb;

-- Backfill existing rows missing wspl key
UPDATE pricing_settings
  SET category_margin_floors = category_margin_floors || '{"wspl":0.25}'::jsonb
  WHERE NOT (category_margin_floors ? 'wspl');

UPDATE pricing_settings
  SET category_target_margins = category_target_margins || '{"wspl":0.40}'::jsonb
  WHERE NOT (category_target_margins ? 'wspl');
