# Walk-in payments

The selected B layout is implemented in `src/pages/admin/WalkInPaymentsPage.tsx`.
The page is flex-bounded to the admin shell: no page scrolling. `LinkActivityPanel`
fills remaining space with a separately scrolling table; its toolbar/footer stay
outside the scroll region and column headers/actions stay sticky.

The register reads all origins from existing `walk_in_payments` policies, newest
100 records, plus `order_extra_invoices` to preserve invoice cancellation/resend
protections. The limit is disclosed in the footer. Search is within loaded rows.
Cash and direct-card receipts are included. Receipt opens the existing settlement
read and display. No email delivery success is inferred from payment status.

New payment opens a modal with a single form surface. Select a collection method,
then explicitly submit: existing exact-amount/signing, published-link, request-email
and cash handlers remain authoritative. Merely changing a method does not invoke
a payment action. Match payments opens the existing matching tool. No guard,
credential, policy, schema or deployment change. Persistent drafts and delivery
repairs remain separate work.

The DEV-only `design=1` bench remains sample-only, now locked to selected B.
It has no backend/mailbox/gateway/storage integration and resets on reload.
Its draft/receipt/retry actions are simulations. Actual route omits this query.
Run `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` for local review.
