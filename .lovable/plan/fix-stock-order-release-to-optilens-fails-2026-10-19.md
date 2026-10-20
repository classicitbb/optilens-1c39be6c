# Fix: stock order release to OptiLens fails

## What's actually happening
The release was blocked on purpose by the price check, not a sending fault. The backend refused with:

> "Essilor Photochromic 1.50 Single Vision Regular TGNS Gray (Semifinished)" is not priced on this account's pricelist.

The order belongs to the **Retail** account (776), which uses price list 14. That lens has no price there, so the safety rule stopped the release. Nothing was sent.

The screen hid this reason: the red popup only said "Release failed" with no explanation, because the error came back in a format the popup didn't read.

## Changes
1. **Show the real reason.** When a stock release fails, the popup shows the backend's message (for example, which product isn't priced and on which account). This also applies to bulk release: each failed order lists its reason.
2. **Point to the fix.** If the reason is "not priced", the popup offers a link to open that account's price list so the lens can be priced. Then release again.
3. **No change to the price check.** Unpriced lenses still can't be released. This keeps the rule that prices only come from the pricing engine.

## Your decision (no code)
You choose how to fix order 5b598f35: add a price for the TGNS Gray SV semi-finished lens to price list 14, or remove that line from the order. I won't add or guess a price.

## Technical details
- `RxOrdersWorkspace.tsx` `release()`: replace `e instanceof Error ? e.message : undefined` with a helper that also reads `PostgrestError.message`/`details`, used in both the single and bulk paths.
- Add a unit test for the helper (Postgrest-shaped object yields its message).
- No backend, migration, or function changes. No orders get released during testing.
