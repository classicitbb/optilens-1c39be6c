-- Store lens prices are maintained as pair prices, but cart and order lines
-- must represent physical lenses. Convert active carts and saved cart drafts
-- once, keeping their monetary totals unchanged. Rx job totals are excluded.

CREATE OR REPLACE FUNCTION public.add_variant_items_to_cart(
  p_items jsonb,
  p_target_user_id uuid DEFAULT auth.uid()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_variant public.store_product_variants%ROWTYPE;
  v_qty integer;
  v_cart_qty integer;
  v_cart_price numeric;
  v_product_name text;
  v_inserted integer := 0;
BEGIN
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'A target user is required.';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_target_user_id AND NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to modify this cart.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No variant items were provided.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(v_item->>'variant_id', '') = '' THEN
      RAISE EXCEPTION 'Each row must include variant_id.';
    END IF;

    SELECT * INTO v_variant
    FROM public.store_product_variants
    WHERE id = (v_item->>'variant_id')::uuid AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % is unavailable.', v_item->>'variant_id';
    END IF;

    v_qty := GREATEST(COALESCE((v_item->>'quantity')::integer, 0), 0);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    v_product_name := v_variant.title;

    IF v_variant.product_type = 'lens' THEN
      SELECT name INTO v_product_name
      FROM public.lenses
      WHERE id = v_variant.product_id;

      v_product_name := COALESCE(v_product_name, v_variant.title);
      v_cart_qty := v_qty * 2;
      v_cart_price := round(v_variant.price / 2, 2);
    ELSE
      v_cart_qty := v_qty;
      v_cart_price := v_variant.price;
    END IF;

    INSERT INTO public.cart_items (
      user_id, product_id, product_name, product_price, product_type, quantity,
      variant_id, variant_label, variant_sku, variant_opc_code, variant_metadata
    ) VALUES (
      p_target_user_id,
      abs(hashtext(v_variant.product_type || ':' || v_variant.product_id::text)),
      v_product_name, v_cart_price, v_variant.product_type, v_cart_qty,
      v_variant.id, v_variant.title, v_variant.sku, v_variant.opc_code,
      jsonb_build_object(
        'attributes', v_variant.attributes,
        'source', 'variant_engine',
        'cart_unit', CASE WHEN v_variant.product_type = 'lens' THEN 'each' ELSE 'unit' END,
        'source_price_unit', CASE WHEN v_variant.product_type = 'lens' THEN 'pair' ELSE 'each' END
      )
    )
    ON CONFLICT (user_id, product_type, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      quantity = cart_items.quantity + EXCLUDED.quantity,
      product_price = EXCLUDED.product_price,
      product_name = EXCLUDED.product_name,
      variant_label = EXCLUDED.variant_label,
      variant_sku = EXCLUDED.variant_sku,
      variant_opc_code = EXCLUDED.variant_opc_code,
      variant_metadata = EXCLUDED.variant_metadata,
      updated_at = now();

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_variant_items_to_cart(jsonb, uuid) TO authenticated;

-- Existing variant rows stored their configuration title in `product_name`.
-- Restore the parent lens name there; the configuration stays in variant_label.
UPDATE public.cart_items AS cart
SET product_name = lens.name
FROM public.store_product_variants AS variant
JOIN public.lenses AS lens ON lens.id = variant.product_id
WHERE cart.variant_id = variant.id
  AND cart.product_type = 'lens'
  AND variant.product_type = 'lens'
  AND cart.product_name IS DISTINCT FROM lens.name;

UPDATE public.cart_items
SET
  product_price = round(product_price / 2, 2),
  quantity = quantity * 2,
  variant_metadata = COALESCE(variant_metadata, '{}'::jsonb) || '{"cart_unit":"each","source_price_unit":"pair"}'::jsonb
WHERE product_type = 'lens'
  AND COALESCE(variant_metadata->>'kind', '') <> 'rx_order'
  AND COALESCE(variant_metadata->>'cart_unit', '') <> 'each';

WITH normalised AS (
  SELECT
    draft.id,
    jsonb_agg(
      CASE
        WHEN item.value->>'product_type' = 'lens'
          AND COALESCE(item.value->'variant_metadata'->>'kind', '') <> 'rx_order'
          AND COALESCE(item.value->'variant_metadata'->>'cart_unit', '') <> 'each'
        THEN jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(item.value, '{product_price}', to_jsonb(round((item.value->>'product_price')::numeric / 2, 2))),
              '{quantity}', to_jsonb((item.value->>'quantity')::integer * 2)
            ),
            '{product_name}', to_jsonb(COALESCE(lens.name, item.value->>'product_name'))
          ),
          '{variant_metadata}',
          COALESCE(item.value->'variant_metadata', '{}'::jsonb) || '{"cart_unit":"each","source_price_unit":"pair"}'::jsonb
        )
        ELSE item.value
      END
      ORDER BY item.position
    ) AS items
  FROM public.cart_drafts AS draft
  CROSS JOIN LATERAL jsonb_array_elements(draft.items) WITH ORDINALITY AS item(value, position)
  LEFT JOIN public.store_product_variants AS variant
    ON variant.id = NULLIF(item.value->>'variant_id', '')::uuid
  LEFT JOIN public.lenses AS lens
    ON lens.id = variant.product_id
    AND variant.product_type = 'lens'
  GROUP BY draft.id
), totals AS (
  SELECT
    id,
    items,
    (SELECT COALESCE(SUM((entry.value->>'quantity')::integer), 0)::integer FROM jsonb_array_elements(items) AS entry(value)) AS total_items,
    (SELECT COALESCE(SUM((entry.value->>'product_price')::numeric * (entry.value->>'quantity')::integer), 0) FROM jsonb_array_elements(items) AS entry(value)) AS total_amount
  FROM normalised
)
UPDATE public.cart_drafts AS draft
SET items = totals.items, total_items = totals.total_items, total_amount = totals.total_amount, updated_at = now()
FROM totals
WHERE draft.id = totals.id
  AND draft.items IS DISTINCT FROM totals.items;
