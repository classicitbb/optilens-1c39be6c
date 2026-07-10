ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit numeric;

CREATE OR REPLACE VIEW public.invoices_public
WITH (security_invoker = true) AS
SELECT
  o.id,
  cu.id AS customer_id,
  cu.account_number,
  o.created_at AS issued_at,
  o.total_amount AS total,
  COALESCE(op.amount_paid, 0) AS amount_paid,
  o.total_amount - COALESCE(op.amount_paid, 0) AS balance,
  o.status AS order_status,
  CASE
    WHEN COALESCE(op.amount_paid, 0) >= o.total_amount THEN 'paid'
    WHEN COALESCE(op.amount_paid, 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END AS payment_status
FROM public.orders o
JOIN public.profiles pr ON pr.user_id = o.user_id
JOIN public.customers cu ON cu.id = pr.crm_customer_id
LEFT JOIN (
  SELECT order_id, sum(amount) AS amount_paid
  FROM public.order_payments
  WHERE status = 'settled'
  GROUP BY order_id
) op ON op.order_id = o.id
WHERE o.checkout_method = 'on_account';

CREATE OR REPLACE VIEW public.balances_public
WITH (security_invoker = true) AS
SELECT
  cu.id AS customer_id,
  cu.account_number,
  cu.credit_limit,
  COALESCE(SUM(i.balance) FILTER (WHERE i.balance > 0), 0) AS current_balance,
  COALESCE(SUM(i.balance) FILTER (WHERE i.balance > 0 AND i.issued_at < now() - interval '30 days'), 0) AS overdue_balance,
  now() AS as_of
FROM public.customers cu
LEFT JOIN public.invoices_public i ON i.customer_id = cu.id
GROUP BY cu.id, cu.account_number, cu.credit_limit;

CREATE OR REPLACE VIEW public.statements_public
WITH (security_invoker = true) AS
SELECT
  cu.id AS customer_id,
  cu.account_number,
  date_trunc('month', i.issued_at)::date AS period_start,
  (date_trunc('month', i.issued_at) + interval '1 month' - interval '1 day')::date AS period_end,
  sum(i.total) AS total_invoiced,
  sum(i.amount_paid) AS total_paid,
  sum(i.balance) AS closing_balance
FROM public.customers cu
JOIN public.invoices_public i ON i.customer_id = cu.id
GROUP BY cu.id, cu.account_number, date_trunc('month', i.issued_at);

CREATE OR REPLACE VIEW public.statement_lines_public
WITH (security_invoker = true) AS
SELECT
  cu.id AS customer_id,
  cu.account_number,
  date_trunc('month', i.issued_at)::date AS period_start,
  i.id AS invoice_id,
  i.issued_at,
  i.total,
  i.amount_paid,
  i.balance,
  i.payment_status
FROM public.customers cu
JOIN public.invoices_public i ON i.customer_id = cu.id;

GRANT SELECT ON public.invoices_public TO authenticated, service_role;
GRANT SELECT ON public.balances_public TO authenticated, service_role;
GRANT SELECT ON public.statements_public TO authenticated, service_role;
GRANT SELECT ON public.statement_lines_public TO authenticated, service_role;