# Atlas: agent brief (supersedes ADMIN_WORKSPACE_HANDOFF.md)

## Atlas layout and authenticated shared pages — 2026-10-08

Status: Complete — no active handoff

Supersedes the October 7 title-derived slug behavior: new pages use generated UUID slugs, stored existing slugs stay unchanged on title edits, and legacy null-slug pages use their ID without backfill. The current title-derived legacy URL is accepted as an alias; ID-bearing links remain supported. Previously renamed old slug-only bookmarks still have no historical aliases. New read-only shared links use a separate server-generated UUID token that never changes with the title. Manual staff slug edits remain explicit.

Layout repair uses the established browser preference store, with synchronous writes, current-snapshot merges, same-tab notifications and native storage-event refresh. Independent consumers previously overwrote each other's full-width settings. Sidebar width/collapse are now scoped by signed-in user ID, with bounded finite widths and immediate account-switch reads. Unowned legacy sidebar values are deliberately not imported. Sidebar preferences, icons and covers remain browser-local. The prepared nullable full_width column persists page width through the single editor/source path after migration; Update carries the selected width, and the shared reader restores it. Before migration, width uses browser-local fallback. The reported direct Update-only width reset was not reproduced; Update/reopen already passed before repair. Four regression checks failed on the old preference hook and pass after repair.

Sharing is explicit per page through AtlasSource. Administrators open Share, enable sharing, copy /shared/pages/:token, and may disable it later. Any non-anonymous authenticated website account holding a forwarded link can read the published active page, without assignment, admin privileges or profile-list changes. Existing registration preserves the viewer destination, including initial and resent email-confirmation redirects. Administrator-only Recent access lists the latest 100 account/page/version/time entries; account identity is not verified individual identity. Reads and audit inserts are one database transaction, so audit failure withholds content. Disabling, archiving, inactivity, or a password/secret blocks subsequent reads; existing downloaded copies cannot be recalled.

Applied migration: supabase/migrations/20261008183727_atlas_shared_pages.sql. New atlas_page_shares/atlas_page_accesses tables have RLS and no direct authenticated writes. atlas_set_page_sharing and atlas_open_shared_page have fixed search paths, actor checks and explicit grants. The projection excludes draft fields and staff/account data; help_articles policies are unchanged. Atlas remains admin-guarded, and its website reader mounts only the shared renderer. The security-definer projection is required to read staff-only published rows and append audit entries retained after page removal without granting ordinary users table access.

Validation: isolated PostgreSQL WASM (PGlite 0.5.8) executes the actual migration with minimal auth/table/policy fixtures; 41 checks cover access matrix, forwarded links, rename stability, draft/archived/inactive/null-state/secret/lock denial, administrator audit visibility, immutable auditing and revocation. This is not validation against the full hosted schema. 104 focused Atlas/route tests passed; the final reader/saved-width/signup rerun passed 12 tests including one additional full-width assertion (105 distinct focused checks total). The existing AuthPage/authFlow suite also passes 9 tests, including signup and resend destinations for both /store and the shared reader. TypeScript and lint pass (0 errors; existing warnings); production build, qa:smoke and qa:pr-checks pass. Release metadata is synchronized at 0.12.0 locally; this is not deployment evidence. An earlier full-suite snapshot finished with 1465 passes and one unrelated unchanged adminPortalCopilot source-string failure: it expects a hardcoded anthropic RPC argument, while the provider-neutral credential helper passes its provider parameter. That validation was captured before the approved release. Local browser fixture measured standard 720px, full 1248px in editor and viewer, full after Update/reload, and standard after reload; all data mutations used an in-memory adapter. That local preparation did not perform hosted actions.

Production release (2026-10-08): Atlas-only commit 7f2b3d0a was built from the previously deployed main commit cab43199 in an isolated release checkout, preserving the original feature branch and its unrelated commits. Vercel preview and production builds reached READY; the custom-domain production alias serves the Atlas release. Only migration 20261008183727_atlas_shared_pages.sql was applied and recorded in migration history. Hosted metadata confirms nullable boolean full_width, RLS on both new tables, fixed-search-path definer functions, authenticated execution only, no anonymous table reads or direct authenticated writes, and unchanged help_articles policies. No Edge Function source/config changed, no all-functions deployment or email smoke was triggered, and no page sharing was enabled. The sharing and access tables remain empty.

Hosted browser checks: the existing signed-in account opens Atlas and a published page; Share loads explicit Enable sharing and an empty Recent access table without a write. An unassigned token returns unavailable without content or an audit row. Sidebar resize from 244 to 260 pixels survives a reload; the original 244-pixel preference was restored. Local release-checkout validation passes 111 focused Atlas/routing/auth tests, 41 isolated PostgreSQL checks, TypeScript, lint (0 errors), build, qa:smoke and qa:pr-checks. Generated-file checks required CRLF normalization with no semantic source diff. The earlier full-suite snapshot has one unrelated unchanged Copilot source-string assertion failure; no full-suite pass is claimed.

Verification limits: no production page edit, Update, rename, share enable/disable, successful shared-content read/audit, signup, email send or new account was exercised. Those flows require an exact approved non-sensitive test page and existing test-account targets, with any signup/email action approved separately. The provider redirect allowlist could not be read through the available connector, so email-confirmation destination behavior remains unit-tested rather than hosted proof; no provider settings were changed. Preview browser access required a separate Vercel login and was left protected. The bare custom domain redirects to the signed-in primary domain, so that attempt does not prove a signed-out gate. Sidebar account isolation and saved page width retain local regression evidence; no cross-account hosted switch was performed.

No active continuation for the approved deployment. Optional local regression command: `npx.cmd vitest run --coverage=false src/tests/unit/atlas src/tests/integration/atlasRouteAccessibility.integration.test.ts`. Keep any target-specific live test separately approval-gated.

Outstanding design (not implemented): spaces should be addable/removable; SOP creation belongs in Operations Manual, not the reference wiki. ClickUp work is deferred. Prioritize doc/subpage hierarchy/order, heading levels, all text, table-cell relationships, attachments/images, rewritten internal links and contents anchors, with ID/count/content reconciliation rather than pixel styling. Current ClickUp adapter reads JSON exports and plans only; no bulk write path or verified connector. Its actual Markdown parser supports headings 1–4, simple text/inline links and flat lists, but tables are paragraphs, image URLs are links and depth/checklist/divider preservation warnings are too optimistic. Native Atlas table/image nodes do not imply import support. The older connected-MCP assertion is stale; no current ClickUp tool was verified.

One goal, one round. This file is the reference for the prompt in the chat that created it. Read it fully before
touching code. It keeps everything useful from the earlier six-phase plan (Phases 1–3 are built; the original
Phases 4–6 are folded into the work below) and changes the shape of the rest.

Repo: `C:\DEV\optilens-1c39be6c` (the OneDrive copy is ~80 commits behind: ignore it). Remote `classicitbb/optilens-1c39be6c`.
Windows, PowerShell + Git Bash, Node 22, npm.

---

## 1. The goal

Build **Atlas**: one standalone, installable knowledge-and-content workspace at `/atlas` that becomes the single place
to write, organise, publish and find documents and website content. It replaces three separate admin surfaces:

- `/admin/knowledge/wiki[/:slug]` (the Phase 2/3 workspace, already built on the `--ws-*` theme)
- `/admin/knowledge/sops[/:slug]` (a read-only view of the same published internal rows)
- `/admin/website/content` (the old Content Manager: a second, divergent editor over the same table)

Inside Atlas you never navigate away to do another task: spaces, pages, database views, editor, history, search and the Iris
panel are all in one shell. URLs exist for deep links and launcher shortcuts only. The old routes become redirects.

Definition of done (all must hold, each verified, not assumed):
1. `/atlas`, `/atlas/:space`, `/atlas/:space/:slug` work, deep-link, and reload to the same state (`?view=&tab=&q=&peek=&panel=`).
2. Spaces **Wiki**, **SOPs** (published-only lens of Wiki) and **Website** (public/customer rows) all use the same shell, the same
   `BlockEditor`, the same draft/publish/history path. `ContentManagerPage` and `AdminSopsPage` are deleted. There is no second editor and no second write path.
3. The old routes (`/admin/knowledge/*`, `/admin/website/content`, and the legacy redirects that already point at them) redirect to the equivalent Atlas URL, preserving slugs.
4. Atlas is installable as a PWA from Chrome/Edge on Windows (manifest scoped to `/atlas`, standalone window), has its own launcher entry with deep-link shortcuts, and its whole content is findable from admin global search (title **and** body), opening in Atlas.
5. Website-space database views work: Table · Board · Gallery, saved-view tabs, bulk actions with per-row publish validation, drag-to-publish on the board with validation, side peek (560px) that edits with the same editor.
6. Iris panel is wired to the existing assistant (no new model client, no parallel retrieval), proposals only (Accept / Discard / Try again), metered through the AI spend ledger, offline-safe.
7. ClickUp import path exists as an adapter plus a dry-run, **not** a bulk write: nothing is imported without explicit user confirmation.
8. Lint 0 errors; tests: only the known baseline failures; build passes; `qa:pr-checks` passes except the known Windows CRLF false alarm; browser pass done (section 8); STATUS.md and the five docs updated.

---

## 2. Decisions already made (do not re-ask)

- **Name:** Atlas. Route root `/atlas`. Code lives in `src/features/atlas/` (move/rename `src/components/workspace/*` into it; do not leave two copies).
- **Route shape:** `/atlas/:space/:articleSlug?`, standalone full-screen route **outside** `/admin` (precedent: `/copilot` in `routeRegistry.ts`: `domain admin-console`, `audience staff`, `authMode admin`, own layout). Register it in `routeRegistry.ts`, `AdminRoutes.tsx` (or the route module that owns `/copilot`), add route-accessibility tests.
- **Space column:** approved. A `space` column on `help_articles` (text, nullable, with a backfill rule, see section 4). Apply it to the hosted DB through the Lovable MCP (project below) once the SQL is reviewed and tested against a copy of the logic. Any *other* schema change (icon/cover/full-width columns, favorites table, search function) needs a fresh yes: bundle them in one migration proposal and ask once.
- **Install scope:** standalone `/atlas`, whole path is the PWA scope.
- **Blog:** not forced into `help_articles`. A `blog_posts` adapter comes after the help_articles-backed spaces are done and verified. Do it in this round only if everything above is finished; otherwise leave a documented seam.
- **Permissions:** nobody gains rights. Wiki/SOPs keep the `wiki` feature permission (`canView("wiki")`, `canEditFeature("wiki")` via `useRolePermissions`). Website keeps whatever `ContentManagerPage` uses today (`useAdminRole().canEdit` / `isAdmin`). Express this as a per-space capability map, and add a test that a user who could not edit/publish website content before still cannot.

## 3. Survive a business pivot (hard design constraint)

The company may change what it sells or does. Atlas must outlive that:

- **No business vocabulary in the core.** Nothing in `src/features/atlas/**`, routes, CSS tokens, table/column names, manifest or default copy may say "Classic Visions", "optical", "lens", "Rx", "coating", etc. Existing editor items named after the business (the slash group "Classic Visions" with SOP steps / Warning callout / Checklist) become a generic **Templates** group driven by a registry the business can edit.
- **Brand and naming from config, not code.** One module (`src/features/atlas/config.ts`) supplies product name ("Atlas"), workspace/org display name (read from existing company settings when available), icon, and accent token. The manifest, window title and sidebar header read from it. Theme stays on the `--ws-*` tokens so a rebrand is a token change.
- **Spaces are data-driven.** A registry (`spaces.ts`) defines built-in spaces: `{ id, label, icon, scope, defaultView, properties, capability }`. Adding a space (for example an imported ClickUp space) must not need code changes beyond registering it. No enum of "wiki | sops | website" scattered through the code.
- **Storage behind an adapter.** Define `AtlasSource` (list, get, save, move, archive, search, versions) and implement `helpArticlesSource` first; later `blogPostsSource`, `clickUpImportSource`. UI code never imports Supabase or `help_articles` directly. If the table is renamed or the backend changes, one module changes.
- **Portable data.** Canonical JSON (`BlogCanonicalContent`) and Markdown export stay the interchange formats. Add **Export space** (Markdown files + JSON, with slugs and hierarchy) so content can leave Atlas at any time.
- **Properties are schema-driven per space** (title, status, visibility, contexts, type, owner…), not hard-wired columns in components. Contexts today come from `ADMIN_CONTEXT_OPTIONS` (business-specific); keep them working but behind the same registry.
- Do not widen anything silently: permissions, public visibility, slugs, URLs.

## 4. Data facts you must respect

Hosted DB = the app's Supabase project `xstmeirxhfbiyayrrsob`, managed through Lovable. The Supabase MCP cannot see it. Use the **Lovable MCP**: project `d568bffd-cdad-4066-b271-1e09c9a376d6`, workspace `zg9P2xjvV4KHQbcj7HKL`, tool `query_database` (read first; DDL and writes hit production: only the approved migration, and only after you have shown the SQL). Applies via `query_database` are not recorded in `supabase_migrations.schema_migrations` (that table holds Lovable-generated versions). Also commit each applied migration as a file under `supabase/migrations/` (idempotent: `IF NOT EXISTS`, `DROP POLICY IF EXISTS`), ending with `NOTIFY pgrst, 'reload schema';`.

- `help_articles`: 51 rows. Wiki (`content_type='wiki'`, `visibility='internal'`): 21 (19 published, 2 archived). Website (`knowledge` 22, `faq` 4, `legal` 4; public/customer, all published). No row has `body_json` yet (body is in `content`; the editor canonicalises on first save). 39 of 51 have a null `slug`; their URLs use `toWikiArticleSlug` (title + id suffix). **Never backfill slugs** (it changes URLs and two share a title).
- `space` backfill rule (nullable column, computed in the migration): `wiki`/internal → `wiki`; `knowledge|faq|legal` → `website`; leave SOPs derived (a lens, not stored). Reads fall back to the same derivation when `space` is null, so nothing breaks if the column is missing.
- Applied already (2026-10-05): `help_article_versions` (+RLS, indexes) and `draft_title`, `draft_body_json`, `draft_saved_at` on `help_articles`. The original `20260308193000` migration was deliberately **not** run.
- `blog_posts`: 21 rows, separate table and manager (`useBlogPosts.ts`, `BlogPostsManager.tsx`).
- jsonb reorders keys: never compare documents with `JSON.stringify`; use `stableStringify`/`sameJson` (`src/lib/stableJson.ts`).
- `useHelpArticles("knowledge/wiki")` returns ALL rows today (so the current wiki tree already mixes public knowledge rows in). Spaces fix this: each space filters its own rows.
- The old Content Manager writes `content` but not `body_json`/versions; the wiki reads `body_json` first. This divergence is the reason there must be one write path.

## 5. What exists (read the code; do not re-derive)

Branching: PR #601 (draft copy, nested lists, history table, autosave fix) was still OPEN when this was written. Branch from `origin/admin-workspace-phase3-editor` unless #601 has merged (`gh pr view 601`); if merged, branch from `origin/main`.

- Theme: `src/styles/workspace.css`, `src/styles/workspace-editor.css`, `--ws-*` tokens, `.ws-prose`, `.ws-label`; hooks `useScrollingClass`, `useAdminBodyClass` (puts `ws-admin` on `<body>` so portals get the theme).
- Workspace: `src/components/workspace/*` (`WorkspaceShell`, `WorkspaceSidebar`, `PageTree`, `pageTreeLogic.ts`, `PageHeader`, `WorkspaceRightPanel`, `CommandPalette`, `MoveToDialog`, `BlockEditor`, `editor/*`), `src/hooks/useWikiWorkspacePrefs.ts`, `src/pages/admin/AdminWikiPage.tsx` (the space-agnostic refactor starts here).
- Canonical document: `BlogBlockNode`/`BlogInlineNode` in `src/components/blog/BlogPostRenderer.tsx` (callout, toggle, todo, code, divider, table, pageLink; code/strike/underline/color/mention; nested lists via `depths`/`depth`); bridge `tiptapDocToCanonical`/`canonicalToTiptapDoc` in `src/lib/wikiCanonical.ts`; `listDepth.ts`, `stableJson.ts`, `wikiMarkdown.ts`; unknown blocks round-trip and render a visible fallback.
- Data: `src/hooks/useHelpArticles.ts` (`autosaveDraft` via `buildAutosaveUpdate`, `discardDraft`, `saveContexts`, `patchArticle`, `moveArticles`, `upsertArticle` → `{historyRecorded}`, `supportsDrafts`, `listArticleVersions`, `uniqueSlug`), `src/hooks/useContentArticles.ts` (the website-content path to retire).
- Autosave rules (keep): settings apply immediately; body goes live for unpublished pages and to the draft copy for published ones; slug locked while published; only brand-new pages follow their title; flush on leaving; guarded against the empty first render.
- Known gaps carried forward: favorites, page icon, cover and full-width are `localStorage` only (propose a migration, ask); comments disabled (no storage; do not create a table without approval); a real **Update** (version row) and History with data were never exercised on hosted data (use a clearly named scratch page, ask first, archive afterwards, never hard-delete).
- `RichTextEditor.tsx` stays for Doc Studio, blog manager and helpdesk config (HTML contract). Do not delete it.

## 6. Work plan (execute in this order; commit per step, run checks per step)

Before each step list the files you will touch. Keep the old behaviour working until its replacement is verified.

**Step 1: Atlas shell and route, no behaviour change.**
Move `src/components/workspace/*` to `src/features/atlas/` and turn `AdminWikiPage` into a space-agnostic `AtlasWorkspace` driven by a space registry (section 3). `/atlas/wiki[/:slug]` behaves exactly like today's wiki. Old wiki routes redirect. Keep `?panel=`, palette, tree, favorites, trash. Move business-named slash items to the generic Templates registry.

**Step 2: Spaces + database views; delete the duplicates.**
- Migration (space column) → propose, show SQL, apply via Lovable MCP, commit the file.
- `AtlasSource` + `helpArticlesSource` with per-space scope; Wiki = tree view; SOPs = published-only lens (read mode toggle, same page, same editor in edit mode); Website = database space.
- Website database (the original Phase 4 spec, preserved):
  - Title row: icon, "Website content" (34px/700), one-line description. Workspace header with **underline** tabs (not pills); replace `AdminPageHeader` and the pill tabs.
  - Saved-view tabs: All articles · Knowledge Base · FAQ · Legal (Blog joins when its adapter lands). State `?tab=`.
  - Layout switch Table · Board (grouped by status) · Gallery. State `?view=`.
  - Toolbar: Status filter, Sort, title search `?q=`, New (accent button).
  - Table columns: ☐ · Title · Type · Status · Visibility · Contexts · Updated. Hairline dividers, no zebra, "OPEN" on hover, click row opens the peek.
  - Bulk bar (`--ws-accent` tint): Publish · Move to draft · Archive · Clear. Publish runs `validateCanonicalDocument` + `validateWikiBuildVersionForPublish` per row and reports failures **by title**.
  - Board: Draft · Published · Archived; dragging to Published validates first and stays put on failure.
  - Gallery: body preview, title, type and status pills.
  - Peek: right drawer 560px `?peek=slug` with inline title, properties grid, the same `BlockEditor`, Iris button, Publish/Update, "Open as full page" → `/atlas/website/:slug`. A published row's peek edits the **draft copy**, never the live row.
  - Preserve the old Content Manager's properties: visibility (draft/internal/customer/public), `is_active` toggle, `page_slug`, category, description, `context_slugs`, content type; and the **legal slugs** (copyright, privacy-policy, …) stay locked and keep rendering on `/knowledge`, the FAQ and the footer.
- Per-space capability map + the "no new rights" test. Delete `ContentManagerPage`, `AdminSopsPage`, and anything only they used (check `WikiContentPanel`, `HelpCenterNav` users before deleting). Redirect `/admin/knowledge/*` and `/admin/website/content` (and the legacy redirects pointing at it, lines ~271/478/502 of `AdminRoutes.tsx`). Update `apps.ts`, `AppLauncher`, `AdminTopBar`, `HelpPanel`, `AdminContentEditLink`, `AdminDashboardHomePage`, `retrievalService.ts` and every other link (grep `knowledge/sops|knowledge/wiki|website/content|toSopArticlePath|SOP_BASE_PATH`). Update the smoke script snippet in `scripts/admin_smoke_and_error_checks.mjs` (it hard-codes the wiki route) and the route-registry/accessibility tests. `/admin/website/content` was never in `routeRegistry.ts`: do not add it; register Atlas.
- Keep AGENTS.md rule: website **content** and website **store** (`/admin/website/store`) stay separate.

**Step 3: PWA, launcher, search.**
- `public/atlas.webmanifest` (name/short_name/icons from `config.ts`, `scope` and `start_url` `/atlas/`, `display: standalone`, theme/background from tokens), icons (generate simple neutral set, no business logo), a minimal service worker for the app shell only (no offline editing promise; versioned cache; clean update). CSP already allows `manifest-src 'self'` and `worker-src 'self'`; check `security/http-header-policy.json` and `vercel.json` stay in sync (`qa:vercel-headers`). Inject the manifest link only on `/atlas` routes. Verify installability in the in-app browser/Chrome and say plainly what you could not verify.
- Launcher: `ADMIN_APPS` entry in `src/features/admin/core/config/apps.ts` (precedent: `copilot`) with deep-link shortcuts; update launcher tests.
- Search: extend `GlobalSearch.tsx` so every Atlas page is findable by title **and** body, from all spaces, opening in Atlas. Use the existing GIN full-text index on `help_articles` (exists on hosted) through a small RPC (migration: bundle into the one approval) or, if not approved, client-side over cached rows. The Atlas palette (⌘K) and admin search should use one search source (the `AtlasSource.search`).

**Step 4: Iris (original Phase 5, preserved).**
- Right-panel tab "Iris" plus entry points: ⌘J, sidebar Ask Iris, bubble toolbar, block menu, "/" Iris group, Space on an empty line (these already open a placeholder; wire `AskIrisRequest {prompt?, selection?}`).
- Context: current page (title + canonical blocks), selected text, wiki search results, shown as chips above the input.
- Use the existing companion assistant (`companionAssistantEngine` + shared knowledge retrieval). No new model client, no parallel retrieval. Same identity (`docs/ai-assistant-identity.md`). Read `src/features/assistant/CONTEXT.md` first.
- Quick actions: Page: Summarize · Turn steps into checklist · Find related pages · Draft FAQ entry (creates a **Draft** row in the Website space). Selection: Improve writing · Make shorter · Turn into checklist · Explain. Free question: answer from the wiki with citation chips that open the source page.
- Output rule: Iris never writes directly. Each result offers "Insert on page" → proposal block (1px `ws-accent` border, `ws-accent-tint` header) with Accept · Discard · Try again. Only Accept converts to real blocks and saves the draft. Iris colour = `ws-accent`; user bubbles = hover fill; Iris bubbles = `ws-accent-tint`.
- Meter every call through the existing AI spend ledger (`docs/ai-spend-monitoring-plan.md`); log unanswerable questions as "missing article" suggestions. Offline: error state, page stays editable, nothing saved until Accept.

**Step 5: ClickUp import path (no bulk write).**
Historical connector note superseded on 2026-10-08: current ClickUp access is unverified and import work is deferred. Build `clickUpImportSource`: map space → Atlas space, folder/doc → section/parent, page markdown → canonical via `toCanonicalDocument` (report conversions that lose structure: tables, callouts, embeds). Deliver a **dry-run report** (counts, hierarchy, lossy items, slug collisions) and stop. Importing for real needs the user's explicit go-ahead and is a hosted write.

**Step 6 (only if time remains): Blog adapter** and Export space.

## 7. Rules (binding, from the original brief)

- Do not touch `src/features/admin/wiki/` (does not exist; do not create it).
- Public site theme (`:root`/`.dark` site tokens) and `.print-preview-container` stay as they are. Only Atlas/admin change.
- One shared renderer: `WikiArticleRenderer` for editor preview, Atlas view and public `/knowledge`.
- Keep every existing article URL and slug and the nav hierarchy.
- Publish stays blocked unless `validateCanonicalDocument` and `validateWikiBuildVersionForPublish` pass.
- Tiptap only; no second editor library. Fonts: Plus Jakarta Sans and JetBrains Mono only; no serif.
- Follow `CLAUDE.md` (state assumptions, surgical changes, verify before claiming done) and `AGENTS.md` (route registry, route tests, nav sync, runtime guard).
- **Approval gates:** applying the approved `space` migration is pre-approved; any other DB change, any hosted data write (scratch pages, ClickUp import), pushing, and opening PRs need the user's explicit yes. Ask **once** before the first push and propose either one PR for the whole branch or stacked PRs.

## 8. Verification (original Phase 6, preserved)

Run: `npm run lint` · `npm run test -- --runInBand` · `npm run build` · `npm run qa:smoke` · `npm run qa:wiki-build-version` · `npm run qa:pr-checks`, plus `npm run qa:release-ledger`, `npm run qa:search-index`, `npm run qa:vercel-headers` (CI runs these; see gotchas).

Style audit: light and dark screenshots of the Atlas spaces and 8 admin screens (dashboard, pricelists, orders, catalog editor, Doc Studio, settings, a dialog, Atlas). No brown or gold in dark; accent #3FB3C4. No serif in admin. Labels/codes in JetBrains Mono. Scrollbars invisible at rest, visible ~1 s while scrolling (sidebar, content, tables, canvas, Iris panel, code blocks). Public site and print previews unchanged.

Browser pass (in-app browser, signed in as the user):
1. Open three old wiki URLs and an old SOP URL and `/admin/website/content`: each redirects to the same content in Atlas.
2. Create a page (scratch name), nest it by dragging, reload: parent and order kept.
3. Type `/`, add one of every block type, Publish, open `/knowledge/<slug>`: renders the same.
4. Select text, apply colour and a link, ask Iris to shorten it, Accept, reload: kept.
5. Website space: switch Table/Board/Gallery, drag a draft to Published (and a failing one: it stays), open the peek, open as full page.
6. Install as a PWA; open from the launcher; search for a body-text phrase in admin search and land in Atlas.
7. Dark mode and a 400px window: nothing overflows.
Steps 2–5 write to hosted data: ask first, use clearly named scratch rows, archive afterwards, never hard-delete.

Finally: update `STATUS.md` (Active work + Recently stabilized), add the five doc entries, add an "Admin workspace theme" section to `classicvisions_design_philosophy.md` pointing to `src/styles/workspace.css`, run `npm run release-ledger:sync` and `npm run search:index` when changelog/public content changed, and remove `docs/agent/ADMIN_WORKSPACE_HANDOFF.md` if it still exists.

## 9. Gotchas learned the hard way

Environment
- Files are CRLF. Edit with the Edit tool, or Node scripts that normalise `\r\n`→`\n`, replace, convert back. No Python.
- Git Bash heredocs with backticks or `${` break in the shell tool: write script files with the Write tool and run them with `node`.
- Case-insensitive file names: `pageTree.ts` vs `PageTree.tsx` collide (logic file is `pageTreeLogic.ts`).
- Dev server: `npm run dev -- --port 8080 --strictPort --force` (`--force` after adding dependencies, else a blank page from Vite 504 "Outdated Optimize Dep"). Stop it: PowerShell `Get-NetTCPConnection -LocalPort 8080 -State Listen | Select -Expand OwningProcess | Stop-Process`.
- In-app browser is signed in as the user. Theme: `localStorage['classic-visions-theme'] = 'dark'|'light'`, reload. Tiptap instance: `document.querySelector('.ws-editor').editor`. Dynamic `import('/src/...')` can be stale after HMR (reload). Screenshots are scaled; coordinates are in the screenshot frame. `wait` max 10 s.
- Typing tool inserts a whole string at once, so Tiptap input rules (`## `, `> `) need the trigger typed as its own action.

Checks and baselines (pre-existing; none caused by this work)
- `npm run test`: 3 failing tests in 2 files (CRLF-sensitive migration tests).
- `npm run qa:smoke` fails on `main` ("missing snippet" in `App.tsx`, `Auth.tsx`, `LeadFinderPage.tsx`, `CrmPipelinePage.tsx`).
- `qa:pr-checks`/`qa:copilot-facts` says `platformFacts.generated.ts` is stale only because the Windows checkout is CRLF; CI reports it current. Do not commit a regenerated copy.
- CI also runs: release ledger sync (`npm run release-ledger:sync`, bumps the version and rewrites `docs/release-notes.md`, `docs/releases/manifest/current.json`, `package.json`; the changelog's 2026-10-05 entry drives it), public content index (`npm run search:index`), doc symmetry (any `src/` change needs all five of `CHANGELOG.md`, `docs/release-notes.md`, `docs/modules/frontend-runtime.md`, `docs/help/frontend-help.md`, `docs/bugs/frontend-bug-reports.md` in the diff vs `HEAD~1` plus the working tree).
- Lint prints ~2,400 warnings, 0 errors; only errors matter.
- `.admin-tool` forces filled bordered inputs with `!important` (use `ws-bare-input` for borderless) and a 4px radius via `.admin-tool *`; `workspace.css` overrides buttons (6px) and floating layers (8px).

Data
- `useHelpArticles` queries are disabled until permissions resolve (`isLoading` is false before data): gate redirects on `isLoaded`. The first render after opening an article has an empty draft: autosave is guarded by `draftLoaded`.
- Conventions: new UI uses `ws-*` classes and `hsl(var(--ws-x))`; labels `.ws-label`.
