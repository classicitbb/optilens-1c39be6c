-- Run inside a transaction after the two order migrations. Roll back the whole
-- transaction, including migrations, when validating before production apply.
-- Synthetic rows never commit, and pg_net sends only after commit.
DO $test$
DECLARE admin_id uuid; customer_id uuid; account integer; oid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid();
  iid uuid; iid_again uuid; payment uuid; key uuid:=gen_random_uuid(); token text; blocked boolean:=false;
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role='admin' LIMIT 1;
  SELECT user_id,crm_customer_id INTO customer_id,account FROM public.profiles WHERE portal_access_status='approved_customer' AND crm_customer_id IS NOT NULL LIMIT 1;
  IF admin_id IS NULL OR customer_id IS NULL THEN RAISE EXCEPTION 'Invoice fixtures need an existing staff identity and approved customer.'; END IF;
  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  UPDATE public.order_dispatch_settings SET auto_transmit=false WHERE id;
  INSERT INTO public.orders(id,user_id,total_amount,status,customer_name) VALUES(oid,customer_id,0,'pending','Rollback-only fixture');
  INSERT INTO public.stock_order_submissions(id,account_id,order_id,created_by,status,payload) VALUES(sid,account,oid,admin_id,'staged','{"items":[],"raw_items":[]}');
  iid:=public.issue_order_extra_invoice('stock',sid,NULL,'[{"description":"Rollback-only extra","quantity":2,"unit_price":6.17}]',key);
  iid_again:=public.issue_order_extra_invoice('stock',sid,NULL,'[{"description":"Rollback-only extra","quantity":2,"unit_price":6.17}]',key);
  IF iid<>iid_again THEN RAISE EXCEPTION 'Invoice issuance was not idempotent'; END IF;
  SELECT payment_id INTO payment FROM public.order_extra_invoices WHERE id=iid AND total_bbd=12.34 AND user_id=customer_id;
  IF payment IS NULL THEN RAISE EXCEPTION 'Invoice total or ownership is wrong'; END IF;
  BEGIN UPDATE public.orders SET status='shipped' WHERE id=oid;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'Shipment is held%' THEN blocked:=true; ELSE RAISE; END IF;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Unpaid invoice did not hold shipment'; END IF;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  blocked:=false;
  BEGIN token:=public.begin_order_extra_invoice_payment(iid);
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='Invoice not found.' THEN blocked:=true; ELSE RAISE; END IF; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Another user could begin invoice checkout'; END IF;
  PERFORM set_config('request.jwt.claim.sub',customer_id::text,true);
  token:=public.begin_order_extra_invoice_payment(iid);
  IF length(token)<>64 THEN RAISE EXCEPTION 'Invalid invoice payment link'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.walk_in_payments WHERE id=payment AND link_token_hash=encode(extensions.digest(token,'sha256'),'hex') AND amount=12.34) THEN RAISE EXCEPTION 'Payment link or amount did not match invoice'; END IF;
  -- Simulates the trusted settlement result, without calling a payment provider.
  UPDATE public.walk_in_payments SET status='settled' WHERE id=payment;
  UPDATE public.orders SET status='shipped' WHERE id=oid;
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=oid AND status='shipped') THEN RAISE EXCEPTION 'Settled invoice did not release hold'; END IF;
END $test$;
