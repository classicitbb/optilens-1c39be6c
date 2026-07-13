-- The customer portal needs to display its resolved ERP account number without
-- making that source-managed value editable through the profile form.
CREATE OR REPLACE FUNCTION public.get_portal_erp_account_number()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT NULLIF(BTRIM(c.account_number::text), '')
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_portal_erp_account_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portal_erp_account_number() TO authenticated;
