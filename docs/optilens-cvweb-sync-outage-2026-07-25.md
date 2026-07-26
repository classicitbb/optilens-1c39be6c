# OptiLens ↔ CV Web sync — findings, 2026-07-25

> **Correction (supersedes the first version of this file).** The first pass
> concluded that edge-function deploys had stopped landing on 2026-07-02. That
> was wrong. It came from a cached HTTP response to
> `GET /functions/v1/innovations-sync/version`. Re-fetched with a cache-busting
> query param, the live function reports
> `2026-07-18.1-fill-empty-contact-customer-fields` with all seven entities.
> **Deploys are healthy. Supabase is managed by Lovable; the GitHub Actions
> `edge-function-release.yml` workflow and the stale `project_id` in
> `supabase/config.toml` are not the problem and need no action.**
> Lesson: always cache-bust when probing a version endpoint.

## Actual state of the sync

Sync runs hourly and is working. Last full run 2026-07-24 21:27–21:41 UTC.

| Table | Rows | Last synced |
|---|---|---|
| `customers` | 90 | 2026-07-24 |
| `contacts` | 761 | 2026-07-24 |
| `balances` | 89 | 2026-07-17 |
| `statements` | 4,138 | 2026-07-16 |
| `statement_lines` | 76,413 | 2026-07-16 |
| `bank_payment_portals` | 10 | 2026-07-13 |

## Open issue 1 — 8 customers fail on every run (needs a human decision)

Every hourly run reports `status: partial`, `received: 67`, `failed: 8`:

```
duplicate key value violates unique constraint "customers_email_key"
```

Cause: `public.customers` holds duplicate rows with **no**
`innovations_customer_id`, created manually or by portal signup, which already
hold the email address Innovations wants to write onto the properly linked row.
The upsert conflicts on `innovations_customer_id`, so it never matches the
squatting row, and the unique index on `email` rejects the write.

Confirmed duplicate pairs (unlinked row → linked ERP row):

| Unlinked id | Name | Email | Linked id | ERP customer | Account |
|---|---|---|---|---|---|
| 765 | Anka Optical Office | ankaoptical@gmail.com | 784 | 12 | ANK |
| 767 | CALSEA VISION AIDS | calseavisionaids@gmail.com | 785 | 14 | CVA |
| 766 | CLEAR VISION EYE CENTER | clearvisiongnd@gmail.com | 787 | 16 | CVEC |
| 841 | DR ANN BANNISTER | Annbannister17@gmail.com | 802 | 36 | DAB |

The remaining unlinked rows with emails are staff and test accounts
(`info@classicvisions.net`, `russell@classicvisions.net`, `Russell Hunte Test`,
…) plus contact-person rows (`Augustus Francis`, `Frank Ashley`,
`Nadia Reifer (#153)`, `Tracy Russell`) that may or may not be intended as
customer records.

**Decision required:** delete the four duplicates, or merge them into the linked
ERP rows (preserving any portal login / order history attached to them). This is
not safe to automate blind — some of these rows may own portal accounts.

**Code hardening (safe regardless):** the receiver should not fail a whole
customer record because of an email collision. Recommended: detect
`customers_email_key` and retry the record without the `email` field, recording
the collision, so the rest of the record still syncs.

## Open issue 2 — statement_lines re-pushes full history every run

`innovations_sync_runs` totals, non-dry-run:

| Entity | Runs | Records received | Table rows |
|---|---|---|---|
| `statement_lines` | 88,607 | 17,693,272 | 76,413 |
| `statements` | 6,246 | 1,222,937 | 4,138 |

The whole statement history is re-read from MSSQL, re-posted in 200-row batches
and re-upserted every hour. It succeeds, so nothing looks broken — but it is
~232× more write traffic than the data requires, and it dominates edge-function
invocation cost. `OPTILENS_MIRROR_INITIAL_ORDER_DAYS=548` suggests the window
was meant to be bounded.

**Fix:** send an incremental window (e.g. statements with `post_date` or a
modified timestamp newer than the last successful sync) instead of the full set,
with a periodic full reconciliation.

## Open issue 3 — api-v1 catalog writes are broken (latent, never exercised)

`api_audit_log` shows only GETs against `api-v1` — 82 `catalog`, 26 `customers`.
**No POST to `/catalog` has ever been made**, so this has never surfaced in
production. It would have failed on the first attempt.

`RESOURCES.catalog.insertable` listed columns (`row_label`, `section_key`,
`lens_id`, `price`, `currency`, …) that do not exist on
`pricelist_catalog_rows`, which is where catalog writes are routed. `pickFields`
stripped every OptiLens publish payload down to `{sort_order}`, and Postgres
rejected it on `row_key NOT NULL`.

Fixed in `supabase/functions/api-v1/index.ts`:
- allowlists now match the real table columns
- readable 400 for missing `row_key` / `row_type` / `section`
- `catalog_type` and `row_type` validated against the closed sets the UI renders
- insert → upsert on `(pricelist_version_id, catalog_type, row_key)` so
  republishing is idempotent instead of 409-ing on every row of the second run

And in `optilens-local/lib/cv-api-connector.js`: published rows carried
`catalog_type: 'rx_lens_matrix'` / `row_type: 'rx_lens'`, but the catalog editor,
`portal_assigned_pricelist_catalog` and `generateCatalogPdf` all switch on
`rx|stock|buysell` and `lens|addon|supply`. Those rows would have been written
and never rendered. Now `'rx'` / `'lens'`.

## Change also made

`supabase/functions/innovations-sync/index.ts` — `VERSION` bumped to
`2026-07-25.1-redeploy-verify`, and `optilens-local/lib/innovations-sync.js`
gained a `receiverVersion()` preflight that reports the receiver's version and
any entities it doesn't support before pushing. Both are cheap insurance against
the class of confusion that produced the incorrect first diagnosis above.

## Delivery note

Supabase and edge-function deploys are owned by Lovable. Edits made in this local
clone do not reach production until the commit reaches
`github.com/classicitbb/optilens-1c39be6c` `main` and Lovable syncs it.
