# Doc Studio: render natively instead of iframe

Replace the `<iframe src="/ds/studio.html">` on `/admin/docs/studio` with an in-page mount of the existing dc-runtime. The studio's template, logic, and cloud bridge stay untouched — we inject the same assets into the admin page and boot the runtime against a container div, so the studio renders as part of the app DOM. No iframe, no framing/CSP exposure, no duplicate chrome.

## Why this works (verified in code)

- `public/ds/support.js` boots by querying `document` for `<x-dc>`, swaps it for a `#dc-root` div, and renders with its own React 18 UMD (`createRoot`). It doesn't care whether the document is a standalone page.
- Its self-refetch of `location.href` just no-ops on the admin route (no `x-dc` in that HTML).
- `studio-logic.js` reads `billingDocument` / `staffInvite` from `location.search` — the admin route already carries those params, and the session-storage handoff is same-origin/same-tab, so both handoffs keep working.
- `studio.html` still holds the `<script data-dc-script data-props=...>` element the runtime needs; we inject it alongside the template.
- `cloud-bridge.js` reads the Supabase session from localStorage (same origin) and only intercepts fetches whose path starts with `/api/` — the admin app never uses that prefix.

## Changes

1. **New `src/features/admin/doc-studio/DocStudioEmbed.tsx`**
   - Singleton async loader (module-level promise) that appends to `document.head`, in order: `react.production.min.js`, `react-dom.production.min.js`, `vendor/tinymce/tinymce.min.js`, `cloud-bridge.js`, `support.js`, `studio-logic.js` — plus the design-system stylesheet and Google Fonts links.
   - Fetches `/ds/studio.html` once, extracts the `<x-dc>…</x-dc>` markup and the `data-dc-script` tag via `DOMParser`, injects them into the component's wrapper div, then calls `window.__dcBoot()`.
   - On unmount, clears the rendered root; on remount, re-injects a fresh template and calls `__dcBoot()` again (scripts load only once).
   - Renders a loading state while assets load and an error state if boot fails.

2. **Scoped styles (injected by the component, replacing studio.html's `body.embedded` rules)**
   - Hide the studio's own `.ds-topbar` (logo bar) inside the wrapper — redundant inside the admin shell.
   - Force `#embedded-tabbar` visible, and give the wrapper → `#dc-root` → `.sc-host` chain `height: 100%` so the studio fills the admin content area.
   - Nothing targets `body`, so the admin shell layout is unaffected.

3. **`src/pages/admin/website/DocStudioPage.tsx`**
   - Replace the `<iframe>` with `<DocStudioEmbed />`; keep `EmailDeliveryHealthBanner` and the existing `staffInvite` / `billingDocument` search params (now consumed directly from the page URL by the studio logic).

4. **Left as-is:** `public/ds/studio.html`, `support.js`, `studio-logic.js`, `cloud-bridge.js` (standalone page keeps working; support.js is generated — do not edit).

## Known side effects (accepted, verified low-risk)

- `window.React`/`window.ReactDOM` UMD globals (React 18) appear once loaded — the app uses bundled React 19 modules and never reads these globals.
- `window.fetch` gains the cloud-bridge shim (intercepts `/api/*` only).
- The runtime injects small global base CSS (`html,body{height:100%;margin:0}` etc.) — matched against the admin shell during verification.

## Verification

- `npx tsgo --noEmit` and production build clean; check `/tmp/observability/build-errors.log`.
- Playwright on `/admin/docs/studio`: studio renders without the iframe, no console errors, no CSP violations, TinyMCE editor initializes, tab bar switches sections, My Files loads via `docstudio-api`.
- Confirm navigating away and back to the route re-mounts cleanly.
