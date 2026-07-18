# Project Status

> Agents: read this file first. It tells you what is actively being worked on,
> what is broken, and what must not be touched. Update the "Last updated" line
> whenever you change this file.

Last updated: 2026-07-10

---

## Active work

- **Classic Visions MCP deployment** — Codex is registered against the streamable-HTTP endpoint and the local OAuth-protected function exposes three read-only tools. The live endpoint still returns `404 Requested function was not found`; direct deployment is blocked because the currently authenticated Supabase account returns `403` for function access.
- **On-demand live-data gateway** — the CV Web request/response function,
  short-lived gateway migration, live Innovations statements/balances, and live
  OptiLens delivery-status UI are implemented and verified locally. The
  migration and edge function still need deployment, and the network-hosted
  OptiLens checkout must be updated before the gateway can be enabled live.

- **Smart customer journey** — first-release code, database migration, controlled lens rules, customer command centre, Rx draft handoff, and route/test coverage are implemented. The migration still needs to be applied to the target Supabase project and an approved rule set must be published before live recommendations are enabled.

- **Catalog editor wizard** — `NewCatalogDialog` component not yet shipped.
  Implementation prompts exist in `plan.md` (Codex handoff sequence). Three
  component prompts + one SQL migration for the `status` column are queued.
- **Canvas-based editor v2** — `src/features/admin/catalog-editor-v2/` is the
  new editor shell. Not yet the live route. The legacy editor at
  `/admin/pricing/publisher/:id` is still what users hit.

## Known broken (do not assume these work)

| Area | Issue |
|---|---|
| Catalog duplicate | Copies `catalog_templates` row only — does NOT copy `catalog_sections` or assignments |
| Draft status | UI label only — no `status` column exists yet in DB; migration pending |
| PDF export | List-page PDF ≠ editor preview output |
| Fixed section preview | Shows placeholder text unless a matching `help_articles` record exists |
| Drag-and-drop reorder | UI hints at drag handles but reorder does NOT persist |

## Do not touch

- `src/features/admin/wiki/` — stable, separate concern; no active work
- `src/config/routeRegistry.ts` — route registry must stay synchronized; changes require route registration + auth decision + test
- `package-lock.json` — do not switch to bun or yarn; npm is the single lockfile

## Recently stabilized (safe to build on)

- Wiki article renderer — shared renderer in place; preview and published views both use it
- Customer assignment — list-page assign dialog is correct and stable
- Auth guards — `/admin/**`, `/admin/moonshot/**`, `/ops/**` all behind `AdminProtectedRoute`

---

## Key data model (quick reference)

```
catalog_templates      — cover metadata, name, status (column pending migration)
catalog_sections       — ordered section rows per template
pricelist_versions     — pricing data source for rx/stock/supplies sections
help_articles          — content source for knowledge + fixed sections
catalog_assignments    — many-to-many: templates ↔ customers
```

## Context pointers (fetch only what the task needs)

| Task area | Go read |
|---|---|
| Catalog editor behavior | `docs/catalog-editor-current-behavior.md` |
| Routing rules | `plan.md` + `src/config/routeRegistry.ts` |
| Design constraints | `classicvisions_design_philosophy.md` |
| Agent/validation rules | `AGENTS.md` |
| Architecture overview | `docs/architecture/README.md` |
| Feature-level context | `src/features/<name>/CONTEXT.md` |
