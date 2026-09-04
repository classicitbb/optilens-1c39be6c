# Test the statement payment flows

Goal: verify, in the running preview, that the two ways a customer can pay a statement behave correctly end to end — paying by card, and being sent to their own bank's online banking site.

## What will be tested

### 1. Card payment
- Sign in as a customer with statements, open Statements & Billing, press Pay.
- Confirm the amount options (current balance / statement balance / custom) fill correctly and that the BBD amount shows its converted US-dollar equivalent with the rate used.
- Press Pay by card and confirm the browser leaves the page for the Scotiabank hosted page with a payment record created first.
- Capture exactly what the gateway responds with. Current expectation, based on earlier testing: the gateway still rejects store 811812100987, so the hosted page will not render. That rejection is recorded and reported rather than treated as a code bug.
- Return to the site with a success flag and confirm the popup shows the thank-you/verification state and the balance refreshes.

### 2. Bank transfer redirect
- Switch the popup to Bank transfer.
- Confirm the message names the customer's own bank, the amount, and their account number as the reference.
- Confirm the button opens that bank's correct online-banking address in a new tab.
- Also check the fallback case: a customer whose bank has no online-banking address on file must see the contact-us message with phone and email instead of a broken button.

## Screenshots

Each step will be captured and shown: the payment popup, the amount and currency line, the card hand-off, the bank-transfer message, and the bank site opening.

## Notes on test data

- The card feature is switched on, and the admin testing bypass is on, so a staff/admin login will see Pay by card even without the per-customer approval flag.
- Bank links on file: Scotiabank, RBC, CIBC Caribbean, Republic, First Citizens. Three institutions (CBA BB, Not Sure, Central Bank) have no link and should show the contact-us fallback.

## Technical detail

- Driven with Playwright against `http://localhost:8080/profile/statements`, restoring the preview Supabase session before navigating.
- Card path exercises `create_pending_statement_payment` then `scotia-payment` prepare and the redirect; the return path is checked with `?scotia=success` and `?scotia=declined` on `/profile/statements`.
- Bank path reads `bank_payment_portals` matched on `eft_institution_name` from `get_customer_payment_profile`.
- Any pending payment rows created during the card test will be listed in the report so they can be voided.
- No product code changes are part of this plan. If a defect turns up, it will be reported with evidence and fixed only after you approve.
