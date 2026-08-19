-- Statement card payments are gated by three things: the Scotia build flag,
-- the "card_payments_on_statements" master switch, and a per-customer CRM
-- `pay_by_card` flag. That last one blocks ad-hoc QA (no customer has it set
-- yet). These two flags let the Feature Board bypass it for testing without
-- touching CRM data: "admin" bypasses it for staff/admin accounts only,
-- "public" bypasses it for every signed-in customer. See
-- src/components/account/sections/StatementsSection.tsx (cardApprovalBypassed).

INSERT INTO public.website_features (key, label, description, enabled, notes) VALUES
  ('card_payments_bypass_admin', 'Card payments — bypass (admin)', 'Lets admin/staff accounts pay statements by card without the per-customer CRM approval flag, for testing the redirect flow.', false, NULL),
  ('card_payments_bypass_public', 'Card payments — bypass (public)', 'Lets any signed-in customer pay statements by card without the per-customer CRM approval flag. Testing only — turn off once real per-customer approvals are wired up.', false, NULL)
ON CONFLICT (key) DO NOTHING;
