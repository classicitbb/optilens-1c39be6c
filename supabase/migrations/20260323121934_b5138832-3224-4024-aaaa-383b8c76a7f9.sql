
-- rx_price_groupings: top-level treatment groupings (e.g. "clear", "transitions")
CREATE TABLE public.rx_price_groupings (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  default_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rx_price_groupings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rx_price_groupings"
  ON public.rx_price_groupings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rx_price_groupings"
  ON public.rx_price_groupings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rx_price_groupings"
  ON public.rx_price_groupings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rx_price_groupings"
  ON public.rx_price_groupings FOR DELETE TO authenticated USING (true);

-- rx_price_categories: categories within a grouping
CREATE TABLE public.rx_price_categories (
  id serial PRIMARY KEY,
  grouping_id integer NOT NULL REFERENCES public.rx_price_groupings(id) ON DELETE CASCADE,
  key text NOT NULL,
  default_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grouping_id, key)
);

ALTER TABLE public.rx_price_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rx_price_categories"
  ON public.rx_price_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rx_price_categories"
  ON public.rx_price_categories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rx_price_categories"
  ON public.rx_price_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rx_price_categories"
  ON public.rx_price_categories FOR DELETE TO authenticated USING (true);

-- rx_price_grouping_versions: per-version overrides for grouping display
CREATE TABLE public.rx_price_grouping_versions (
  id serial PRIMARY KEY,
  pricelist_version_id integer NOT NULL REFERENCES public.pricelist_versions(id) ON DELETE CASCADE,
  grouping_id integer NOT NULL REFERENCES public.rx_price_groupings(id) ON DELETE CASCADE,
  display_name text,
  sort_order integer,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pricelist_version_id, grouping_id)
);

ALTER TABLE public.rx_price_grouping_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rx_price_grouping_versions"
  ON public.rx_price_grouping_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rx_price_grouping_versions"
  ON public.rx_price_grouping_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rx_price_grouping_versions"
  ON public.rx_price_grouping_versions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rx_price_grouping_versions"
  ON public.rx_price_grouping_versions FOR DELETE TO authenticated USING (true);

-- rx_price_category_versions: per-version overrides for category display
CREATE TABLE public.rx_price_category_versions (
  id serial PRIMARY KEY,
  pricelist_version_id integer NOT NULL REFERENCES public.pricelist_versions(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES public.rx_price_categories(id) ON DELETE CASCADE,
  display_name text,
  sort_order integer,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pricelist_version_id, category_id)
);

ALTER TABLE public.rx_price_category_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rx_price_category_versions"
  ON public.rx_price_category_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rx_price_category_versions"
  ON public.rx_price_category_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rx_price_category_versions"
  ON public.rx_price_category_versions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rx_price_category_versions"
  ON public.rx_price_category_versions FOR DELETE TO authenticated USING (true);
