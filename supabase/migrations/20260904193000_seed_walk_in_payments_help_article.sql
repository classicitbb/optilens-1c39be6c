-- Seed help article for walk-in payments and assign to route context

INSERT INTO public.help_articles (
  id,
  title,
  content,
  page_slug,
  sort_order,
  is_active
) VALUES (
  'e6b7c8d9-a0b1-4c2d-8e3f-4a5b6c7d8e9f',
  'Walk-in Card Payments',
  '## Purpose and route

The Walk-in Payments terminal (/admin/settings/walk-in-payments) enables authorised staff (administrators and operators) to process in-person card payments via Scotiabank''s secure hosted payment gateway. Raw card numbers, CVVs, and expiration dates are never collected or stored on Classic Visions servers.

## Step-by-step workflow

1. Enter payment details:
   - Amount (USD): Enter the exact transaction amount agreed with the customer.
   - Customer name: Enter the customer''s full name.
   - Customer email (optional): Enter the customer''s email address to automatically dispatch an electronic payment receipt upon approval.
   - Order / reference (optional): Specify an associated order number or customer reference.
   - Reason (optional): Add internal notes describing the payment purpose.
2. Initiate payment:
   - Click Take payment. The platform registers an exact-amount payment intent and redirects to Scotiabank''s hosted payment page.
3. Card entry on Scotiabank:
   - The customer or staff keys the card details on Scotiabank''s PCI-compliant hosted page.
4. Automated settlement & receipt delivery:
   - Once approved, Scotiabank redirects back to the portal where the transaction is settled.
   - If a customer email was provided, an itemised receipt email is automatically sent to the customer.
   - A modal prompt immediately asks: "Payment received! Would you like to print a physical receipt?"
   - Select Print receipt to open the print dialog, or Not now to dismiss.
   - Staff can re-print the receipt or resend the receipt email from the payment card at any time.

## Security & compliance

- No raw card storage: Classic Visions never collects, stores, or logs card numbers (PAN), CVVs, or cardholder credentials.
- Role gating: Only users with admin or operator roles can access the walk-in payment terminal.
- Tamper protection: Amounts are cryptographically signed before transferring to the bank gateway, preventing client-side modification.',
  'settings/walk-in-payments',
  15,
  true
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  page_slug = EXCLUDED.page_slug,
  is_active = EXCLUDED.is_active;

INSERT INTO public.help_article_contexts (article_id, context_slug)
VALUES ('e6b7c8d9-a0b1-4c2d-8e3f-4a5b6c7d8e9f', 'settings/walk-in-payments')
ON CONFLICT (article_id, context_slug) DO NOTHING;
