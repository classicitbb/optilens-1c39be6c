-- 1. Orders / order_items / order_payments: remove client-writable paths.
-- All legitimate customer writes go through SECURITY DEFINER RPCs
-- (place_customer_order*, settle_scotia_payment, approve_pending_payment...).

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Staff can create orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Staff can insert order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own order payments" ON public.order_payments;
DROP POLICY IF EXISTS "Users can update their own order payments" ON public.order_payments;
CREATE POLICY "Staff can insert order payments"
  ON public.order_payments FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Staff can update order payments"
  ON public.order_payments FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

-- 2. Quote cost/margin fields are staff-only, enforced by trigger.

CREATE OR REPLACE FUNCTION public.protect_quote_line_cost_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_edit_role(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.unit_cost_landed_bbd := 0;
    NEW.unit_base_price_bbd  := COALESCE(NEW.unit_sell_price_bbd, 0);
    NEW.gp_amount            := 0;
    NEW.gp_percent           := 0;
    NEW.threshold_percent    := 0;
    NEW.threshold_status     := '';
    NEW.profit_status        := '';
    NEW.price_override       := false;
    NEW.override_reason      := NULL;
    NEW.override_note        := NULL;
  ELSE
    NEW.unit_cost_landed_bbd := OLD.unit_cost_landed_bbd;
    NEW.unit_base_price_bbd  := OLD.unit_base_price_bbd;
    NEW.gp_amount            := OLD.gp_amount;
    NEW.gp_percent           := OLD.gp_percent;
    NEW.threshold_percent    := OLD.threshold_percent;
    NEW.threshold_status     := OLD.threshold_status;
    NEW.profit_status        := OLD.profit_status;
    NEW.price_override       := OLD.price_override;
    NEW.override_reason      := OLD.override_reason;
    NEW.override_note        := OLD.override_note;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_quote_line_cost_fields ON public.quote_lines;
CREATE TRIGGER protect_quote_line_cost_fields
  BEFORE INSERT OR UPDATE ON public.quote_lines
  FOR EACH ROW EXECUTE FUNCTION public.protect_quote_line_cost_fields();

CREATE OR REPLACE FUNCTION public.protect_quote_cost_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_edit_role(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.subtotal_sell      := 0;
    NEW.total_landed_cost  := 0;
    NEW.gp_amount          := 0;
    NEW.gp_percent         := 0;
    NEW.grand_total        := 0;
  ELSE
    NEW.subtotal_sell      := OLD.subtotal_sell;
    NEW.total_landed_cost  := OLD.total_landed_cost;
    NEW.gp_amount          := OLD.gp_amount;
    NEW.gp_percent         := OLD.gp_percent;
    NEW.grand_total        := OLD.grand_total;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_quote_cost_fields ON public.quotes;
CREATE TRIGGER protect_quote_cost_fields
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.protect_quote_cost_fields();