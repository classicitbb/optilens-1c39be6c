-- Payment Activity: attach the customer name / account number as a memo.
-- Already applied to the live DB; this file brings the repo in line with it.
-- Display-safe fields only (no gateway payloads, card data or tokens).
CREATE OR REPLACE VIEW public.scotia_payment_activity
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (event.oid)
  event.created_at AS occurred_at,
  event.oid AS payment_reference,
  CASE WHEN event.oid LIKE 'STMT-%' THEN 'statement' ELSE 'order' END AS transaction_type,
  CASE
    WHEN event.outcome = 'ok' AND event.approved IS TRUE THEN 'Successful'
    WHEN event.outcome = 'declined' THEN 'Declined'
    ELSE 'Error'
  END AS status,
  event.amount,
  event.currency,
  COALESCE(cust.name, walk_in.customer_name, ord.customer_name, prof.full_name, prof.display_name) AS account_name,
  COALESCE(stmt.account_number, cust.account_number) AS account_number
FROM public.scotia_gateway_events AS event
LEFT JOIN public.account_payments stmt
  ON event.oid LIKE 'STMT-%' AND stmt.id::text = substr(event.oid, 6)
LEFT JOIN public.walk_in_payments walk_in
  ON event.oid LIKE 'WALKIN-%' AND walk_in.payment_reference = event.oid
LEFT JOIN public.orders ord
  ON event.oid NOT LIKE 'STMT-%' AND event.oid NOT LIKE 'WALKIN-%' AND ord.id::text = event.oid
LEFT JOIN public.profiles prof
  ON prof.id = COALESCE(stmt.user_id, ord.user_id)
LEFT JOIN public.customers cust
  ON cust.id = COALESCE(stmt.crm_customer_id, prof.crm_customer_id)
WHERE event.oid IS NOT NULL
  AND (
    event.kind IN ('return', 'notify')
    OR (event.kind = 'prepare' AND event.outcome = 'error')
  )
ORDER BY event.oid, event.created_at DESC;

REVOKE ALL ON TABLE public.scotia_payment_activity FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.scotia_payment_activity TO authenticated;

NOTIFY pgrst, 'reload schema';
