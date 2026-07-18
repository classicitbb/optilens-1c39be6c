# Codex Kickoff — Spec A: order_activity push (optilens-local)

> Paste everything below the line into a fresh Codex chat opened on the **optilens-local** repo.

---

## Task

Extend optilens-local's existing Innovations→cloud push with a new **`order_activity`** entity, so the cloud CRM can detect per-customer ordering rhythm and fire retention alarms.

## Context you need

- optilens-local already extracts data from the Innovations LMS (SQL Server) and pushes it to a cloud Supabase database via API-key-authenticated calls. It already does this for **balances** and **statements** entities. **Find that existing push mechanism and mirror its pattern exactly** — same auth, same transport, same scheduling style. Do not invent a new pipeline.
- The cloud side already has the destination table (created and live). Your job is only the **extraction + push** side in optilens-local.
- "Orders" in Innovations for a customer means their lab work and jobs: work-in-progress (received, aging to completion), completed/shipped jobs, and online store orders (cleaners, cloths, stock lenses, buy-and-sell materials). Use the same order/job source the customer portal's order views already read from — locate that query in the codebase and reuse it.

## Exact payload contract

Push one row per active LMS customer. Upsert on `innovations_customer_id`.

```json
{
  "innovations_customer_id": 12345,
  "last_order_date": "2026-07-11",
  "orders_last_7_days": 9,
  "orders_last_30_days": 41,
  "orders_last_90_days": 122,
  "avg_gap_days": 1.4
}
```

Field definitions:
- `innovations_customer_id` (int, required) — the Innovations customer identifier. This is the upsert key; the cloud links it to a contact automatically.
- `last_order_date` (date | null) — most recent order/job date for this customer.
- `orders_last_7_days` / `orders_last_30_days` / `orders_last_90_days` (int) — count of orders in each trailing window from today.
- `avg_gap_days` (number | null) — **mean number of days between consecutive order dates over the trailing 90 days.** Compute by taking the distinct ordered dates in the last 90 days, sorting ascending, taking the gaps between consecutive dates, and averaging them. Return `null` if the customer has fewer than 3 orders in the window (not enough signal for a baseline).

## Cloud destination (already built — for your reference only)

Table `public.order_activity`:

| column | type |
|---|---|
| innovations_customer_id | bigint PRIMARY KEY |
| contact_id | uuid (cloud fills this via trigger — leave null) |
| last_order_date | date |
| orders_last_7_days | integer |
| orders_last_30_days | integer |
| orders_last_90_days | integer |
| avg_gap_days | numeric |
| synced_at | timestamptz (cloud defaults to now) |

Only send the six payload fields. **Do not send `contact_id` or `synced_at`** — the cloud sets those itself.

## Scheduling

- Push **at least daily; hourly preferred.** The cloud retention alarm keys off `last_order_date`, and the business orders daily, so fresher is better.
- The push must be idempotent (upsert), safe to run repeatedly.

## Acceptance criteria

1. A new `order_activity` push runs on the same schedule/mechanism as the existing statements/balances push.
2. Every active LMS customer produces one upserted row with the six fields correctly computed.
3. `avg_gap_days` matches the definition above (null when <3 orders in 90 days).
4. A manual trigger/CLI command exists to run the push on demand for testing.
5. Log the row count pushed and any per-customer computation errors without aborting the whole run.

## Coordination note

The cloud entity name is exactly **`order_activity`**. The receiving handler on the cloud side (in the `innovations-sync` edge function) is being built separately — match this entity name and payload shape precisely so the two halves connect.
