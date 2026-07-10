DROP VIEW IF EXISTS public.statement_lines_public CASCADE;
DROP VIEW IF EXISTS public.statements_public CASCADE;

CREATE OR REPLACE VIEW public.statements_public
WITH (security_invoker = true) AS
SELECT
  cu.id::text || ':' || to_char(date_trunc('month', i.issued_at), 'YYYY-MM-DD') AS id,
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
  cu.id::text || ':' || to_char(date_trunc('month', i.issued_at), 'YYYY-MM-DD') AS statement_id,
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

REVOKE ALL ON public.statements_public FROM anon, PUBLIC;
REVOKE ALL ON public.statement_lines_public FROM anon, PUBLIC;
GRANT SELECT ON public.statements_public TO authenticated, service_role;
GRANT SELECT ON public.statement_lines_public TO authenticated, service_role;