# Fix: card payments are taken but shown as failed

## What actually happened

Your live test **did** go through. Scotiabank approved the MasterCard charge of $2.00 BBD at 14:25 today (approval code on file, response "Approved or completed successfully"). Both the browser return and the bank's server-to-server notification arrived correctly and passed our security check.

The failure is on our side, after the money was taken: the step that marks the payment as settled raises an error, so nothing is saved, the payment stays "pending", and the page falls back to "We couldn't confirm your payment. No payment was made." That message is wrong — the payment was made.

## Root cause (verified)

Settling a statement payment also tries to send the payment receipt email. It calls a database helper called `enqueue_email`, which was **removed during the recent email-sending rebuild**. The call now fails, and because it happens inside the same database transaction, the whole settlement is rolled back.

Confirmed in the live database:
- Three approved gateway responses logged today (14:25, 13:00, and earlier).
- The matching payment records are all still `status = pending`.
- `enqueue_email` no longer exists; the receipt helper still calls it.

## The fix

1. Rewrite the payment-receipt helper so it no longer calls the removed queue. It will only record the receipt in the email log, and the receipt email itself will be sent by the current email system (the same one every other email now uses) instead of the old queue.
2. Make receipt sending non-blocking: even if the email step fails, the payment settlement must still commit. Money taken must never be lost because an email failed.
3. Re-settle the three approved-but-pending payments from today so the customer account reflects them (or void the two small test ones, your call — see question below).
4. Re-run a small live card payment end to end and confirm the statements page shows "payment received" and the record turns settled.

## Secondary items from your console log

- `upsert_website_analytics_session` returns 404: that database function does not exist any more, so visit tracking silently fails on every page. Fix by restoring the function (or removing the call). It does not affect payments.
- `vercel.live/feedback.js` blocked by security policy: that is Vercel's own preview feedback widget, not our code. Harmless; no change planned unless you want the widget.

## Technical detail

- `public.queue_account_payment_receipt` → drop the `PERFORM public.enqueue_email(...)` call; keep the `email_send_log` idempotency insert; send through the managed email path.
- `public.settle_statement_payment` → wrap the receipt call in an exception-swallowing block so settlement always commits.
- Same review for `settle_scotia_payment` (checkout orders) to confirm it has no equivalent dependency on the removed queue.
- Backfill: re-run settlement for `01e32e42…`, `28bd7702…`, `3de61fd9…` using their logged gateway responses in `scotia_gateway_events`.
- Restore or remove `upsert_website_analytics_session` used by `src/lib/websiteAnalytics.ts`.
