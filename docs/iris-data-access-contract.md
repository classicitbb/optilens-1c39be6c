# Iris data-access contract

## Purpose

Iris is an AI colleague, not an independent authority. Every data access and
action must be attributable to the authenticated person using her. Iris may do
no more than that person could do through the corresponding Classic Visions ERP
or portal experience, subject to the additional controls in this contract.

This contract applies to the public assistant, customer portal assistant, Admin
Copilot, any future local assistant, typed resource tools, and the controlled
admin SQL gateway. It is an authorization contract, not a prompt convention.

## Authorizing principal

- Iris acts **for** an authenticated user; she is never the authorizing
  principal merely because her service identity is `iris@classicvisions.net`.
- The server resolves the actor, current role, feature permissions, customer
  account memberships, and financial-data capability on every request. It must
  not trust client role claims, user metadata, page paths, or model output.
- A service account may authenticate a backend integration but cannot widen the
  acting user's data scope or bypass row-level security, approval, audit, or
  feature gates.
- The public browser receives no database credential, service-role key, or raw
  SQL capability.

## Access matrix

| Actor and workspace | May access | Must not access |
| --- | --- | --- |
| Anonymous public visitor | Published website, approved public knowledge, and public support intake. | Account, customer, ERP, financial, staff, or internal operational data. |
| Signed-in portal user | Only the portal accounts that the existing membership/access RPCs authorize for that user: their own account profile, authorized order status, statements/balances when that account feature is enabled, support history, and explicitly supplied account context. | Another customer's records, internal notes, staff tools, raw ERP data, or raw SQL. |
| Staff / ERP user | Only the admin modules and records that their current role and `role_permissions` allow in the UI, via the same typed server operations. | Financial data unless the role has the financial-data capability; actions outside their feature scope; raw SQL unless separately authorized below. |
| Admin | The same resources, records, and actions that an administrator can use in the current admin UI and database through governed server operations. | Actions that bypass the approval/audit controls in this contract; browser-side database access; unrestricted credentials. |

## Financial-data reduction

Financial data includes balances, statements and statement lines, account
payments, credit terms, bank/payment-portal configuration, invoice/quote line
amounts, costings, margins, product costs, price matrices, and reports derived
from those values.

- A user without the server-resolved `financial_data` capability receives no
  financial fields, aggregates, search matches, citations, exports, or model
  context. Redaction happens before information reaches Iris.
- Customer portal users receive only the financial data already authorized for
  their selected ERP-linked account; they never receive cost, margin, other
  accounts, or internal credit-control data.
- **Confirmed policy:** retain the current per-account statement-access feature
  gate. An ERP-linked customer does not receive statements or balances merely
  by being linked; Iris must honor the account's existing authorized access
  state.
- Administrators may access financial data only through the same server-side
  paths available to the admin UI. Price-bearing and customer-facing effects
  retain their existing approval requirements.
- The durable server-side implementation is
  `public.can_access_financial_data`, introduced in migration
  `20260830140634_iris_financial_data_capability.sql`. It resolves to `true`
  only for existing app admins. Until that migration is deployed, Iris must
  treat financial data as denied for non-admin users. A UI-only role matrix is
  not sufficient authorization.

## Admin resource operations

The existing `admin_*` resource tools are the default data path. Their resource
registry is the allow-list for selectable fields, writable fields, and
price-sensitive operations.

- The gateway must first verify the actor can view or edit the corresponding
  admin feature; it may then call the typed operation with that actor's scope.
- Iris cannot request arbitrary tables, columns, filters, or writes through an
  `admin_*` tool.
- Deletes, price-bearing writes, customer-facing sends, financial effects, and
  other actions classified by the workspace remain approval-gated.
- An action may execute automatically only when a currently active,
  administrator-approved automation policy exactly matches its resource,
  operation, field scope, actor scope, audience, and risk class. The policy ID
  and approving administrator must be recorded in the audit event.

## Controlled admin SQL gateway

The user approved admin-only direct database/SQL access with one-time
authorization. That does **not** permit a model, browser, or service account to
hold unrestricted SQL credentials.

1. The server validates an authenticated admin actor and opens a proposed query
   plan. The model may describe the task, but the server owns parsing,
   allow-list validation, parameter binding, row limits, timeout, and execution.
2. The proposal displays the intended tables, operation class, parameter names,
   estimated scope, financial-data classification, and effect summary.
3. A fresh, single-use admin confirmation authorizes exactly that plan. The
   authorization expires quickly, cannot be replayed, and cannot authorize a
   changed query or different parameters.
4. Read queries run with least privilege, bounded result size, sensitive-field
   redaction, and no secrets/system catalogs. Writes, DDL, destructive actions,
   role/permission changes, and financial/customer-facing effects require the
   applicable additional approval and are never silently bundled with reads.
5. The audit event records actor, Iris request ID, source workspace, normalized
   query fingerprint, parameter names (not secret values), policy/approval ID,
   result count, affected-row count, timestamp, and outcome.

The gateway is a future server component. Until it exists, “direct SQL” remains
unavailable to Iris; the Admin Copilot must continue using typed, whitelisted
tools and existing approval workflows.

## Email and external communications

- `iris@classicvisions.net` is a monitored operational identity, not a human
  identity. Its autoresponder must disclose that Iris is an AI assistant.
- Every customer-facing email needs Russell's approval before sending. Incoming
  messages may be automatically acknowledged and forwarded to Russell.
- No email, social post, LinkedIn message, credit decision, price promise, or
  external commitment may be sent merely because an admin asked Iris to draft
  it. The approved send itself must be separately recorded.

## Required enforcement evidence

Before enabling each capability, verify it with a real actor from each relevant
role: allowed data is available, disallowed data is absent, cross-account portal
access is denied, financial fields are redacted without capability, approvals
cannot be replayed, and every success/failure has an audit event.
