-- Smart customer journey: controlled lens recommendations, private Rx drafts,
-- and a customer-scoped command-centre read model.

CREATE TABLE IF NOT EXISTS public.lens_recommendation_rule_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  published_by uuid REFERENCES auth.users(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS lens_recommendation_one_published_idx
  ON public.lens_recommendation_rule_sets (status)
  WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.lens_recommendation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id uuid NOT NULL REFERENCES public.lens_recommendation_rule_sets(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE RESTRICT,
  tier text NOT NULL CHECK (tier IN ('good','better','best')),
  priority integer NOT NULL DEFAULT 100,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  coating text,
  reasons text[] NOT NULL DEFAULT '{}',
  warnings text[] NOT NULL DEFAULT '{}',
  turnaround_min_days integer CHECK (turnaround_min_days IS NULL OR turnaround_min_days >= 0),
  turnaround_max_days integer CHECK (turnaround_max_days IS NULL OR turnaround_max_days >= turnaround_min_days),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_set_id, product_id, tier)
);

CREATE TABLE IF NOT EXISTS public.rx_order_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready_for_lablink','submitted_externally','archived')),
  name text NOT NULL,
  patient_reference text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation_snapshot jsonb,
  rule_set_id uuid REFERENCES public.lens_recommendation_rule_sets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rx_order_drafts_user_updated_idx
  ON public.rx_order_drafts (user_id, updated_at DESC);

ALTER TABLE public.lens_recommendation_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lens_recommendation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rx_order_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Editors manage lens recommendation rule sets" ON public.lens_recommendation_rule_sets;
CREATE POLICY "Editors manage lens recommendation rule sets"
  ON public.lens_recommendation_rule_sets FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors manage lens recommendation rules" ON public.lens_recommendation_rules;
CREATE POLICY "Editors manage lens recommendation rules"
  ON public.lens_recommendation_rules FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Customers manage their own Rx drafts" ON public.rx_order_drafts;
CREATE POLICY "Customers manage their own Rx drafts"
  ON public.rx_order_drafts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_lens_recommendation_rule_sets_updated_at ON public.lens_recommendation_rule_sets;
CREATE TRIGGER update_lens_recommendation_rule_sets_updated_at
  BEFORE UPDATE ON public.lens_recommendation_rule_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lens_recommendation_rules_updated_at ON public.lens_recommendation_rules;
CREATE TRIGGER update_lens_recommendation_rules_updated_at
  BEFORE UPDATE ON public.lens_recommendation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rx_order_drafts_updated_at ON public.rx_order_drafts;
CREATE TRIGGER update_rx_order_drafts_updated_at
  BEFORE UPDATE ON public.rx_order_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lens_recommendation_rule_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lens_recommendation_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rx_order_drafts TO authenticated;
GRANT ALL ON public.lens_recommendation_rule_sets, public.lens_recommendation_rules, public.rx_order_drafts TO service_role;

CREATE OR REPLACE FUNCTION public.publish_lens_recommendation_rule_set(p_rule_set_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Staff edit access is required.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lens_recommendation_rules WHERE rule_set_id = p_rule_set_id) THEN
    RAISE EXCEPTION 'Add at least one recommendation rule before publishing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lens_recommendation_rules r
    LEFT JOIN public.lenses l ON l.id = r.product_id
    WHERE r.rule_set_id = p_rule_set_id
      AND (l.id IS NULL OR NOT l.is_active OR NOT l.show_on_website)
  ) THEN
    RAISE EXCEPTION 'Every rule must reference an active website lens.';
  END IF;

  UPDATE public.lens_recommendation_rule_sets
  SET status = 'archived'
  WHERE status = 'published' AND id <> p_rule_set_id;

  UPDATE public.lens_recommendation_rule_sets
  SET status = 'published', published_by = auth.uid(), published_at = now()
  WHERE id = p_rule_set_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Rule set not found.'; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_lens_recommendation_rule_set(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.recommend_lenses(p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_set public.lens_recommendation_rule_sets%ROWTYPE;
  v_pricelist_id integer;
  v_result jsonb;
  v_right_sph numeric := COALESCE(NULLIF(p_input #>> '{right,sphere}', '')::numeric, 0);
  v_left_sph numeric := COALESCE(NULLIF(p_input #>> '{left,sphere}', '')::numeric, 0);
  v_right_cyl numeric := COALESCE(NULLIF(p_input #>> '{right,cylinder}', '')::numeric, 0);
  v_left_cyl numeric := COALESCE(NULLIF(p_input #>> '{left,cylinder}', '')::numeric, 0);
  v_right_add numeric := NULLIF(p_input #>> '{right,add}', '')::numeric;
  v_left_add numeric := NULLIF(p_input #>> '{left,add}', '')::numeric;
BEGIN
  SELECT * INTO v_rule_set
  FROM public.lens_recommendation_rule_sets
  WHERE status = 'published'
  ORDER BY published_at DESC NULLS LAST
  LIMIT 1;

  IF v_rule_set.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'rules_unavailable',
      'message', 'Classic Visions has not published the approved recommendation rules yet.',
      'rule_set_id', NULL,
      'rule_set_version', NULL,
      'recommendations', '[]'::jsonb
    );
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT c.assigned_pricelist_id INTO v_pricelist_id
    FROM public.profiles p
    JOIN public.customers c ON c.id = p.crm_customer_id
    WHERE p.user_id = auth.uid();
  END IF;

  WITH eligible AS (
    SELECT
      r.*,
      l.name AS product_name,
      l.index_value,
      lt.name AS lens_type,
      m.name AS material,
      CASE r.tier WHEN 'good' THEN 1 WHEN 'better' THEN 2 ELSE 3 END AS tier_order,
      (
        SELECT pcr.bbd_price
        FROM public.pricelist_catalog_rows pcr
        WHERE pcr.pricelist_version_id = v_pricelist_id
          AND pcr.item_id = l.id
          AND pcr.row_type = 'lens'
        ORDER BY pcr.updated_at DESC
        LIMIT 1
      ) AS customer_price
    FROM public.lens_recommendation_rules r
    JOIN public.lenses l ON l.id = r.product_id
    LEFT JOIN public.lenstypes lt ON lt.id = l.lenstype_id
    LEFT JOIN public.materials m ON m.id = l.material_id
    WHERE r.rule_set_id = v_rule_set.id
      AND l.is_active AND l.show_on_website
      AND v_right_sph BETWEEN l.sph_min AND l.sph_max
      AND v_left_sph BETWEEN l.sph_min AND l.sph_max
      AND v_right_cyl BETWEEN l.cyl_min AND l.cyl_max
      AND v_left_cyl BETWEEN l.cyl_min AND l.cyl_max
      AND (v_right_add IS NULL OR (l.add_min IS NOT NULL AND v_right_add BETWEEN l.add_min AND l.add_max))
      AND (v_left_add IS NULL OR (l.add_min IS NOT NULL AND v_left_add BETWEEN l.add_min AND l.add_max))
      AND (
        NOT (r.conditions ? 'age_bands')
        OR jsonb_array_length(r.conditions->'age_bands') = 0
        OR (r.conditions->'age_bands') ? COALESCE(p_input->>'ageBand', '')
      )
      AND (
        NOT (r.conditions ? 'use_cases')
        OR jsonb_array_length(r.conditions->'use_cases') = 0
        OR (r.conditions->'use_cases') ? COALESCE(p_input->>'primaryUse', '')
      )
      AND (
        NOT (r.conditions ? 'frame_types')
        OR jsonb_array_length(r.conditions->'frame_types') = 0
        OR (r.conditions->'frame_types') ? COALESCE(p_input->>'frameType', '')
      )
      AND (
        NOT (r.conditions ? 'price_levels')
        OR jsonb_array_length(r.conditions->'price_levels') = 0
        OR (r.conditions->'price_levels') ? COALESCE(p_input->>'priceLevel', '')
      )
      AND (
        NOT (r.conditions ? 'light_preferences')
        OR jsonb_array_length(r.conditions->'light_preferences') = 0
        OR (r.conditions->'light_preferences') ? COALESCE(p_input->>'lightPreference', '')
      )
      AND (
        NOT (r.conditions ? 'requires_add')
        OR (r.conditions->>'requires_add')::boolean = (v_right_add IS NOT NULL OR v_left_add IS NOT NULL)
      )
  ), ranked AS (
    SELECT DISTINCT ON (tier) * FROM eligible ORDER BY tier, priority ASC, product_name ASC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tier', tier,
      'productId', product_id,
      'productName', product_name,
      'lensType', lens_type,
      'material', material,
      'index', index_value,
      'coating', coating,
      'priceBbd', customer_price,
      'priceStatus', CASE
        WHEN auth.uid() IS NULL THEN 'sign_in_required'
        WHEN v_pricelist_id IS NULL OR customer_price IS NULL THEN 'not_assigned'
        ELSE 'available'
      END,
      'turnaround', CASE
        WHEN turnaround_min_days IS NULL OR turnaround_max_days IS NULL THEN 'Confirm with the lab'
        ELSE turnaround_min_days::text || '–' || turnaround_max_days::text || ' business days'
      END,
      'reasons', to_jsonb(reasons),
      'warnings', to_jsonb(warnings)
    ) ORDER BY tier_order
  ), '[]'::jsonb) INTO v_result FROM ranked;

  RETURN jsonb_build_object(
    'status', CASE WHEN jsonb_array_length(v_result) > 0 THEN 'ok' ELSE 'no_match' END,
    'message', CASE
      WHEN jsonb_array_length(v_result) > 0 THEN 'Approved catalogue matches found.'
      ELSE 'No published rule matches every prescription and preference entered. Ask the lab to review this order.'
    END,
    'ruleSetId', v_rule_set.id,
    'ruleSetVersion', v_rule_set.version,
    'recommendations', v_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recommend_lenses(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_command_center()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_orders jsonb;
  v_drafts jsonb;
  v_tickets jsonb;
  v_balance jsonb;
  v_statement jsonb;
  v_pricelist jsonb;
  v_innovations_as_of timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF v_profile.crm_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = v_profile.crm_customer_id;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id, 'status', o.status, 'total_amount', o.total_amount,
    'created_at', o.created_at, 'updated_at', o.updated_at, 'checkout_method', o.checkout_method
  ) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_orders FROM (SELECT * FROM public.orders WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 12) o;

  SELECT COALESCE(jsonb_agg(draft ORDER BY draft->>'updated_at' DESC), '[]'::jsonb)
  INTO v_drafts
  FROM (
    SELECT jsonb_build_object('id', id, 'kind', 'cart', 'name', name, 'status', 'draft', 'updated_at', updated_at) AS draft
    FROM public.cart_drafts WHERE user_id = v_user_id
    UNION ALL
    SELECT jsonb_build_object('id', id, 'kind', 'rx', 'name', name, 'status', status, 'updated_at', updated_at) AS draft
    FROM public.rx_order_drafts WHERE user_id = v_user_id
  ) drafts;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id, 'ticket_number', t.ticket_number, 'title', t.title,
    'closed_at', t.closed_at, 'created_at', t.created_at
  ) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_tickets
  FROM (
    SELECT * FROM public.helpdesk_tickets
    WHERE owner_user_id = v_user_id OR (v_profile.crm_contact_id IS NOT NULL AND partner_contact_id = v_profile.crm_contact_id)
    ORDER BY created_at DESC LIMIT 8
  ) t;

  IF v_customer.id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO v_balance FROM public.balances_public b WHERE b.customer_id = v_customer.id LIMIT 1;
    SELECT to_jsonb(s) INTO v_statement FROM public.statements_public s WHERE s.customer_id = v_customer.id ORDER BY s.period_end DESC LIMIT 1;
    SELECT jsonb_build_object('id', p.id, 'name', p.name, 'updated_at', p.updated_at)
      INTO v_pricelist FROM public.pricelist_versions p WHERE p.id = v_customer.assigned_pricelist_id;
  END IF;

  SELECT max(finished_at) INTO v_innovations_as_of
  FROM public.innovations_sync_runs
  WHERE status IN ('success','partial');

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'access_status', COALESCE(v_profile.portal_access_status, 'pending_profile'),
      'access_note', COALESCE(v_profile.portal_access_note, ''),
      'organization_name', v_profile.organization_name,
      'customer_name', v_customer.name
    ),
    'orders', v_orders,
    'drafts', v_drafts,
    'balance', v_balance,
    'latest_statement', v_statement,
    'tickets', v_tickets,
    'pricelist', v_pricelist,
    'sources', jsonb_build_object('innovations_as_of', v_innovations_as_of, 'website_as_of', now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_command_center() TO authenticated;
