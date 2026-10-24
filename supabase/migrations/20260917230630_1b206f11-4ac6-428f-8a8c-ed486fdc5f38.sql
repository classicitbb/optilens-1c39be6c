INSERT INTO public.walk_in_payments (
  id, created_by, customer_name, amount, payment_reference, origin,
  link_token_hash, claim_code_hash, link_expires_at, published_at, status
) VALUES (
  '11111111-2222-3333-4444-555555555555',
  (SELECT created_by FROM public.walk_in_payments WHERE created_by IS NOT NULL ORDER BY created_at DESC LIMIT 1),
  'Diagnostic Test', 1.00, 'WALKIN-11111111-2222-3333-4444-555555555555', 'assisted_link',
  encode(extensions.digest('diagnostic-token-abc', 'sha256'), 'hex'),
  encode(extensions.digest('TEST99', 'sha256'), 'hex'),
  now() + interval '20 minutes', now(), 'pending'
) ON CONFLICT (id) DO UPDATE SET link_expires_at = now() + interval '20 minutes', token_used_at = NULL, status = 'pending';