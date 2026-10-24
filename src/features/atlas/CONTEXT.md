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

## Title slugs and launcher favorites (2026-10-07, local source)

Title edits regenerate unique stored slugs on draft autosave and published Update; null legacy slugs stay derived. Sidebar page rename updates title and slug together. Rename transitions retain selection by ID before refetch. Page titles set the browser tab title; shared links and sidebar navigation carry articleId so later renames can resolve them. Old slug-only external bookmarks have no redirect history and cannot be recovered after a rename.

The host supplies LauncherFavorite in page actions. It uses the existing user_launcher_pins table and its per-user policies, storing /admin/knowledge/wiki?articleId=... (the existing legacy redirect), with no new schema or access change. AppLauncher resolves current titles/slugs through AtlasSource and space capabilities, hides missing/inaccessible pages and supports unpinning. Pin query cache includes user ID. Atlas sidebar favorites remain per-user browser preferences.

## Layout and shared reader (2026-10-08, production release)

Supersedes title-driven slug changes above: title edits preserve stored identifiers; new pages use generated UUID slugs, legacy null slugs use IDs without backfill, and current legacy title-derived URLs still resolve. Shared links have independent server-generated tokens. Browser page metadata writes synchronously and merges current storage; all consumers and tabs receive updates. Sidebar width/collapse keys include user ID, never import unowned legacy keys, and remain browser-local.

PageSharingDialog uses AtlasSource for explicit administrator sharing and recent account access history. SharedPageViewer uses only the audited allowlisted RPC and shared wiki renderer, with no editor/admin shell/page listing. The website route requires sign-in; any registered link holder can view an enabled active published page. Passwords/secrets, drafts and revoked links are denied in SQL. The named sharing migration and frontend are deployed; see HANDOFF.md for verification limits. Future space/Operations Manual restrictions and ClickUp import are separate deferred work.

Page width uses nullable full_width storage in the applied sharing migration. Autosave/Update use the existing page-editor/source path; Update also promotes the browser-selected legacy width. The shared reader uses the saved column. Before migration, width remains browser-local; sidebar always remains per-user browser-local. Access audit snapshots survive page deletion.


Hosted read-only checks confirm Share settings and empty audit load, unassigned-token denial and sidebar reload persistence. No real page sharing, page edit or signup was exercised.
