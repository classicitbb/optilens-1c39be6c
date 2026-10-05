# Atlas — feature context

Atlas is the standalone knowledge-and-content workspace at `/atlas/:space/:articleSlug?`
(full screen, outside `/admin`, installable, scope `/atlas/`). It replaced Knowledge → Wiki,
Knowledge → SOPs and Website → Pages / Content; those URLs redirect here.

## Rules that must keep holding

- **No business vocabulary in `src/features/atlas`** (names, copy, tokens, manifest). A test
  enforces it. Brand/product name, base path and install colours come from `config.ts`.
  Business data (option lists, contexts, company name, the Iris provider) is registered by the
  host in `src/config/atlasHost.ts` through `host.ts`.
- **Spaces are data** (`spaces.ts`). Register a space; do not branch on a space id elsewhere.
- **Storage sits behind `AtlasSource`** (`source/types.ts`). Only `source/helpArticlesSource.ts`
  knows about `help_articles`. A test fails if anything else imports the database client.
- **One editor, one write path:** `hooks/usePageEditor.ts` (autosave, Update/Publish, discard)
  serves the full page and the database peek. Publishing is gated by `validateForSave`.
- **Never widen access.** Capabilities (`capabilities.ts`) map onto the host's existing rights;
  edit, publish and remove all require view.
- **Never backfill slugs** (a `null` slug is left alone; URLs derive from title + id). Refresh the
  page list before changing the URL after a slug change.
- Iris only **proposes** (Accept / Discard / Try again). Content stays exportable (Markdown +
  canonical JSON, `exportSpace.ts`).

## Layout

| Path | Role |
|---|---|
| `AtlasApp.tsx`, `AtlasWorkspace.tsx` | Standalone shell and the one workspace for every space |
| `config.ts`, `spaces.ts`, `capabilities.ts`, `host.ts`, `templates.ts` | Registries and configuration |
| `source/` | `AtlasSource` contract, `helpArticlesSource`, search ranking |
| `database/` | Table / Board / Gallery, peek, bulk publish (database spaces) |
| `components/` | Shell, sidebar, page tree, header, block editor (`editor/`), palette |
| `iris/` | Panel, quick actions, reply-to-blocks conversion |
| `import/` | Neutral import contract, ClickUp adapter, dry-run planner and report (no write path) |

## Not done / seams

- Blog is an embed in the Website space (`blog-posts`) until a `blogPostsSource` exists.
- Favorites, page icon, cover and full width are `localStorage` only; comments are disabled.
- Importing for real (a hosted write) needs explicit approval and is not implemented.
- `companion-assistant` trusts Atlas evidence only for staff after its source change is deployed.

## Iris formatting contract

Replies and proposal previews use WikiArticleRenderer. irisBlocks converts Markdown via unified / remark-parse / remark-gfm into canonical blocks before acceptance; selection replacement inserts Tiptap nodes and marks. Never flatten accepted rich content to a plain string. Existing stored drafts are not rewritten automatically.
