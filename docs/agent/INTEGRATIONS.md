# Integrations and Cross-Repository Contract

## Service inventory

| Service | Purpose | Evidence |
|---|---|---|
| GitHub | Canonical source and review workflow | This repository |
| Lovable | Project editing, generation, preview, and publishing workflow | Connected project and repository history |
| Vercel | Hosted application and server-side routes | Connected project and `vercel.json` |
| Supabase | Database, authentication, storage, and functions | `supabase/**` and generated client |
| Higgsfield | Server-side asynchronous video generation | `examples/higgsfield/index.ts` and `@higgsfield/client` |
| OptiLens Local | Private operational integration boundary | `classicitbb/optilens-local` and integration code |
| Chemistrie manufacturer catalog | Public source for Rx clip types, powers, hardware colors and Sun gradients; confirm account availability before commercial ordering | `https://chemistrie.com/pages/order-flow` and `https://chemistrie.com/wp-content/uploads/2021/10/Chemistrie-Retailer-Brochure.pdf` |

Exact account IDs, URLs not intended for customers, credentials, internal hosts, and private access instructions must not be stored here.

## Operating rules

- Advancing GitHub main can publish the production frontend. `.github/workflows/edge-function-release.yml` additionally redeploys all functions and runs a real email smoke submission when its watched paths change. Review the final tree delta and obtain the applicable production/email approval before a push that triggers those actions.

- App email uses Lovable managed email through `_shared/email/managed-send.ts`; compatibility `smtp.ts` sends log as `raw`. The provider requires nonblank `text`, even for image-only HTML. `LOVABLE_API_KEY` and optional `LOVABLE_SEND_URL` stay server-only. A Lovable source read does not prove active Edge deployment; deployed-code inspection was permission-denied in the September 30 review.

- Verify each connector in the current session with a harmless read.
- Lovable intent does not replace repository tests or `STATUS.md`.
- Review Lovable-generated changes before acceptance.
- The connected Lovable workspace read exposes plan and project metadata but
  did not provide a credit balance. Show Build and Run usage categories
  separately; some workspaces share one wallet, so never add two balances.
- AI billing data sources and request paths are inventoried in
  `docs/ai-spend-monitoring-plan.md`. Anthropic is called directly by
  `portal-copilot`; several site functions use the Lovable AI gateway.
- AI request telemetry uses the existing server-side `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` to insert content-free usage events. Provider
  balances and charges are manual snapshots until approved read-only billing
  feeds exist; no provider billing credential is stored in the dashboard.
- Use preview environments before production.
- Preserve function-specific authentication designs; do not apply blanket auth changes.
- Production deployments, migrations, secrets, domains, and authorization changes require the applicable approval.
- Higgsfield's `HF_CREDENTIALS` is loaded only by the local server-side example
  from ignored `.env.local`; it must not be bundled into the Vite client or
  logged. Each run of `npm run higgsfield:seedance` submits a billable request.

## Hosted ↔ Local boundary

- Hosted OptiLens exposes customer-safe cloud behavior.
- OptiLens Local owns private operational and legacy-system access.
- Use authenticated, scoped, audited APIs or durable synchronization.
- Use idempotency, correlation IDs, bounded retries, dead-letter handling, and reconciliation.
- Deploy additive provider compatibility before consumer use.
- Access to one repository or connector does not grant access to another.
- The customer-authorized `innovations.customer_orders` response may carry an order ID solely to let the portal locate the customer's matching shipment; it must remain scoped by the existing account authorization.
- Rx Chemistrie selections currently travel as lab instructions through quote notes into the outbound order's `instructions`. Do not turn them into quote lines, SKUs, or provisional charges before the catalogue and fulfillment contract are approved.

## Gatekeeper ↔ Innovations dispatch boundary

- Gatekeeper outbound delivery and status polling require stored production credentials and explicit, independent administrator enablement. Changing credential environment disables both controls; never relabel a staging credential as production access.
- Status polling owns durable failure count, next-attempt time, degraded-since time, and last-success time. Temporary failures use 15, 30, 60, 120, 240, then 360 minute delays; existing Rx statuses are retained and only the transition into degraded state raises an administrator notification.
- An Rx submission may fall back from Gatekeeper to Innovations only while it is still `claimed` and before the Gatekeeper order POST begins. The service-role RPC preserves the frozen submission payload and records the source, reason, and time.
- Stock orders and failures after the POST starts never use automatic fallback. Requeued means pending; only an authoritative OptiLens Local result with `transport = 'file_drop'` proves delivery.
