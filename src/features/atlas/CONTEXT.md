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

## Secrets and page passwords (soft protection)

- `/secret` inserts an inline `secret` node (editor: `Secret` in `extensions.ts`; reader: `SecretField`). It is masked
  until the eye is clicked, and is never written to HTML, Markdown or search text. It is still plain text in `body_json`.
- A page password is a salted PBKDF2 hash stored as `lock` on the document (`lock.ts`). `PageBody` shows `PageLockGate`
  instead of the body until unlocked in this browser tab. **Nothing is encrypted**: anyone who can read the row or
  the canonical JSON export can read the body. `canonicalToSearchText` returns nothing for a locked doc, so search
  and Iris never see it.
- Any new code that rebuilds a doc from editor output must carry `doc.lock` over (see `PageBody`, `applyDoc`).
- Pages with a lock or a secret cannot be published when `visibility` is `public` (`validateForSave`).
- "Turn into → Secret" (bubble toolbar and block menu) moves the selected text of one text block into a `secret` field.

## Tables

- Right-clicking a cell opens `TableContextMenu`: insert/delete row and column, header row, autofit/reset widths, delete table,
  and per-table cell spacing (`compact` / comfortable / `spacious`). Spacing is a `spacing` attribute on the table node and an optional
  `spacing` field on the canonical `table` block (omitted when comfortable).
- Drag a column border to resize. Widths are pixels on each cell's `colwidth` and an optional `colWidths` array on the canonical
  block (`null` = share leftover space); readers emit a `<colgroup>`. "Autofit" measures an off-screen clone of the table.
- Tables have no merged cells. Pasted HTML is run through `unmergeTableCells` (`pasteTables.ts`), which splits every colspan/rowspan
  into plain cells that repeat the content, so nothing shifts column on save.

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
