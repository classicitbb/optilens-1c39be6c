# OptiLens Local: all-customer live data (agent spec)

For the `classicitbb/optilens-local` repo. The website side is already built
(`/admin/orders` → **Active Rx** and **Shipments** tabs); it asks for two new
operations that this agent must implement. Until it does, those tabs show
"the lab connector is offline, or hasn't been updated".

Read `integration-live-data-gateway-contract.md` first: transport, auth, polling
and the 1 MB response cap are unchanged. This document only adds two operations.

## What changes

| Operation | Purpose | Reuses |
|---|---|---|
| `innovations.all_orders` | Every customer's active lab orders (live work in progress) | The query behind `innovations.customer_orders`, without the customer filter |
| `optilens.all_deliveries` | Every shipment, open and recently closed, with contents | The query behind `optilens.customer_deliveries`, without the customer filter |

Both are **read-only**, **staff-only** (the edge function enforces it) and
**not scoped to a customer**: the claimed request has `target = {"scope": "all_customers"}`
and no `website_customer_id`, `account_number` or `innovations_customer_id`. Do
not fall back to "no target, run per customer"; if a request arrives with an
unknown operation, fail it as today.

## Agent changes

1. **Advertise the capabilities.** Add both operation names to the `capabilities`
   array in the heartbeat and in each `agent.next` poll. The edge function only
   queues these operations when a recently seen agent lists them, so an agent that
   has not been updated is simply reported as "not supported yet".
2. **Dispatch** the two operations in the request dispatcher, calling the same
   source (Innovations / OptiLens MSSQL, or the mirror) as their per-customer
   versions.
3. **Complete** with `agent.complete` (`ok: true`, `data: <payload below>`), or
   `ok: false` with `error_code` / `error_message` on failure. Source failures
   (`ELOGIN`, `ETIMEOUT`, ...) are reported as an empty, "offline" answer on the
   website; no cache exists for these views.

## Request arguments (already validated by the edge function)

`innovations.all_orders`

| Argument | Meaning |
|---|---|
| `status_scope: "active"` | Only orders still at the lab (not invoiced/shipped). The site always sends this. |
| `from_date`, `to_date` | Optional `YYYY-MM-DD`, filter on received date. |

`optilens.all_deliveries`

| Argument | Meaning |
|---|---|
| `include_open: true` | Include shipments that are not closed. |
| `closed_since` | `YYYY-MM-DD`; include shipments closed on or after this date. The site sends today minus 45 days. |
| `from_date`, `to_date` | Optional `YYYY-MM-DD`, filter on start date. |

## Response: `innovations.all_orders`

Same shape as `innovations.customer_orders` plus the customer on every row.

```json
{
  "orders": [
    {
      "order_id": 123456,
      "invoice_id": null,
      "rx_number": "RX-100",
      "patient": "Ada Lovelace",
      "received_at": "2026-11-10T10:00:00Z",
      "promise_date": "2026-11-17T10:00:00Z",
      "status_name": "Surfacing",
      "account_number": "A1",
      "customer_name": "Acme Optical"
    }
  ],
  "retrieved_at": "2026-11-13T09:00:00Z",
  "source_status": "live",
  "truncated": false
}
```

- `account_number` and `customer_name` are **required** on every row; the
  website shows and searches by them. Use the order's own account (for a
  bill-to arrangement, the account the lab sees on the order, not the payer).
- Timestamps are ISO 8601. Send `null` rather than omitting a missing value.
- No prices are needed by the website.

## Response: `optilens.all_deliveries`

Same shape as `optilens.customer_deliveries`; each **item** also carries its
customer, because one shipment (a courier run) normally holds orders for many
customers.

```json
{
  "deliveries": [
    {
      "shipment_session_id": "5f7e...-uuid",
      "source_shipment_id": 501,
      "app_status": "open",
      "started_at": "2026-11-12T08:00:00Z",
      "closed_at": null,
      "tracking_number": null,
      "tracking_url": null,
      "shipping_method_name": "1 Tia Lewis",
      "item_count": 2,
      "orders": [
        {
          "order_id": 9001,
          "invoice_id": null,
          "rx_number": "RX-100",
          "patient": "Ada Lovelace",
          "description": null,
          "quantity": 1,
          "status_name": "Ready",
          "received_at": "2026-11-10T10:00:00Z",
          "account_number": "A1",
          "customer_name": "Acme Optical"
        }
      ]
    }
  ],
  "retrieved_at": "2026-11-13T09:00:00Z",
  "source_status": "live",
  "truncated": false
}
```

- A shipment is **open** when `closed_at` is `null`, **closed** otherwise. The
  website derives Open/Closed from `closed_at` alone.
- `orders` is the shipment's contents. Include every item, each with
  `account_number` and `customer_name`.
- `shipping_method_name` keeps the lab's `"<route #> <courier>"` form; the
  website strips the route number.
- `tracking_url` must be `http(s)`; anything else is ignored.

## Size and truncation

The gateway rejects responses over 1 MB. Send only the fields above. If the full
result would exceed roughly 800 KB, return the newest rows that fit and set
`"truncated": true`; the website then tells staff to search or filter. Do not
return an error for a large result.

## Safety

- Read-only queries only; no writes, no stored procedures that mutate.
- No customer-supplied SQL or free-text arguments reach the query: use only the
  validated arguments above.
- Log the operation, row count and duration, not the rows.

## Acceptance checks

1. Heartbeat lists both operations; `agent.next` returns a request with
   `operation: "innovations.all_orders"` and `target.scope = "all_customers"`.
2. `innovations.all_orders` with `status_scope: "active"` returns every active
   lab order across customers, each with `account_number` and `customer_name`.
3. `optilens.all_deliveries` returns open shipments plus those closed since
   `closed_since`, each with all contents and per-item customers.
4. Row counts match the per-customer operations summed across the same customers.
5. A result over the size limit comes back truncated, not failed.
6. Open **Admin → Orders → Active Rx** and **Shipments**: rows appear, the
   offline notice is gone, search and filters work.
