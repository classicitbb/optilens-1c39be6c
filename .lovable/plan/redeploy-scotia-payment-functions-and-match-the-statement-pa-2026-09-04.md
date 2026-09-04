# Redeploy Scotia payment functions and match the statement payment process

## Goal
Push the current code for the four changed backend functions live, then make the walk-in card payment flow behave exactly like the statement card payment flow that now works end to end.

## What is already true (verified)
- Statement card payments settle through `settle_statement_payment` and then send a receipt email via the current managed email transport, from both the browser return trip and the bank's server-to-server notification.
- Order card payments settle through `settle_scotia_payment` and send the paid-order email the same way. Neither settlement routine depends on the removed email queue.
- Walk-in card payments settle through `settle_walk_in_payment` on both the return trip and the notification, but no receipt or confirmation email is sent for them, so that flow is the one that is out of step.
- All three flows are already signed in Barbados dollars.

## Work

1. Redeploy the four functions so the live versions match the code:
   - the assistant's platform facts (part of the Copilot function)
   - the payment start function
   - the browser return handler
   - the bank notification handler

2. Bring walk-in payments to statement parity:
   - Add a walk-in payment receipt email built on the same shared sender used for statement receipts, including the same "funds reconcile within 3-5 business days" wording.
   - Send it after a successful settle from both the return handler and the notification handler, using the same one-time guard so a duplicate callback cannot send two receipts.
   - Keep sending failures non-fatal: an email problem must never roll back a settled payment.

3. Re-verify after deploy: run the signed gateway probe from the admin health panel, confirm the hosted page loads, and confirm each flow's callbacks return the settled result.

## Technical notes
- Functions to deploy: `portal-copilot`, `scotia-payment`, `scotia-return`, `scotia-notify`.
- New shared helper `supabase/functions/_shared/email/walk-in-payment-receipt.ts`, mirroring `statement-payment-receipt.ts` (idempotency key on the payment id, `sendManagedEmail`).
- Wire it into the `WALKIN-` branches of `scotia-return/index.ts` and `scotia-notify/index.ts`, guarded by `result.approved`.
- No SQL change needed: `settle_walk_in_payment` is already idempotent and free of the old email queue call.
