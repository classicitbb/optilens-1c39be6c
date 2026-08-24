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
