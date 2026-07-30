# Customer Experience Plan — Pricing, Ordering, and the Three Experiences

**Date:** 2026-07-14 · **Source:** operator vision session + quiz session (same day) · **Status:** phase 0 (foundations landing) — design decisions locked, see below
**Read this with `docs/CRM_BUILD_PLAN.md`** — that covers capture (getting customers); this covers serving them.

## The goal, in one line

A customer doing business with Classic Visions is never in the dark: account, orders, statuses, pricing, and help are all one tap away, priced live, and personally cared for — service no competitor in the region matches.

## Three experiences

1. **Public** — the marketing site. Well built; keep quality bar.
2. **Admin** — one cohesive cockpit (see one-cockpit rule in CRM_BUILD_PLAN). No fragmentation.
3. **Customer portal** — the care surface: account status, order status, shipments+tracking, statements, pricing, helpdesk. Contact routes: helpdesk ticket, phone, WhatsApp, portal self-serve.

## Locked decisions (2026-07-14)

- **Store lockdown:** checkout is gated behind the `store_checkout` feature flag (default OFF) until launch. Browsing + carts stay open; the checkout page shows a friendly "opens soon / message us" lock. ✅ built
- **Store catalog:** the public store lists ONLY items with `show_on_website = true` (the admin Website Store toggle). Showing the whole catalog was a bug. ✅ fixed
- **Feature Board** (`/admin/website/features`): runtime flags + operator notes in one admin surface, backed by `public.website_features`. Notes are the operator's request channel — **AI build agents must review this board's notes each working session** and treat them as backlog. ✅ built (migration pending)

## Pricing engine — the master→custom fork model (design, not yet built)

Facts and rules as dictated:

1. **Supplier cost origin.** Prices originate from supplier costs; multiple suppliers carry the same/equivalent lens at wildly different costs. Sell price is set against the **most expensive supplier** at a minimum margin (e.g., 15%) so ANY supplier can fulfil profitably (virtual-lab model). If a supplier's price is rejected/kicked out and another exists, the next price governs; if only one price exists, it stands alone.
2. **Master pricelist.** One master list publishable to any customer.
3. **The fork rule.** The moment ONE price changes for a customer, that customer forks onto a **custom pricelist** — their whole account is customizable without touching anyone else. Varied prices are **highlighted** as being in variance with the master.
4. **Price-match flow.** Customer rebuts a price ("X sells it for less") → operator matches it → the account auto-forks to custom. This is a normal, expected sales motion, not an exception.
5. **Manageability constraint.** The model must be operable by "the simplest of persons" — foolproof: no way to accidentally edit the master while intending a customer change, variance always visible, one-click "return to master price."
6. **Portal publishing with expiring access.** A customer's pricelist publishes to their portal behind tokenized/password access that **expires after inactivity (a few weeks)**. Expired → the pricelist page shows a "request access" action that messages us for a fresh password.
7. **Builder location.** The pricelist builder migrates from OptiLens Local into the CV Web pricing engine (per the tool-migration principle) and edits what's assigned to the account.

## "Order this lens" — pricelist-to-order flow (locked 2026-07-30, extends 2026-07-14 decision below — not a reversal)

**Clarified relationship to the 2026-07-14 entry:** the Rx order form stays exactly what was decided — its own dedicated, first-class flow, not built out of store-cart UI. What's new is what happens at the *end* of that flow: **submitting** a completed Rx order (not an intermediate "add to cart" click mid-editing) is the moment it becomes a line item in the store cart. The form and the cart remain two distinct things; submission is the bridge between them.

### Entry points (all converge on the same Rx Order Form)
1. **Pricelist/price grid** — click a price cell → form opens with that lens (supplier/brand/material/design/index) prefilled, still swappable.
2. **Profile → "New Rx Order"** — blank form, lens picked via searchable catalog picker.
3. **My Orders → resume a draft** — form reopens prefilled from a saved draft.
4. **Cart → Edit** — pencil icon on the Rx cart card reopens the form prefilled from the cart item; saving recalculates and updates the card in place. Only available pre-checkout.

### Form behavior
- **Job scope toggle:** surface-only vs. full-glaze. Frame/tracing fields only appear if full-glaze is selected (ties to the existing `Full Lab` catalog flag). Surface-only jobs never collect frame data.
- **Live quote panel:** every price-driving parameter (index, design, coating, prism, oversize, tint — per the confirmed list below) recomputes on screen as they type, shown in the customer's account-default currency (see Currency below).
- **"Request assistance":** while editing, the customer can flag the form for help on a specific missing/uncertain item (e.g. no PD yet) and save it as a draft to come back to — lets them keep working other orders instead of blocking.
- **Submit requires full validation.** An incomplete order **cannot** be submitted into the cart — it can only be saved as a draft. Drafts are resumable and printable (physical/fax reference). This is a hard gate, not a soft flag.

### After submit
Submitting a completed Rx order drops it into the cart as a line item and immediately presents three choices, no forced path:
1. **Checkout now** — go straight to payment/on-account with just this item (or whatever else is already in cart).
2. **Start another Rx order** — form resets/reopens for the next job; prior submission stays in cart.
3. **Continue shopping** — return to the store to browse stock/supplies; Rx item stays in cart.

### Pricing lock and drift
- **Price locks at add-to-cart** (not live-repriced at checkout), consistent with the existing "custom prices hold on master change" rule. The quote shown when added is the quote honored through checkout.
- **Production-cost drift:** if the lab's actual cost to produce the job exceeds the locked quote (e.g. extra thinning needed), it routes through the **existing price-match approval flow** — owner/manager approval required before the customer is charged the difference. No silent reconciliation.

### Cart line item
- Rx orders render as a card in the cart (lens name, Rx summary, quoted price), not a plain SKU row — same cart the customer uses for stock/supplies (cloth, cleaner, etc.).
- Editable pre-checkout via the pencil icon (reopens the form). **Locked after payment/submission** — once transmitted to Innovations as a real job, the customer can no longer self-edit; any change becomes a staff-routed amendment request (production may already be underway).

### Currency
- **Account-level default**, not a per-order toggle. Set once in account preferences; applies consistently across the price grid, live quote, cart, invoices, and payment. Customer sees BBD/USD/EUR per that setting everywhere, not just while quoting.
- **Open item:** whether BBD↔USD↔EUR conversion uses a live FX feed or an admin-set fixed rate (see Remaining open items).

### Order history
- My Orders shows, per Rx order: the submitted Rx details, the quoted price at checkout, current pipeline status (Received → In production/at supplier → Coating → QC → Shipped → Delivered), and — once the lab processes it — the actual charged price if it differs from quote, flagged the same way master-price drift is flagged elsewhere in this doc.

---

**2026-07-14 original entry (still in force — extended, not superseded):**
- On any pricelist row, click/hover the price → **"Order this lens"** → prefilled Rx order form.
- The form captures: prescription, add-ons, patient info, frame size, prism/personalization.
- **Live price:** every parameter has a price consequence, recomputed on screen as they type. No surprises at invoice time.
- Submission creates an Rx order.
- **Decision confirmed:** dedicated Rx order form, not built as store-cart UI — this stands. **2026-07-30 addition:** submitting the completed form is what places the order into the store cart as a line item (see above) — the destination changed, the form's identity as a standalone flow did not.

## Draft orders (design, not yet built)

One drafts surface holding three order types, resumable any time:
- **Web store order** (cart draft — partially exists as cart persistence)
- **Rx order** (interrupted/incomplete form state — the ONLY path for incomplete Rx data; cannot be added to cart incomplete. Printable. Supports a "request assistance" flag on a specific field.)
- **Service order** (subscriptions / paid services)

Once an Rx draft passes full validation, it moves from the Drafts surface into the Cart (as an Rx cart card, see above) rather than staying a separate order type.

## Build sequence (proposed)

| # | Item | Depends on |
|---|---|---|
| 0 | ✅ Store catalog filter + checkout lockdown + Feature Board | — |
| 1 | Pricelist data model: master + per-customer fork + variance tracking | pricing tables audit |
| 2 | Pricelist builder UI in admin (port/merge from OptiLens Local) | 1 |
| 3 | Portal pricelist page with expiring access token flow | 1, 2 |
| 4 | Rx order form with live pricing engine | 1 (price sources) |
| 5 | "Order this lens" links from pricelist rows | 3, 4 |
| 6 | Draft orders (3 types) | 4 |
| 7 | Service orders/subscriptions | 6 |

## Operator decisions — quiz session 2026-07-14 (all former open questions RESOLVED)

### Pricing engine
- **Margin rule:** 15% over the most-expensive supplier is the never-go-below FLOOR; normal pricing targets a higher default markup. (Exact default markup TBD per category — capture when porting the builder.)
- **Supplier price kick-out = per-item exclusion flag.** Mark one supplier's price on one item as excluded from the max-cost calc; the next-highest price governs. Not a whole-supplier disable.
- **Fork drift:** when a MASTER price changes on a custom-priced item, the customer's custom price HOLDS. A variance/drift report shows deviation from master for periodic review.
- **Price-match permissions:** staff PROPOSE a match; **owner/manager approval required** to apply it (and thereby fork the account). Log who/when/why.

### Portal
- **Auth:** full customer accounts (email + password). The expiring pricelist token is a lightweight extra path, not the main auth.
- **Pricelist access expiry:** **14 days** of inactivity. Customer clicks "request access" → auto-issue flow → **admin approves** with one click → new password sent.
- **Order status:** show the FULL pipeline — Received → In production/at supplier → Coating → QC → Shipped (with tracking) → Delivered. Maps to internal lab states.
- **Statements v1:** view balance + statement/invoice history AND **pay invoices online** (needs payment provider selection — open item below).
- **Helpdesk:** use the **already-existing helpdesk system**; portal ticket actions route into it.

### Rx order form
- **Users:** optical shops (B2B) only — no consumer mode in v1.
- **Validation:** FULL Rx validation (axis 0–180, add ranges, impossible-prescription blocking).
- **Price-driving parameters (confirmed, all):** index, design, coating, prism, oversize/large diameter, tint/photochromic add-ons. Form live-pricing must match invoicing on all of these.

### Draft orders
- **Explicit "save draft" button** (no continuous auto-save) for all three order types.

## Remaining open items

1. **Payment provider** for online invoice payment (v1 statements includes pay-online). Which processor, and card vs bank transfer?
2. **Default markup targets** above the 15% floor — flat or per category? Capture during pricelist-builder port.
3. **Helpdesk integration detail:** confirm which existing helpdesk system and its API/entry point for portal-originated tickets.
4. **Currency conversion source (added 2026-07-30):** BBD/USD/EUR — live FX feed or admin-set fixed rate? Affects whether the locked-quote price is truly fixed or still exposed to rate movement between quote and payment.
5. **Rx order granularity (added 2026-07-30):** does one Rx cart item always represent one job (one pair, OD+OS, one frame/add-on set), or can a single Rx order request multiple pairs of the same prescription? Not yet asked.
6. **Amendment-request routing (added 2026-07-30):** post-submission edit requests are staff-routed per today's decision — confirm where they land (helpdesk ticket vs. a dedicated admin queue) once helpdesk integration (#3) is resolved.
