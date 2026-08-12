# Wiki Documentation Index

Curated index for help and wiki-style operational guidance.

## Ownership
- Primary: Support + Product Ops
- Update cadence: weekly review, plus same-day updates for high-impact UX/support changes

## Referenced existing content
- `docs/help/admin-help.md`
- `docs/help/frontend-help.md`
- `docs/help/dev-workflow-help.md`
- `docs/help/security-ops-help.md`

## Known data-integrity gotchas
- **Editing ERP-synced CRM fields** — direct SQL updates to customer/contact payment and identity fields silently no-op from admin connections; the sync-preserve trigger rewrites them back. Workaround and verification steps in `docs/help/dev-workflow-help.md`.

## Authoring standard
Use `help-article-template.md` for all new help content.
