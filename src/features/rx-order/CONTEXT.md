# Rx order — feature context

The Rx order form (customer `/profile/rx-order`, admin `/admin/orders/quotations/new-rx`)
and everything it saves. **Customers cannot reach the form**: `rx-order` is opt-in
(`usePortalIdentity.canAccessPortalFeature`, `can_access_customer_portal_feature`);
staff use it in admin and at the test bench (`/admin/orders/rx-test`).

## Layers

| Layer | Where | Notes |
|---|---|---|
| Form (current) | `embed/` + `RxOrderEmbed.tsx` | `rx-order-engine.js` is a 4,400-line closure ("do not refactor"). Being replaced by the React form; stays the reference until cutover. |
| Form (React, Phase 1b) | `form/` | `RxForm.tsx` is a drop-in for `RxOrderEmbed` (same props, plus `fixture` for the no-network dev bench). `model.ts` is the pure brain (`derive`, `buildOrder`, `valuesFromOrder`, coating clash rules); `useRxOrderForm.ts` is react-hook-form state + actions; `useRxCatalog.ts` assembles the catalogue (Innovations aliases + pricelist matrix + `rx_surcharge_rules`); `cards/` + `QuotePanel.tsx` are presentational. **Admin / test bench only for now** — customers are still off (`rx-order` opt-in). Frame shapes: `domain/shape.ts` (OMA parser + geometry, characterised against the engine), `domain/standardShapes.ts` (the four standard outlines + the 1471 sample, copied verbatim), `cards/ShapeBlock.tsx` (tiles, trace drop, outline preview, confirmation). Remote edge needs a trace that is confirmed against the A/B/ED/DBL box; an outline locks ED. Chemistrie clips: `domain/chemistrie.ts` (swatch lists, completeness, lab-notes block — characterised against the engine) + `cards/ChemistrieBlock.tsx`; instructions only, never a line or charge, carried in the order notes between `[Chemistrie specifications]` markers and as `chemistrie` on the payload. Print: `form/PrintSheet.tsx` is a portal-mounted sheet shown only under `body.rx-printing` (CSS in `index.css`); "Save & print" is admin-only. Flags: `form/flags.ts` + `FlagBanner.tsx` — fields in `payload.flags` get an amber ring and a review banner; editing a field or "Looks right" clears its flag (flags ride in the saved v1 payload as an extra key). Missing vs the previous form: lens advice tips. |
| Domain (pure) | `domain/` | `parse`, `normalise`, `validate`, `catalog`, `price`, `payload`, `schema`. No DOM, no Supabase. Each is characterised against the engine by `src/tests/integration/rxOrder*.integration.test.ts` (seeded; failures print the seed). |
| Save | `embed/rx-order-adapter.ts` `persistPayload` → `save_rx_order` RPC | One atomic call. Creates the quote on first save (opening the form creates nothing). Total is summed from the saved lines server-side. |
| Contract | `domain/schema.ts` (`cv.rxorder/2`) + edge mirror `supabase/functions/_shared/rx-order/schema.ts` | Mirror must stay identical apart from the zod import (a test enforces it). `upgradeV1` / `downgradeToV1` bridge to what the engine emits. |
| Lab file | `supabase/functions/_shared/orders/hashref.ts` | See `docs/gatekeeper-order-sending.md`. |

## Rules that are easy to get wrong
- Surcharges are **data** (`rx_surcharge_rules`, `domain/price.ts` `DEFAULT_SURCHARGE_RULES` mirrors the seed). Saved as `Fee` lines whose `group_key` is `surcharge:<code>`.
- Prism goes to the lab only when prescribed and carries no price line (Innovations prices it). A single-eye order omits the other eye. One height per eye (OC / segment / fitting by lens type). Single-eye `rx_eye` codes 1/2 are **provisional** until trial hashref files confirm them; remote-edge lab spelling is unconfirmed.
- Split lens: each side is charged half its own pair price. A one-eye job is 0.55 of the pair.
- Test-bench orders are `quotes.is_test`: out of quote lists, never in the outbox (DB trigger), never in the cart.
- Writes to Rx quotes by customers need `rx-order`, not `quotes` (policies via `can_write_customer_quote`).

## Not done yet (see the improvement plan)
Rest of Phase 1b ( advice tips, wiring into the admin page + cutover), Phase 2 customer order management, Phase 3 admin workspace, Phase 4 photo capture. Two draft stores still exist (`quotes` and `rx_order_drafts`).

## Rx capture (Phase 4a/4b, staff only)

`/admin/orders/rx-capture` (`src/features/rx-capture/`): pick a customer, drop / choose / paste photos or PDFs (no voice). Each file goes to the private `rx-captures` bucket + a `rx_capture_jobs` row; the `rx-capture-extract` edge function reads it (Lovable gateway, forced tool call, prompt ported from optilens-local) and `_shared/rx-capture/extraction.ts` maps it to a cv.rxorder/1 draft with `flags`. Review opens `RxForm` with the original beside it; the first save creates the quote (`rx_capture_jobs.quote_id`). Originals are kept 24 months (`purge_after`); the scheduled purge is not built. The function needs a manual deploy (see project AGENTS.md) and the migration `20261001150000` was applied live via the Lovable MCP.

**4c (office captures).** optilens-local RX Capture, with `RX_CAPTURE_DELIVERY=website`, POSTs the reviewed order + resolution + images to `innovations-sync/_rx_captures/ingest` (x-api-key, scope customers:write). The function maps it with `applyLocalResolution(mapExtractionToDraft(...))`, uploads images to `rx-captures/local/<id>/`, and inserts a `rx_capture_jobs` row (`source='local_capture'`, unique `local_order_id`, so a retry is a no-op). The 13-digit alias rides as `lens.innovationsAlias`; `valuesFromOrder` resolves it through `catalog.tripleForAlias`. Customer = `customers.account_number`. Needs a manual `innovations-sync` redeploy then `npm run qa:edge-smoke` (its auth contract must still pass).
