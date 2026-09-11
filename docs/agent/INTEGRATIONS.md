# Integrations and Cross-Repository Contract

## Service inventory

| Service | Purpose | Evidence |
|---|---|---|
| GitHub | Canonical source and review workflow | This repository |
| Lovable | Project editing, generation, preview, and publishing workflow | Connected project and repository history |
| Vercel | Hosted application and server-side routes | Connected project and `vercel.json` |
| Supabase | Database, authentication, storage, and functions | `supabase/**` and generated client |
| OptiLens Local | Private operational integration boundary | `classicitbb/optilens-local` and integration code |

Exact account IDs, URLs not intended for customers, credentials, internal hosts, and private access instructions must not be stored here.

## Operating rules

- Verify each connector in the current session with a harmless read.
- Lovable intent does not replace repository tests or `STATUS.md`.
- Review Lovable-generated changes before acceptance.
- Use preview environments before production.
- Preserve function-specific authentication designs; do not apply blanket auth changes.
- Production deployments, migrations, secrets, domains, and authorization changes require the applicable approval.

## Hosted ↔ Local boundary

- Hosted OptiLens exposes customer-safe cloud behavior.
- OptiLens Local owns private operational and legacy-system access.
- Use authenticated, scoped, audited APIs or durable synchronization.
- Use idempotency, correlation IDs, bounded retries, dead-letter handling, and reconciliation.
- Deploy additive provider compatibility before consumer use.
- Access to one repository or connector does not grant access to another.

## Gatekeeper ↔ Innovations dispatch boundary

- Gatekeeper outbound delivery and status polling require stored production credentials and explicit, independent administrator enablement. Changing credential environment disables both controls; never relabel a staging credential as production access.
- Status polling owns durable failure count, next-attempt time, degraded-since time, and last-success time. Temporary failures use 15, 30, 60, 120, 240, then 360 minute delays; existing Rx statuses are retained and only the transition into degraded state raises an administrator notification.
- An Rx submission may fall back from Gatekeeper to Innovations only while it is still `claimed` and before the Gatekeeper order POST begins. The service-role RPC preserves the frozen submission payload and records the source, reason, and time.
- Stock orders and failures after the POST starts never use automatic fallback. Requeued means pending; only an authoritative OptiLens Local result with `transport = 'file_drop'` proves delivery.
