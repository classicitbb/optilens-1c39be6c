# Innovations → Classic Visions Cloud — Sync Contract (v1)

**Status:** Design / build in progress
**Direction:** Outbound push (OptiLens Local office → CV cloud). The office MS SQL
(`Innovations` on `MSSQL-SVR`) is **never** exposed to the internet, per
`docs/architecture/optilens_customer_journey_hub_context.md` §6.
**Trigger model:** On-demand (admin "Sync now") + scheduled (interval).
**Owner:** Russell Hunte / Classic Visions.

This document is the single source of truth both repos build against:
- `C:\DEV\optilens-local` — the office push agent (Node `mssql` → fetch).
- `…\Classic visions new website\optilens-1c39be6c` — the cloud receiver
  (Supabase Edge Function + migration).

---

## 1. Topology

```
Innovations MS SQL (office, private)
        │  getSourcePool() — read-only
        ▼
lib/innovations-sync.js (OptiLens Local)         ──HTTPS, x-api-key──▶   CV cloud
  read selected tables → map → batch                                    Supabase Edge Fn
  POST /functions/v1/innovations-sync/<entity>                          (verify_api_key,
  dry-run by default; commit:true to write                              scope sync:write)
                                                                          │ upsert by
                                                                          ▼ innovations_* id
                                                              public.customers / contacts /
                                                              invoices / statements / customer_balances
```

The CV cloud **issues** the API key (`cv_live_…`, scope `sync:write`); OptiLens
Local stores it server-side and sends it. No inbound path to the office.

## 2. Entities, keys, and freshness

Every entity upserts on an **immutable Innovations id** so re-runs never
duplicate. Each lands in a dedicated `innovations_<id>` column with a UNIQUE index.

| Entity     | Source (Innovations)                         | Match key      | CV target table        |
| ---------- | -------------------------------------------- | -------------- | ---------------------- |
| Customers  | `dbo.Customers` (+ `Countries`)              | `CustomerID`   | `customers` (extended) |
| Addresses  | `dbo.CustomerAddresses`                      | `CustomerID`   | folded onto `customers`|
| Contacts   | `dbo.Contacts`                               | `ContactID`    | `contacts` (extended)  |
| Balances   | `dbo.CustomerBalances` (summary only)        | `CustomerID`   | `customer_balances`    |
| Invoices   | `dbo.FinExportedInvoices` (headers only)     | `InvoiceID`    | `invoices` (new)       |
| Statements | `dbo.FinARStatements` (headers only)         | `StatementID`  | `statements` (new)     |

> Source column names for Invoices/Statements/Balances are confirmed against the
> live DB during the first office-side dry-run; the SQL is isolated in
> `innovations-sync.js` for easy adjustment.

**Financial minimization:** only *summary* figures cross the wire — a single
current balance per customer, and invoice/statement **headers** (number, date,
total, status). No line items, no full AR ledger, no payment instruments.

## 3. Field maps

### Customers → `public.customers`
| CV column                | Source                                   |
| ------------------------ | ---------------------------------------- |
| `innovations_customer_id`| `Customers.CustomerID` (unique)          |
| `name`                   | `Customers.CustomerName`                  |
| `account_number`         | `Customers.AccountNumber`                 |
| `address`                | `CustomerAddresses` (single-line join)    |
| `country_code`           | `Countries` (ISO-2 where derivable)       |
| `pipeline_stage`         | `IsActive` → `active` / `inactive`        |
| `type`                   | constant `wholesale` (override later)     |

### Contacts → `public.contacts`
| CV column               | Source                          |
| ----------------------- | ------------------------------- |
| `innovations_contact_id`| `Contacts.ContactID` (unique)   |
| `name`                  | `Contacts` display name         |
| `email`,`phone`         | `Contacts.Email`,`Phone`        |
| `parent_id`             | resolved from customer's row    |
| `is_company`            | `false`                         |

### Balances → `public.customer_balances` (new)
`customer_id` (fk), `innovations_customer_id` (unique), `current_balance`,
`currency`, `as_of`.

### Invoices → `public.invoices` (new, headers only)
`innovations_invoice_id` (unique), `customer_id` (fk), `invoice_number`,
`invoice_date`, `total`, `currency`, `status`.

### Statements → `public.statements` (new, headers only)
`innovations_statement_id` (unique), `customer_id` (fk), `statement_date`,
`opening_balance`, `closing_balance`, `currency`.

## 4. Receive endpoint

`POST /functions/v1/innovations-sync/<entity>`
Headers: `x-api-key: cv_live_…`, `content-type: application/json`
Body:
```json
{ "dry_run": true, "records": [ { …mapped entity row… } ] }
```
Behaviour:
- `verify_api_key` → requires scope `sync:write` (401/403 otherwise).
- Per record: upsert into the target table `ON CONFLICT (innovations_<id>)`.
- Writes a row to `integration_sync_runs`; failures go to a dead-letter table.
- `dry_run:true` validates + maps but rolls back; returns counts + a sample.
- Response: `{ entity, received, upserted, failed, dry_run, sample, errors[] }`.

## 5. Auth & secrets
- Key minted in CV admin (**Settings → API Keys**) with scope `sync:write`.
- Stored on the office side in OptiLens Local's credential vault (never in git).
- Rotatable via the existing key-rotation runbook.

## 6. Idempotency, errors, fallback
- Upsert-by-immutable-id ⇒ safe to re-run; partial batches are resumable.
- A failed batch leaves prior successes in place; failures dead-lettered with the
  source payload for replay.
- If the cloud is unreachable, the office agent logs and retries on next run;
  the office DB is unaffected (read-only).

## 7. Out of scope (v1)
Full AR ledger, invoice/statement **line items**, payment details, two-way
write-back to Innovations, near-real-time streaming.
