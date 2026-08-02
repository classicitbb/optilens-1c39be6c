-- Innova integration, step 1: ingested alias catalog + CV↔Innovations mapping.
-- Per INNOVA_INTEGRATION_ARCHITECTURE.md §2.1/§2.2/§4 (2026-08-01), simplified:
-- misc-items/addon_alias_map are deferred — lens aliases are the only thing
-- order validity actually needs before submission is proven.
--
-- DRAFTED FOR REVIEW — not run. You run all migrations yourself.
--
-- Sources: optilens-local data/rx/catalog.generated.json (4,163 records from
-- Zen DB LensAlias), pushed via the existing innovations-sync edge function
-- (new `lens_aliases` entity added in the same change set).

-- ── 1. Ingested alias catalog (read-mostly mirror) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.innovations_lens_aliases (
  alias                 text PRIMARY KEY,          -- 13-digit
  material_code         text NOT NULL,
  material_description  text NOT NULL,
  style_code            text NOT NULL,
  style_description     text NOT NULL,
  color_code            text NOT NULL,
  color_description     text NOT NULL,
  mf_type               text NOT NULL DEFAULT '',
  category              text NOT NULL DEFAULT '',
  suppliers             text[] NOT NULL DEFAULT '{}',
  pricing_key           text NOT NULL DEFAULT '',  -- "Material | MFType | Style" as computed by rx-catalog-sync
  is_active             boolean NOT NULL DEFAULT true,
  synced_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS innovations_lens_aliases_pricing_key_idx
  ON public.innovations_lens_aliases (pricing_key);
CREATE INDEX IF NOT EXISTS innovations_lens_aliases_codes_idx
  ON public.innovations_lens_aliases (material_code, style_code);

ALTER TABLE public.innovations_lens_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role users can select innovations_lens_aliases" ON public.innovations_lens_aliases;
CREATE POLICY "Role users can select innovations_lens_aliases"
  ON public.innovations_lens_aliases FOR SELECT
  USING (public.has_any_role(auth.uid()));

-- Writes come only through the innovations-sync edge function (service role);
-- no authenticated insert/update policy on purpose.
DROP POLICY IF EXISTS "Admins can delete innovations_lens_aliases" ON public.innovations_lens_aliases;
CREATE POLICY "Admins can delete innovations_lens_aliases"
  ON public.innovations_lens_aliases FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── 2. Mapping: CV lens ⇄ Innovations alias (the actual gap-closer) ─────────
-- One lenses row maps to many aliases — one per colour Innovations supports
-- for that material+style. Proposals land unconfirmed (confirmed_at IS NULL);
-- a human confirms via /admin/pricing/alias-mapping. Nothing auto-commits.

CREATE TABLE IF NOT EXISTS public.lens_alias_map (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id            uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  innovations_alias  text NOT NULL REFERENCES public.innovations_lens_aliases(alias) ON DELETE RESTRICT,
  lens_option_id     uuid REFERENCES public.lens_options(id),
  is_primary         boolean NOT NULL DEFAULT false, -- alias used when no colour is chosen / default
  match_confidence   numeric,                        -- 0..1 from the auto-proposer, null for manual adds
  confirmed_by       uuid,                           -- staff who confirmed the match
  confirmed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lens_id, innovations_alias)
);

CREATE INDEX IF NOT EXISTS lens_alias_map_lens_idx ON public.lens_alias_map (lens_id);
CREATE INDEX IF NOT EXISTS lens_alias_map_alias_idx ON public.lens_alias_map (innovations_alias);

-- At most one primary alias per lens.
CREATE UNIQUE INDEX IF NOT EXISTS lens_alias_map_one_primary_idx
  ON public.lens_alias_map (lens_id) WHERE is_primary;

ALTER TABLE public.lens_alias_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role users can select lens_alias_map" ON public.lens_alias_map;
CREATE POLICY "Role users can select lens_alias_map"
  ON public.lens_alias_map FOR SELECT
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert lens_alias_map" ON public.lens_alias_map;
CREATE POLICY "Editors can insert lens_alias_map"
  ON public.lens_alias_map FOR INSERT
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can update lens_alias_map" ON public.lens_alias_map;
CREATE POLICY "Editors can update lens_alias_map"
  ON public.lens_alias_map FOR UPDATE
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete lens_alias_map" ON public.lens_alias_map;
CREATE POLICY "Admins can delete lens_alias_map"
  ON public.lens_alias_map FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── 3. Resolved alias on the quote line ─────────────────────────────────────
-- When the Lens step's colour sub-step resolves a specific alias, it's stored
-- on the line so submission needs no re-resolution (and survives later
-- mapping edits). Null = mapping not done yet; submission falls back to the
-- lens's primary alias at payload-build time.

ALTER TABLE public.quote_lines
  ADD COLUMN IF NOT EXISTS innovations_alias text REFERENCES public.innovations_lens_aliases(alias);

NOTIFY pgrst, 'reload schema';
