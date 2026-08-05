DELETE FROM public.portal_account_audit_events
WHERE membership_id IN (
  SELECT id FROM public.portal_account_memberships
  WHERE (user_id = '120ca926-e8ff-4fde-9963-59801aa8e9ed' AND customer_id = 804)
     OR (user_id = '16713326-10ac-44f7-9e48-1ee7b9138073' AND customer_id = 822)
);

DELETE FROM public.portal_account_memberships
WHERE (user_id = '120ca926-e8ff-4fde-9963-59801aa8e9ed' AND customer_id = 804)
   OR (user_id = '16713326-10ac-44f7-9e48-1ee7b9138073' AND customer_id = 822);