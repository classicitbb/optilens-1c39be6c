-- Innovations pricing mirror, phase 1: read-only inn_* tables fed by innovations-sync.
--
-- DO NOT run from CI or git push: apply by hand (see docs/INNOVATIONS_PRICING_MIRROR_RUNBOOK.md).
-- Schema only. No data is read or written here; the tables stay empty until the office
-- sync is run (dry-run first). Nothing in this file touches Innovations.
--
-- Generated from optilens-local/lib/innovations-pricing-mirror.js (SPECS) so the columns,
-- the receiver allowlist in supabase/functions/innovations-sync/index.ts and the office
-- mapper cannot drift apart. Each row: the Innovations key columns, the raw flags where the
-- source has them, source_updated_at (Innovations LastUpdated), source_hash, last_synced_at.
-- source_changed_at moves only when source_hash really changes (trigger below).
-- Off rows are kept as rows; is_off is the raw "inactive" bit, (flags & 2) <> 0.
-- Access: admins read; the service role (edge function) writes.

CREATE TABLE IF NOT EXISTS public.inn_price_lists (
  price_list_id integer PRIMARY KEY,
  parent_price_list_id integer,
  price_list_name text,
  code text,
  price_list_group integer,
  currency_id integer,
  is_active boolean,
  active_start_date timestamptz,
  active_end_date timestamptz,
  cost_plus_pricing boolean,
  cost_plus_type smallint,
  cost_plus_percent numeric(14,4),
  cost_plus_amount numeric(14,4),
  discount_pricelist boolean,
  discount_percent numeric(14,4),
  edging_charge numeric(14,4),
  flat_edging_charge boolean,
  enabled_decimals boolean,
  num_decimals smallint,
  use_stock_price boolean,
  use_rx_if_no_stock_price boolean,
  include_power_rx boolean,
  include_power_stock boolean,
  power_over_std boolean,
  rule_based_selection boolean,
  rule_priority integer,
  and_rule boolean,
  apply_freight_charges boolean,
  price_edging_on_farmout boolean,
  suppress_zero_freight boolean,
  suppress_zero_lines integer,
  prompt_use_stock_flags integer,
  prompt_use_stock_price boolean,
  gen_pricing_error integer,
  invoice_type_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inn_rx_pos_sheets (
  price_rx_pos_sheet_id integer PRIMARY KEY,
  price_list_id integer,
  sheet_name text,
  retail_name text,
  pricesheet_type smallint,
  grid_layout smallint,
  is_active boolean,
  is_discount boolean,
  modifier_value numeric(14,4),
  price numeric(14,4),
  ih_price boolean,
  edged boolean,
  uncut boolean,
  edging_charge numeric(14,4),
  flat_edging_charge boolean,
  use_edging_price_list boolean,
  price_pos_charge_id integer,
  gl_account_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_rx_pos_sheets_price_list_id_idx ON public.inn_rx_pos_sheets (price_list_id);

CREATE TABLE IF NOT EXISTS public.inn_rx_pos_members (
  price_rx_pos_member_id integer PRIMARY KEY,
  price_list_id integer,
  price_rx_pos_sheet_id integer,
  price_lens_group_id integer,
  edged smallint,
  uncut smallint,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_rx_pos_members_price_list_id_idx ON public.inn_rx_pos_members (price_list_id);
CREATE INDEX IF NOT EXISTS inn_rx_pos_members_price_rx_pos_sheet_id_idx ON public.inn_rx_pos_members (price_rx_pos_sheet_id);

CREATE TABLE IF NOT EXISTS public.inn_rx_pos_items (
  price_rx_pos_item_id integer PRIMARY KEY,
  price_rx_pos_sheet_id integer,
  price_lens_group_id integer,
  material_group_num integer,
  material_num integer,
  mf_type_num integer,
  lens_type_num integer,
  lens_option_num integer,
  min_sphere smallint,
  max_sphere smallint,
  min_cylinder smallint,
  max_cylinder smallint,
  price numeric(14,4),
  ih_price boolean,
  modifier_type smallint,
  modifier_value numeric(14,4),
  modifier_is_discount boolean,
  pos_diopter_price numeric(14,4),
  pos_diopter_value numeric(14,4),
  pos_charge_id integer,
  retail_name text,
  invoice_type_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_rx_pos_items_price_rx_pos_sheet_id_idx ON public.inn_rx_pos_items (price_rx_pos_sheet_id);
CREATE INDEX IF NOT EXISTS inn_rx_pos_items_material_group_num_material_num_mf_type__idx ON public.inn_rx_pos_items (material_group_num, material_num, mf_type_num, lens_type_num, lens_option_num);

CREATE TABLE IF NOT EXISTS public.inn_price_lens_groups (
  price_lens_group_id integer PRIMARY KEY,
  price_lens_group_name text,
  code text,
  flags integer,
  is_active boolean,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inn_stock_lenses (
  price_stock_lens_id integer PRIMARY KEY,
  price_list_id integer,
  price_lens_group_id integer,
  stock_lens_name text,
  retail_name text,
  pricesheet_type smallint,
  grid_layout smallint,
  is_active boolean,
  is_discount boolean,
  modifier_value numeric(14,4),
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_stock_lenses_price_list_id_idx ON public.inn_stock_lenses (price_list_id);

CREATE TABLE IF NOT EXISTS public.inn_stock_lens_items (
  price_stock_lens_item_id integer PRIMARY KEY,
  price_stock_lens_id integer,
  vendor_id integer,
  material_group_num integer,
  material_num integer,
  mf_type_num integer,
  lens_type_num integer,
  lens_option_num integer,
  sphere smallint,
  cylinder smallint,
  diameter smallint,
  price numeric(14,4),
  ih_price boolean,
  modifier_type smallint,
  modifier_value numeric(14,4),
  modifier_is_discount boolean,
  retail_name text,
  invoice_type_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_stock_lens_items_price_stock_lens_id_idx ON public.inn_stock_lens_items (price_stock_lens_id);

CREATE TABLE IF NOT EXISTS public.inn_stock_vendors (
  price_stock_vendor_id integer PRIMARY KEY,
  price_stock_lens_id integer,
  vendor_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_stock_vendors_price_stock_lens_id_idx ON public.inn_stock_vendors (price_stock_lens_id);

CREATE TABLE IF NOT EXISTS public.inn_packages (
  package_id integer PRIMARY KEY,
  package_name text,
  sku text,
  is_active boolean,
  priority integer,
  active_start_date timestamptz,
  active_end_date timestamptz,
  and_misc_inclusion boolean,
  and_rule_exclusion boolean,
  and_rule_inclusion boolean,
  power_over_std boolean,
  suppress_lines integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inn_package_items (
  package_item_id integer PRIMARY KEY,
  package_id integer,
  item_type integer,
  exclusion boolean,
  id01 integer,
  id02 integer,
  id03 integer,
  id04 integer,
  id05 integer,
  id06 integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_package_items_package_id_idx ON public.inn_package_items (package_id);

CREATE TABLE IF NOT EXISTS public.inn_price_packages (
  price_package_id integer PRIMARY KEY,
  price_list_id integer,
  price_package_name text,
  retail_name text,
  price numeric(14,4),
  modifier_value numeric(14,4),
  is_active boolean,
  is_discount boolean,
  flags integer,
  invoice_flags integer,
  pricesheet_type smallint,
  ih_price boolean,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_price_packages_price_list_id_idx ON public.inn_price_packages (price_list_id);

CREATE TABLE IF NOT EXISTS public.inn_price_package_members (
  price_package_member_id integer PRIMARY KEY,
  package_id integer,
  price_list_id integer,
  price_package_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_price_package_members_price_list_id_package_id_idx ON public.inn_price_package_members (price_list_id, package_id);
CREATE INDEX IF NOT EXISTS inn_price_package_members_price_package_id_idx ON public.inn_price_package_members (price_package_id);

CREATE TABLE IF NOT EXISTS public.inn_price_package_items (
  price_package_item_id integer PRIMARY KEY,
  package_id integer,
  price_package_id integer,
  price numeric(14,4),
  retail_name text,
  ih_price boolean,
  ih_retail_name boolean,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_price_package_items_price_package_id_idx ON public.inn_price_package_items (price_package_id);
CREATE INDEX IF NOT EXISTS inn_price_package_items_package_id_idx ON public.inn_price_package_items (package_id);

CREATE TABLE IF NOT EXISTS public.inn_labs (
  lab_num smallint PRIMARY KEY,
  lab_id integer,
  name text,
  abbr text,
  flags smallint,
  flags2 smallint,
  po_supplier_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inn_lab_extras (
  lab_extra_id integer PRIMARY KEY,
  lab_num integer,
  price_list_id integer,
  local_lab smallint,
  taxable boolean,
  destination_format integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_lab_extras_lab_num_idx ON public.inn_lab_extras (lab_num);
CREATE INDEX IF NOT EXISTS inn_lab_extras_price_list_id_idx ON public.inn_lab_extras (price_list_id);

CREATE TABLE IF NOT EXISTS public.inn_currencies (
  currency_id integer PRIMARY KEY,
  currency_name text,
  symbol text,
  current_exchange_rate double precision,
  decimal_places smallint,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inn_material_groups (
  material_group_id integer PRIMARY KEY,
  group_num smallint,
  name text,
  abbrev text,
  flags smallint,
  settings smallint,
  je_default boolean,
  is_off boolean GENERATED ALWAYS AS ((COALESCE(flags, 0) & 2) <> 0) STORED,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inn_material_groups_group_num_uidx ON public.inn_material_groups (group_num);

CREATE TABLE IF NOT EXISTS public.inn_materials (
  material_id integer PRIMARY KEY,
  material_group_id integer,
  group_num smallint,
  material_num smallint,
  name text,
  abbrev text,
  refractive_index double precision,
  flags smallint,
  settings smallint,
  is_off boolean GENERATED ALWAYS AS ((COALESCE(flags, 0) & 2) <> 0) STORED,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inn_materials_group_num_material_num_uidx ON public.inn_materials (group_num, material_num);

CREATE TABLE IF NOT EXISTS public.inn_mf_types (
  mf_type_id integer PRIMARY KEY,
  material_id integer,
  group_num smallint,
  material_num smallint,
  mf_num smallint,
  name text,
  abbrev text,
  flags smallint,
  settings smallint,
  is_off boolean GENERATED ALWAYS AS ((COALESCE(flags, 0) & 2) <> 0) STORED,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inn_mf_types_group_num_material_num_mf_num_uidx ON public.inn_mf_types (group_num, material_num, mf_num);

CREATE TABLE IF NOT EXISTS public.inn_lens_types (
  lens_type_id integer PRIMARY KEY,
  mf_type_id integer,
  group_num smallint,
  material_num smallint,
  mf_num smallint,
  lens_type_num smallint,
  name text,
  abbrev text,
  code smallint,
  flags smallint,
  settings smallint,
  is_off boolean GENERATED ALWAYS AS ((COALESCE(flags, 0) & 2) <> 0) STORED,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inn_lens_types_group_num_material_num_mf_num_lens_type__uidx ON public.inn_lens_types (group_num, material_num, mf_num, lens_type_num);

CREATE TABLE IF NOT EXISTS public.inn_lens_options (
  lens_option_id integer PRIMARY KEY,
  lens_type_id integer,
  group_num smallint,
  material_num smallint,
  mf_num smallint,
  lens_type_num smallint,
  option_num integer,
  name text,
  abbrev text,
  lab smallint,
  price1 double precision,
  cost double precision,
  price_chart smallint,
  bill_code text,
  add_group smallint,
  flags smallint,
  flags2 smallint,
  settings smallint,
  is_off boolean GENERATED ALWAYS AS ((COALESCE(flags, 0) & 2) <> 0) STORED,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inn_lens_options_group_num_material_num_mf_num_lens_type__uidx ON public.inn_lens_options (group_num, material_num, mf_num, lens_type_num, option_num);

CREATE TABLE IF NOT EXISTS public.inn_lens_items (
  lens_item_id integer PRIMARY KEY,
  lens_option_id integer,
  group_num smallint,
  material_num smallint,
  mf_num smallint,
  lens_type_num smallint,
  option_num integer,
  item_num integer,
  name text,
  manufacturer smallint,
  fin_semi smallint,
  diameter smallint,
  base_sphere smallint,
  add_cyl smallint,
  price1 numeric(14,4),
  cost numeric(14,4),
  reorder_cost numeric(14,4),
  flags smallint,
  flags2 smallint,
  on_active_path boolean,
  is_off boolean GENERATED ALWAYS AS ((COALESCE(flags, 0) & 2) <> 0) STORED,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inn_lens_items_group_num_material_num_mf_num_lens_type__uidx ON public.inn_lens_items (group_num, material_num, mf_num, lens_type_num, option_num, item_num);
CREATE INDEX IF NOT EXISTS inn_lens_items_lens_option_id_idx ON public.inn_lens_items (lens_option_id);

CREATE TABLE IF NOT EXISTS public.inn_lens_alias (
  lens_alias_id integer PRIMARY KEY,
  alias text,
  lens_option_id integer,
  group_num smallint,
  material_num smallint,
  mf_num smallint,
  lens_type_num smallint,
  option_num integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inn_lens_alias_alias_uidx ON public.inn_lens_alias (alias);
CREATE INDEX IF NOT EXISTS inn_lens_alias_lens_option_id_idx ON public.inn_lens_alias (lens_option_id);

CREATE TABLE IF NOT EXISTS public.inn_customer_price_list (
  customer_id integer PRIMARY KEY,
  account_number text,
  customer_name text,
  is_active boolean,
  price_list_id integer,
  rx_edged_price_list_id integer,
  rx_uncut_price_list_id integer,
  fin_edged_price_list_id integer,
  fin_uncut_price_list_id integer,
  stock_lens_price_list_id integer,
  package_price_list_id integer,
  misc_item_price_list_id integer,
  frame_price_list_id integer,
  freight_price_list_id integer,
  add_price_list_id integer,
  os_price_list_id integer,
  prism_price_list_id integer,
  special_price_list_id integer,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_customer_price_list_price_list_id_idx ON public.inn_customer_price_list (price_list_id);

CREATE TABLE IF NOT EXISTS public.inn_invoice_lines (
  invoice_line_id integer PRIMARY KEY,
  invoice_id integer,
  customer_id integer,
  invoice_time timestamptz,
  price_list_id integer,
  price_list_name text,
  price_group_id integer,
  package_id integer,
  category_type smallint,
  suppressed boolean,
  quantity double precision,
  price_list_price numeric(14,4),
  invoice_price numeric(14,4),
  cost_price numeric(14,4),
  description text,
  sku text,
  line_number integer,
  reference_order_id bigint,
  source_updated_at timestamptz,
  source_hash text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  source_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_invoice_lines_invoice_time_idx ON public.inn_invoice_lines (invoice_time);
CREATE INDEX IF NOT EXISTS inn_invoice_lines_price_list_id_idx ON public.inn_invoice_lines (price_list_id);


-- ── change stamp: only a real content change (hash) moves source_changed_at ────────────────
CREATE OR REPLACE FUNCTION public.inn_stamp_source_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.source_hash IS NOT DISTINCT FROM OLD.source_hash THEN
    NEW.source_changed_at := OLD.source_changed_at;
  ELSE
    NEW.source_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inn_price_lists', 'inn_rx_pos_sheets', 'inn_rx_pos_members',
    'inn_rx_pos_items', 'inn_price_lens_groups', 'inn_stock_lenses',
    'inn_stock_lens_items', 'inn_stock_vendors', 'inn_packages',
    'inn_package_items', 'inn_price_packages', 'inn_price_package_members',
    'inn_price_package_items', 'inn_labs', 'inn_lab_extras',
    'inn_currencies', 'inn_material_groups', 'inn_materials',
    'inn_mf_types', 'inn_lens_types', 'inn_lens_options',
    'inn_lens_items', 'inn_lens_alias', 'inn_customer_price_list',
    'inn_invoice_lines'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_stamp_change', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.inn_stamp_source_change()', t || '_stamp_change', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admins can read ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role))', 'Admins can read ' || t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- ── manual link: which Innovations customer price list a website price document corresponds to ──
-- There is no id link between pricelist_versions and Innovations PriceLists today (names only).
-- Reconciliation (a) reads only the lists mapped here. One row per website version; staff fill it.
CREATE TABLE IF NOT EXISTS public.inn_pricelist_map (
  pricelist_version_id integer PRIMARY KEY REFERENCES public.pricelist_versions(id) ON DELETE CASCADE,
  inn_price_list_id integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inn_pricelist_map_inn_list_idx ON public.inn_pricelist_map (inn_price_list_id);
ALTER TABLE public.inn_pricelist_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage inn_pricelist_map" ON public.inn_pricelist_map;
CREATE POLICY "Admins manage inn_pricelist_map" ON public.inn_pricelist_map FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.inn_pricelist_map FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inn_pricelist_map TO authenticated;
GRANT ALL ON public.inn_pricelist_map TO service_role;

-- ── receiver run log: widen the entity check, or the run-log inserts fail silently (AGENTS.md step 2) ──
ALTER TABLE public.innovations_sync_runs DROP CONSTRAINT IF EXISTS innovations_sync_runs_entity_check;
ALTER TABLE public.innovations_sync_runs ADD CONSTRAINT innovations_sync_runs_entity_check CHECK (entity IN (
  'banks', 'customers', 'contacts', 'invoices',
  'statements', 'statement_lines', 'balances', 'order_activity',
  'lens_aliases', 'supplies', 'store_lenses', 'store_lens_power_rows',
  'inn_price_lists', 'inn_rx_pos_sheets', 'inn_rx_pos_members', 'inn_rx_pos_items',
  'inn_price_lens_groups', 'inn_stock_lenses', 'inn_stock_lens_items', 'inn_stock_vendors',
  'inn_packages', 'inn_package_items', 'inn_price_packages', 'inn_price_package_members',
  'inn_price_package_items', 'inn_labs', 'inn_lab_extras', 'inn_currencies',
  'inn_material_groups', 'inn_materials', 'inn_mf_types', 'inn_lens_types',
  'inn_lens_options', 'inn_lens_items', 'inn_lens_alias', 'inn_customer_price_list',
  'inn_invoice_lines'
));

NOTIFY pgrst, 'reload schema';
