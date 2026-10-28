-- Supplementary charges are independent invoices, never editable cart prices.
CREATE SEQUENCE public.order_extra_invoice_number_seq;
CREATE TABLE public.order_extra_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE DEFAULT ('CV-EX-' || lpad(nextval('public.order_extra_invoice_number_seq')::text,6,'0')),
  request_key uuid NOT NULL UNIQUE,
  account_id integer NOT NULL REFERENCES public.customers(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  order_id uuid REFERENCES public.orders(id),
  rx_submission_id uuid REFERENCES public.rx_order_submissions(id),
  stock_submission_id uuid REFERENCES public.stock_order_submissions(id),
  lines jsonb NOT NULL CHECK (jsonb_typeof(lines)='array' AND jsonb_array_length(lines)>0),
  total_bbd numeric(12,2) NOT NULL CHECK(total_bbd>0 AND total_bbd<=999999.99),
  payment_id uuid NOT NULL UNIQUE REFERENCES public.walk_in_payments(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(rx_submission_id, stock_submission_id)=1)
);
CREATE INDEX order_extra_invoices_user ON public.order_extra_invoices(user_id);
CREATE INDEX order_extra_invoices_order ON public.order_extra_invoices(order_id);
ALTER TABLE public.order_extra_invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_extra_invoices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.order_extra_invoices TO authenticated;
GRANT ALL ON public.order_extra_invoices TO service_role;
CREATE POLICY "Read own supplementary invoices or staff" ON public.order_extra_invoices FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_edit_role(auth.uid()));
REVOKE ALL ON SEQUENCE public.order_extra_invoice_number_seq FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.issue_order_extra_invoice(p_kind text, p_submission_id uuid, p_user_id uuid, p_lines jsonb, p_request_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_account integer; v_order uuid; v_user uuid; v_name text; v_email text;
  v_line jsonb; v_clean jsonb := '[]'; v_total numeric := 0; v_qty integer; v_price numeric;
  v_payment uuid; v_id uuid; v_number text; v_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_edit_role(auth.uid()),false) THEN RAISE EXCEPTION 'Only staff can issue supplementary invoices.'; END IF;
  SELECT id INTO v_id FROM public.order_extra_invoices WHERE request_key=p_request_key AND created_by=auth.uid();
  IF FOUND THEN RETURN v_id; END IF;
  IF p_kind='rx' THEN
    SELECT account_id,order_id INTO v_account,v_order FROM public.rx_order_submissions WHERE id=p_submission_id AND status<>'cancelled' FOR UPDATE;
  ELSIF p_kind='stock' THEN
    SELECT account_id,order_id INTO v_account,v_order FROM public.stock_order_submissions WHERE id=p_submission_id AND status<>'cancelled' FOR UPDATE;
  ELSE RAISE EXCEPTION 'Choose an Rx or stock order.'; END IF;
  IF v_account IS NULL THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF v_order IS NOT NULL THEN
    SELECT user_id,status INTO v_user,v_status FROM public.orders WHERE id=v_order FOR UPDATE;
    IF v_status IN ('shipped','delivered','completed','cancelled') THEN RAISE EXCEPTION 'Cannot add a payment hold after shipment or cancellation.'; END IF;
    IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'Invoice recipient must own the original order.'; END IF;
  ELSE
    SELECT user_id INTO v_user FROM public.profiles WHERE user_id=p_user_id AND crm_customer_id=v_account AND portal_access_status='approved_customer';
  END IF;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Select an approved portal customer linked to this account.'; END IF;
  SELECT COALESCE(NULLIF(full_name,''),NULLIF(display_name,''),'Customer') INTO v_name FROM public.profiles WHERE user_id=v_user;
  SELECT email INTO v_email FROM auth.users WHERE id=v_user;
  IF p_lines IS NULL OR jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)=0 OR jsonb_array_length(p_lines)>50 THEN RAISE EXCEPTION 'Add between one and 50 invoice lines.'; END IF;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    IF NULLIF(btrim(v_line->>'description'),'') IS NULL OR length(v_line->>'description')>500 THEN RAISE EXCEPTION 'Every line needs a description (maximum 500 characters).'; END IF;
    IF (v_line->>'quantity') IS NULL OR (v_line->>'quantity') !~ '^[1-9][0-9]{0,3}$' THEN RAISE EXCEPTION 'Quantity must be a whole number between 1 and 9999.'; END IF;
    v_qty := (v_line->>'quantity')::integer;
    IF (v_line->>'unit_price') IS NULL OR (v_line->>'unit_price') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN RAISE EXCEPTION 'Enter a non-negative BBD unit price with at most two decimal places.'; END IF;
    v_price := (v_line->>'unit_price')::numeric;
    v_total := v_total+v_qty*v_price;
    v_clean := v_clean || jsonb_build_object('description',btrim(v_line->>'description'),'quantity',v_qty,'unit_price',v_price);
  END LOOP;
  IF v_total<=0 OR v_total>999999.99 THEN RAISE EXCEPTION 'Invoice total must be between BBD 0.01 and 999999.99.'; END IF;
  v_number := 'CV-EX-' || lpad(nextval('public.order_extra_invoice_number_seq')::text,6,'0');
  v_payment := public.create_walk_in_payment(v_total, COALESCE(v_name,'Customer'), v_number, 'Additional order charges - shipment held until paid', v_email);
  INSERT INTO public.order_extra_invoices(invoice_number,request_key,account_id,user_id,order_id,rx_submission_id,stock_submission_id,lines,total_bbd,payment_id,created_by)
  VALUES(v_number,p_request_key,v_account,v_user,v_order,CASE WHEN p_kind='rx' THEN p_submission_id END,CASE WHEN p_kind='stock' THEN p_submission_id END,v_clean,v_total,v_payment,auth.uid()) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE FUNCTION public.list_order_extra_invoices() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',i.id,'invoice_number',i.invoice_number,'account_id',i.account_id,'order_id',i.order_id,'rx_submission_id',i.rx_submission_id,'stock_submission_id',i.stock_submission_id,'user_id',i.user_id,'lines',i.lines,'total_bbd',i.total_bbd,'status',CASE WHEN p.status='settled' THEN 'paid' ELSE 'unpaid' END,'created_at',i.created_at) ORDER BY i.created_at DESC),'[]')
 FROM public.order_extra_invoices i JOIN public.walk_in_payments p ON p.id=i.payment_id WHERE i.user_id=auth.uid() OR public.has_edit_role(auth.uid());
$$;

CREATE FUNCTION public.begin_order_extra_invoice_payment(p_invoice_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE i public.order_extra_invoices%ROWTYPE; p public.walk_in_payments%ROWTYPE; token text;
BEGIN
  SELECT * INTO i FROM public.order_extra_invoices WHERE id=p_invoice_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  SELECT * INTO p FROM public.walk_in_payments WHERE id=i.payment_id FOR UPDATE;
  IF p.status='settled' THEN RAISE EXCEPTION 'This invoice is already paid.'; END IF;
  IF p.status='failed' THEN RAISE EXCEPTION 'The payment failed. Please contact staff to review the payment before retrying.'; END IF;
  IF p.token_used_at IS NOT NULL THEN RAISE EXCEPTION 'Payment was already started. Wait for confirmation or contact staff before trying again.'; END IF;
  token := encode(extensions.gen_random_bytes(32),'hex');
  UPDATE public.walk_in_payments SET origin='assisted_link',link_token_hash=encode(extensions.digest(token,'sha256'),'hex'),link_expires_at=now()+interval '30 minutes',published_at=now() WHERE id=p.id;
  RETURN token;
END $$;

CREATE FUNCTION public.hold_order_with_unpaid_extras() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('shipped','delivered','completed') AND OLD.status IS DISTINCT FROM NEW.status AND EXISTS(
    SELECT 1 FROM public.order_extra_invoices i JOIN public.walk_in_payments p ON p.id=i.payment_id WHERE i.order_id=NEW.id AND p.status<>'settled'
  ) THEN RAISE EXCEPTION 'Shipment is held until all supplementary invoices are paid.'; END IF;
  IF NEW.status IN ('shipped','delivered','completed') AND OLD.status IS DISTINCT FROM NEW.status AND (
    EXISTS(SELECT 1 FROM public.stock_order_submissions s WHERE s.order_id=NEW.id
      AND jsonb_path_exists(s.payload,'$.items[*] ? (@.price_pending == true)')
      AND NOT EXISTS(SELECT 1 FROM public.order_extra_invoices i JOIN public.walk_in_payments p ON p.id=i.payment_id WHERE i.stock_submission_id=s.id AND p.status='settled'))
    OR EXISTS(SELECT 1 FROM public.rx_order_submissions s JOIN public.quote_lines l ON l.quote_id=s.quote_id WHERE s.order_id=NEW.id AND l.needs_assistance AND l.assistance_note ILIKE '%not priced%'
      AND NOT EXISTS(SELECT 1 FROM public.order_extra_invoices i JOIN public.walk_in_payments p ON p.id=i.payment_id WHERE i.rx_submission_id=s.id AND p.status='settled'))
  ) THEN RAISE EXCEPTION 'Shipment is held until unquoted items are invoiced and paid.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hold_order_with_unpaid_extras BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.hold_order_with_unpaid_extras();
REVOKE ALL ON FUNCTION public.issue_order_extra_invoice(text,uuid,uuid,jsonb,uuid),public.list_order_extra_invoices(),public.begin_order_extra_invoice_payment(uuid),public.hold_order_with_unpaid_extras() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_order_extra_invoice(text,uuid,uuid,jsonb,uuid),public.list_order_extra_invoices(),public.begin_order_extra_invoice_payment(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
