-- Per-user launcher pins: staff right-click an admin sidebar item and pin it
-- to the app launcher. Stored per account so pins follow the user across
-- devices. `route` is an admin sidebar route (e.g. /admin/orders/quotations);
-- the client ignores pins whose route no longer exists in ADMIN_APPS.

CREATE TABLE IF NOT EXISTS public.user_launcher_pins (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route text NOT NULL CHECK (route LIKE '/admin/%' AND length(route) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, route)
);

ALTER TABLE public.user_launcher_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own launcher pins" ON public.user_launcher_pins;
CREATE POLICY "Users can select their own launcher pins"
  ON public.user_launcher_pins FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own launcher pins" ON public.user_launcher_pins;
CREATE POLICY "Users can insert their own launcher pins"
  ON public.user_launcher_pins FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own launcher pins" ON public.user_launcher_pins;
CREATE POLICY "Users can delete their own launcher pins"
  ON public.user_launcher_pins FOR DELETE
  USING (user_id = auth.uid());

REVOKE ALL ON public.user_launcher_pins FROM anon;
GRANT SELECT, INSERT, DELETE ON public.user_launcher_pins TO authenticated;

NOTIFY pgrst, 'reload schema';
