# Documentation Governance

This document defines ownership, update cadence, and publishing rules for all documentation under `docs/`.

## Governance goals

- Keep documentation discoverable by lifecycle (`changelog`, `releases`, `bugs`, `migrations`) and by domain (`modules`, `wiki`, `architecture`, `ai`).
- Preserve stable entry points for humans and tooling:
  - `CHANGELOG.md` (top-level release ledger summary).
  - `docs/release-notes.md` (top-level release summary feed).
- Ensure every shipped change has a corresponding doc update path.

## Ownership and cadence

| Area | Primary owner | Backup owner | Update cadence | Required trigger |
| --- | --- | --- | --- | --- |
| `docs/changelog/` | Release Manager | Tech Lead | Per merged release PR | Any major shipped change |
| `docs/releases/` | Release Manager | Product Manager | Per release candidate + GA | Any release train update |
| `docs/bugs/` | QA Lead | Domain owner engineer | Within 1 business day of triage/change | Bug triage, mitigation, fix verification |
| `docs/modules/` | Module owner engineer | Tech Lead | Per PR touching module behavior | API, UX, data-flow, auth, or operational change |
| `docs/wiki/` | Support + Product Ops | Module owner engineer | Weekly review + on-demand | Help content change, policy change, UX change |
| `docs/architecture/` | Staff/Principal Engineer | Tech Lead | Monthly + before major migration | Architecture decision or topology changes |
| `docs/migrations/` | Migration PR owner | DBA/Platform owner | Per migration PR | Schema, route, auth, or platform migration |
| `docs/contributing/` | Engineering Productivity | Tech Lead | Monthly | Process or quality gate changes |
| `docs/ai/` | AI feature owner | Security/Compliance reviewer | Bi-weekly | Prompt, model, policy, or eval changes |

## Existing document map (reference-first migration)

Use this table to locate existing content during the transition to the governed structure.

| Existing document | New canonical area | Action |
| --- | --- | --- |
| `CHANGELOG.md` | `docs/changelog/` | Keep as generated/index entry point; author detailed entries in `docs/changelog/` first. |
| `docs/release-notes.md` | `docs/releases/` | Keep as generated/index entry point; aggregate from `docs/releases/` entries. |
| `docs/release-checklist.md` | `docs/releases/` | Reference as release process source until split into per-release guides. |
| `docs/bugs/*.md` | `docs/bugs/` | Continue as domain bug ledgers; add structured fix reports for resolved incidents. |
| `docs/modules/*.md` | `docs/modules/` | Continue as module docs; standardize new docs with module template. |
| `docs/help/*.md` | `docs/wiki/` | Keep existing files in place; index from `docs/wiki/` and migrate incrementally. |
| `docs/*architecture*.md` | `docs/architecture/` | Reference from architecture index and migrate with next edit. |
| `supabase/migrations/*.sql` + migration notes | `docs/migrations/` | Pair every migration PR with a migration note entry. |
| `docs/ai-knowledge-assistant-architecture.md` + `docs/ai/module-doc-index.json` | `docs/ai/` | Reference from AI index and add policy/eval updates there. |

## Required documentation artifacts per change type

- **Feature release**: changelog entry + release note entry + module documentation updates.
- **Bug fix**: bug fix report + relevant module doc delta + release note mention if customer-visible.
- **Schema/platform migration**: migration note + release note impact summary + rollback section.
- **Help/support UX change**: wiki help article update + release note mention if behavior changed.

## Quality gates

- Required sections in templates must be completed (no `TBD`, `TODO`, or placeholder-only text).
- Dates must use ISO format (`YYYY-MM-DD`) and UTC where timestamps are required.
- Security/privacy impact and rollback/mitigation steps are mandatory where applicable.
- PRs that touch runtime code should update at least one corresponding `docs/modules/` file.

## Review workflow

1. Author updates docs in canonical folder(s).
2. Validate links and indexes in top-level entry points.
3. Run repository quality checks (`lint`, `test`, `build`).
4. Ensure release ledger sync (if release content changed).
5. Request owner review from the governance table above.
