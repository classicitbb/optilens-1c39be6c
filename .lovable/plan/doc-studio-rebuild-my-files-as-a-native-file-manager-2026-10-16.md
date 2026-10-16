# Doc Studio: rebuild My Files as a native file manager

## What I found (tested signed in as Russell, 1539x908)

- Doc Studio is no longer an iframe. It is mounted into the page, but the file manager is still an HTML string built inside the old precompiled studio script, with every click wired through inline `onclick="window._dsApp..."` handlers. This is fragile: any re-render, focus change or page-security rule that blocks inline handlers silently kills right-click, double-click, filters and view toggles. That matches what you are seeing, even though in my headless run several of them happened to fire.
- In my run: double-click opened a file, right-click showed Open/Rename/Share/Delete, list view and the Drafts pill switched.
- Confirmed real bugs:
  - Billing files (quotes/invoices) appear as **"Untitled"** with type **"undefined"**, and the Billing count shows **0** even though several exist. They come from a different source and are not mapped to name/type.
  - The cookie banner sits over the lower part of the file sidebar and blocks clicks on the type filters.
  - No single-click selection, no keyboard open, no visible "Open" action, so opening depends entirely on double-click.
- Not yet verified: search, Refresh and the type sidebar filters (blocked by the banner in my run). These will be covered by the new tests.

## What we will build

1. **A native My Files panel** (React, inside the Doc Studio page) replacing the string-built one:
   - Grid and list views with sortable columns (Name, Type, Customer, Updated).
   - Single click selects, double-click or Enter opens, plus an **Open** button.
   - Right-click menu and a "..." menu on each file: Open, Rename, Duplicate, Share, Delete (owner-only actions hidden for others).
   - Access pills (All, Mine, Shared, Can edit, View only, Drafts) and type sidebar with correct counts, all combinable.
   - Search across name, customer and content, debounced, with a clear button.
   - Refresh button with a loading state and error message if the backend fails.
   - Billing documents show their real number/name and "Billing" type.
2. **One shared file service** used by the panel, the studio editor and Iris/Copilot, so files can be listed, searched, opened and created the same way everywhere. Iris gets read/search plus "create draft" only; drafts stay marked "AI draft" for review, nothing is sent or published by AI.
3. **Hand-off to the existing editor**: opening a file calls the studio's existing open routine, so the email, letterhead, billing and other editors keep working unchanged.
4. **Lift the cookie banner above-the-fold issue** on admin pages so it never covers Doc Studio controls.

## Out of scope

- Redesigning the editors themselves (Email, Letterhead, etc.).
- Changing the native v2 gateway or saved file formats.

## Technical details

- New `src/features/admin/doc-studio/files/` module: `useDocFiles` (TanStack Query over `docstudio-api` `/my-files`, `/files/:id`, billing endpoints), `normalizeDocFile()` mapping file and billing rows to `{id, kind, fileType, fileName, customerName, updatedAt, isOwner, accessLevel, status}`, `filterDocFiles()` (access + type + search), `FileManager.tsx` using shadcn ContextMenu/DropdownMenu, 0px radius, semantic tokens.
- `DocStudioEmbed` renders `FileManager` into the My Files tab slot; `studio-logic.js` `buildFileBrowserHtml` path is bypassed (left in place, not deleted), and open calls `window._dsApp.openFile(item)`.
- Copilot/Iris: expose `list/search/open-summary/create-draft` through the existing copilot tool registry against the same edge routes; no new tables.
- Tests: unit tests for `normalizeDocFile` (billing rows get name + "billing" type) and `filterDocFiles` (each pill, type, search); extend `scripts/doc_studio_native_smoke.py` to cover list view, double-click open, right-click menu, filters, search and Refresh.
- Update `src/features/admin/doc-studio/CONTEXT.md` and AGENTS.md rule for the new module.
