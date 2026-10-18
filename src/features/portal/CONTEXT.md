# Customer Portal Feature — Context

## What this is

Customer-facing portal logic — account profile, profile completion, and portal
schema validation. Routes live under `/profile/*`.

## Key files

| File | Role |
|---|---|
| `profileCompletion.ts` | Profile completion logic and state |
| `profileSchema.ts` | Zod/validation schema for customer profile |
| `profileCompletion.test.ts` | Unit tests for completion logic |

## Notes
- On the bounded Rx route the sidebar is `relative`, not `sticky top-16`: overflow on the bounded content row makes that sticky offset push the menu down. Other account routes retain their existing sticky sidebar. Only the Rx form root scrolls on the Rx route.
- Only `/profile/rx-order` uses a bounded flex frame in AccountLayout. The title is outside the scrolling RxForm root; other account routes keep their existing page scroller. Keep `min-h-0` through main/section/form so the document cannot grow around the intended scroll frame.

- My Orders (`src/components/account/sections/MyOrdersSection.tsx`) shares `InvoiceLines` between lab-order and delivery-invoice dialogs. Its Total (BBD) footer sums displayed two-decimal line amounts in cents, including credits and zero lines; any unavailable/non-finite amount makes the total unavailable. Do not multiply extended amounts by quantity or substitute the invoice header balance for the line sum.

- This is a small, stable feature. Treat it as low-risk unless explicitly tasked here.
- The portal is protected by customer auth (not admin auth) — do not mix guards.
- Keep portal routes under `/profile/**` canonical; no alias duplicates.
