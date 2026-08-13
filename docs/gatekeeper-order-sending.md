# Outbound order sending — one format, two transports, two forms

Source spec: Ocuco *3rd Party Integrations: Order Sending*, Hashref v2.5
(`OneDrive/CLASSIC FILES/ERP - Odoo/API Docs/Gatekeeper API/Gatekeeper - Order Sending 1.pdf`).
Live API docs: <https://gatekeeper-staging.opticalonline.com/api-docs/index.html>

## What this covers

Both order forms produce orders that can leave by either route and arrive at
Innovations:

| Form | Outbox table | Route "OptiLens" | Route "Gatekeeper" |
| --- | --- | --- | --- |
| Rx order form | `rx_order_submissions` | optilens-local worker claims, posts InnovaAPI `/process_rxi` or file-drop | `gatekeeper-orders` Edge Function pushes `/api/v2/orders/push_order_to_lab` |
| Stock order form | `stock_order_submissions` | optilens-local worker claims, drops `.stockhashref` into Innova's Incoming share | same Edge Function, same endpoint |

Staff pick the route at release time on each form. Both outboxes carry
`dispatch_provider` (`innovations` | `gatekeeper`); each consumer takes only
its own rows, so an order is never sent twice.

## The one order format

`supabase/functions/_shared/orders/hashref.ts` is the only place an outbound
order is written. Both order types normalise into one `CanonicalOrder` and
render through one Hashref v2.5 writer.

```
rx_order_submissions.payload    ─┐
                                 ├─▶ CanonicalOrder ─▶ buildOrderHashref() ─▶ order text
stock_order_submissions.payload ─┘
```

What makes a stock order expressible in the same format as a prescription
order is `rx_eye:5` ("stock order only") plus repeated `item_start`/`item_end`
blocks. A prescription order is `rx_eye:3` with the lens/Rx fields, and its
coatings, tints and supplies ride in the *same* item blocks.

### Rules the writer enforces

- Identifier and value are separated by a colon with no extra spaces, so a
  colon can never survive inside a value (it is replaced with a space).
- Identifiers **and values** are case-sensitive — note `RXAdd`, not `RXADD`.
- An order is bracketed by `start_order` / `end_order`; anything outside those
  directives is ignored. `file_version` is therefore the first field *inside*
  `start_order`, followed by `agent_name` then `agent_version`.
- `item_source` uses the spec vocabulary: `MISC FRAME FLENS SFLENS NONSTK REM
  PACK TINT COAT EDGING PACKAGE OVERSIZE RXPRISM RXAdd`. optilens-local's own
  `.stockhashref` format spells semi-finished `SLENS`; that spelling is
  accepted on the way in and rewritten to `SFLENS` here, so the office format
  did not have to change.
- `rx_*_prism` / `rx_*_prism2` are always written, zeroed, with a direction —
  the spec asks for explicit zeros rather than absent fields.

`src/tests/unit/orderHashref.unit.test.ts` pins all of the above.

### Routing fields

`lab_num` and `cust_num` are **not** ours to choose. They come from the active
Gatekeeper *sending* contract:

- `lab_num` ← `webrx_lab_id_receiver`
- `cust_num` ← `webrx_retailer_name_receiver`

On the OptiLens route they come from the office's own `data/rx/config.json`,
which the cloud does not hold. That is why `innovations-sync` returns
`canonical_order` (the model) and a `hashref_body` rendered with
`{{lab_num}}` / `{{cust_num}}` placeholders — useful for eyeballing an order,
never for sending as-is.

## Gatekeeper specifics

Authentication is a three-step ladder, and two of the steps are rate-limited
in ways that will get us blocked if ignored:

1. `/api/v1/legacy_orders/lab_access_with_pin` — **once, ever**, per lab. The
   PIN is single-use. Returns `jwt_key` / `jwt_secret`.
2. `/api/v2/auth_user` — exchanges the JWT pair for an `auth_token`. Valid 24
   hours. **Never more than twice a day** or the service blacklists the
   caller; `validAuthToken()` enforces a 12-hour floor.
3. `/api/v2/orders/contract_available` — the sending contracts, each with the
   `hash_routing` key an order is pushed under.

Send: `POST /api/v2/orders/push_order_to_lab` with
`{ order: { hash_routing, rx_content, tr_content } }`.

We deliberately do **not** poll job status. The only inbound data retained is
Gatekeeper's immediate receipt, recorded on the submission row by
`record_gatekeeper_result(p_submission_id, p_success, p_order_kind, ...)`.
If Gatekeeper accepts an order but recording the receipt then fails, the row is
**not** marked failed — a retry would create a duplicate Rx at the lab.

## Preview

`gatekeeper-orders` action `preview` renders exactly what a send would
transmit, from the same builder, without claiming the row or contacting
Gatekeeper. The stock order form's "Preview file" pane shows that text rather
than approximating it in the browser.

## Deploying

Both changed Edge Functions must actually be redeployed — a git push does not
redeploy them (see `docs/edge-function-operations.md`). Confirm with:

```bash
curl -s https://<project>.supabase.co/functions/v1/innovations-sync/version
```

The version string must read `2026-08-12.1-unified-order-dispatch`. If it does
not, the deploy did not land.

Migrations do not run on push either — apply
`20260812000000_unified_order_dispatch.sql` against the live database yourself.
Until it is applied, the stock form's catalog RPC and the `dispatch_provider`
filter do not exist, and the stock outbox has no transport choice.
