-- Public, opt-in networking cards for staff. This is deliberately separate
-- from profiles: profiles also holds private portal and CRM linkage fields.
CREATE TABLE public.staff_public_cards (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  title text,
  organization_name text,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  email text,
  phone text,
  whatsapp_phone text,
  linkedin_url text,
  website_url text,
  avatar_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_public_cards_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT staff_public_cards_display_name_length
    CHECK (char_length(display_name) BETWEEN 1 AND 120),
  CONSTRAINT staff_public_cards_title_length
    CHECK (title IS NULL OR char_length(title) <= 160),
  CONSTRAINT staff_public_cards_bio_length
    CHECK (bio IS NULL OR char_length(bio) <= 600),
  CONSTRAINT staff_public_cards_skills_limit
    CHECK (cardinality(skills) <= 20)
);

CREATE INDEX staff_public_cards_published_slug_idx
  ON public.staff_public_cards (slug)
  WHERE is_published;

ALTER TABLE public.staff_public_cards ENABLE ROW LEVEL SECURITY;

-- A public visitor may retrieve a card only after its owner or an admin has
-- explicitly published it. Every column in this table is intentionally public.
CREATE POLICY "Published staff cards are public"
  ON public.staff_public_cards
  FOR SELECT
  TO anon, authenticated
  USING (is_published);

-- Staff can see their own draft; admins can configure any staff card from
-- Settings > Users. has_staff_role is database-owned role data, not JWT
-- metadata, so a user cannot self-promote through profile edits.
CREATE POLICY "Staff can read managed staff cards"
  ON public.staff_public_cards
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Staff can create their own card or admins can configure staff cards"
  ON public.staff_public_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_staff_role(user_id)
    AND (
      (SELECT auth.uid()) = user_id
      OR public.has_role((SELECT auth.uid()), 'admin')
    )
  );

CREATE POLICY "Staff can update their own card or admins can configure staff cards"
  ON public.staff_public_cards
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    public.has_staff_role(user_id)
    AND (
      (SELECT auth.uid()) = user_id
      OR public.has_role((SELECT auth.uid()), 'admin')
    )
  );

CREATE TRIGGER update_staff_public_cards_updated_at
  BEFORE UPDATE ON public.staff_public_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.staff_public_cards TO anon, authenticated;
GRANT INSERT, UPDATE ON public.staff_public_cards TO authenticated;

NOTIFY pgrst, 'reload schema';
