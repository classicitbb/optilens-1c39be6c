# CV Web live-data gateway

## Purpose

CV Web requests customer data only when an authorized customer opens the
relevant screen. The browser never connects to the office network, never sends
an Innovations customer ID, and cannot choose an arbitrary private URL or SQL
query.

## Request flow

1. The signed-in browser invokes `live-data-gateway` with an allow-listed
   operation.
2. The edge function resolves `profiles.crm_customer_id`, then resolves the
   customer's `innovations_customer_id` and `account_number` server-side.
3. A service-role-only request is stored with a 30-second expiry.
4. OptiLens Local's outbound worker claims the request, performs a read-only
   query, and returns the result.
5. CV Web polls the request and renders the response. No scheduled customer-data
   sync is required for these screens.

## Allowed operations

| Operation | Private source | Portal feature |
|---|---|---|
| `innovations.customer_account` | Innovations MSSQL | Statements |
| `innovations.customer_statement` | Innovations MSSQL | Statements |
| `optilens.customer_deliveries` | OptiLens app MSSQL | Private orders |

Any new operation must be added explicitly to the edge function, migration
constraint, local dispatcher, agent capabilities, and integration tests.

## Security and retention

- Browser requests require a valid Supabase user session.
- Non-staff users can request only their approved linked customer.
- The office agent uses `x-api-key`; `gateway:agent` is the preferred scope.
  Existing trusted office keys with `customers:write` or `contacts:write` are
  accepted during migration.
- Gateway tables grant no access to `anon` or `authenticated`; the edge function
  is the only browser-facing access path.
- Requests expire after 30 seconds and are purged after five minutes.
- The office connector performs reads only. Source write-back remains disabled.

## Deployment order

1. Apply `20260710170000_live_data_gateway.sql`.
2. Deploy the `live-data-gateway` edge function.
3. Deploy CV Web.
4. Update and restart OptiLens Local, then start the live gateway from the
   Integrations screen or provide `OPTILENS_SYNC_PASSPHRASE` to the service.
5. Confirm the agent heartbeat before enabling the customer screens.

