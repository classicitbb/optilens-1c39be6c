
-- Seed permission rows for new features (leads, moonshot, orders, website, runtime-errors)
-- for all existing roles that don't already have them
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
SELECT r.role, f.feature, 
  CASE WHEN r.role = 'admin' THEN true ELSE false END,
  CASE WHEN r.role = 'admin' THEN true ELSE false END
FROM (SELECT DISTINCT role FROM public.role_permissions) r
CROSS JOIN (
  VALUES ('leads'), ('moonshot'), ('orders'), ('website'), ('runtime-errors')
) AS f(feature)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp 
  WHERE rp.role = r.role AND rp.feature = f.feature
);
