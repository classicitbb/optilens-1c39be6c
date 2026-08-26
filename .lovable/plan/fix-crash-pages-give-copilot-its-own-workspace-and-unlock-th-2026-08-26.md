# Fix crash pages, give Copilot its own workspace, and unlock the Retail account for staff

Three related pieces of work.

## 1. Stop the "Something went wrong" pages

What I confirmed:

- The app has exactly one error boundary, wrapped around the whole router in `src/App.tsx`. Any error in any page replaces the entire screen with the generic "Something went wrong" panel, with no route name, no error text, and no way to recover other than "Try again".
- Errors are only recorded in the visitor's own browser storage (`src/lib/runtimeErrorLog.ts` writes to localStorage). There is no server-side error table, so there is currently no record of what is actually crashing for users. I cannot name a single root cause yet, because the evidence does not exist.

Plan:

1. **Capture first.** Add a server-side error log so every crash records route, message, component stack, user id, release version, and browser. Feed the existing admin Runtime Errors screen from that table instead of localStorage only.
2. **Contain the blast radius.** Add a route-level boundary inside each shell (public, portal, admin, ops) so a crash on one page no longer blanks the whole app, and show a useful panel: what failed, the route, a Retry, and a "Back to dashboard/home" link.
3. **Handle stale-deploy chunk errors.** Failed lazy `import()` after a new release is a common cause of app-wide blank/crash states. Detect that specific failure and do a one-time hard reload instead of showing an error.
4. **Fix what the capture shows.** Once real crashes are recorded, fix the top offenders. This step is deliberately open — the list comes from data, not guesses.

## 2. Portal Copilot gets its own workspace page

What I confirmed: `/copilot` is not a route at all (it renders the 404 page). The Copilot lives at `/admin/copilot`, inside the admin shell, behind an admin-only guard, so operators are bounced to the pricing publisher.  
  
Strictly preserve the existing Copilot widget, popup, launcher, and all current UI surfaces untouched — this work only adds a new standalone workspace page at `/copilot`; do not modify any existing Copilot component, trigger, or styling. 

Plan:

- Create a standalone Copilot workspace at `/copilot`: full-height, no admin sidebar, no admin top bar.
- Layout: ChatGPT/Ollama style — conversation list rail that can collapse, centered message thread, sticky composer with attachment and dictation, and a right-hand preview pane that opens when a document, file, or attachment is in play (and stays hidden when not).
- Keep the existing Copilot logic, tools, approvals, and voice input; this is a shell/route change, not a rewrite of the assistant. 
- `/admin/copilot` redirects to `/copilot`; the admin App Launcher entry points at the new route.
- Access: signed-in staff (admin and operator). Everyone else is redirected.

## 3. Staff get the Retail account in the portal

Confirmed: customer `776` "Retail" (account number `RETAIL`) exists.

Plan:

- Give every admin and operator an active portal membership on customer 776, so Store, Statements, My Orders, Stock order and Rx order load real Retail data instead of an empty or blocked state.
- Backfill existing staff users, and keep new staff in sync when a role is granted.
- Staff who already belong to another customer account keep it; Retail is added alongside and is the default when they have nothing else.
- Feature gates already let staff through, so no change to customer-facing access rules — customers are unaffected.

## Technical notes

- New table `runtime_error_events` (staff-read, insert allowed for the logging path) plus GRANTs and RLS; client logger posts to it with throttling and no PII in the payload.
- Route boundaries: reuse `src/components/ErrorBoundary.tsx` with a `routeLabel` prop and a richer fallback; mount inside `AdminRoutes`, `PortalRoutes`, `OpsRoutes`, `PublicRoutes`.
- Chunk recovery keys off the `Failed to fetch dynamically imported module` error shape, guarded by a sessionStorage flag so it can never loop.
- Copilot: new `src/pages/CopilotWorkspacePage.tsx` + layout components, route registered in `src/App.tsx` and `src/config/routeRegistry.ts`, redirect kept in `AdminRoutes` and `src/features/admin/core/config/apps.ts`.
- Retail access: migration inserting `portal_account_memberships` rows for users in `user_roles` with `admin`/`operator`, plus a trigger on `user_roles` for new staff.