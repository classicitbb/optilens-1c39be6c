---
name: verify
description: Launch and drive this app to observe a change at its real surface. Use when verifying UI work, running the dev server, or capturing screenshots of a page.
---

# Verifying changes in this app

Vite + React + react-router + Tailwind/shadcn, data from Supabase.

## Launch

Use the Browser pane, never Bash, for the dev server:

`preview_start { name: "Vite Dev Server" }` — from `.claude/launch.json`, port 8080.

First start re-optimizes deps and takes ~20s; a `navigate` during that window fails
with "navigation denied or failed". Check `preview_logs` for the ready line, then retry.

## Reaching a page

Most public routes are **not** anonymously reachable — `src/routes/public/PublicRoutes.tsx`
wraps many of them in `<ProtectedRoute>`, which redirects to
`/auth?mode=signin&redirect=<path>`. `navigate` reports the pre-redirect URL, so confirm
where you actually landed with `javascript_tool: location.href` rather than trusting it.

Note `src/config/routeRegistry.ts` declares an `authMode` per route that is **not**
enforced anywhere — it can disagree with the actual `ProtectedRoute` wrapping. The router
is ground truth.

Supabase reads for published content (e.g. `usePublicKnowledge`) succeed anonymously, so a
page being gated is a routing decision, not a data one — you can render gated pages from an
unprotected dev route without logging in.

## Dev-only bench routes

To observe a gated or in-progress page without credentials, mount it at `/dev/*` in
`src/App.tsx` following the existing `RxOrderPreview` pattern. The `import.meta.env.DEV`
guard must wrap the `import()` itself, not just the `<Route>`, or Rollup still emits the
chunk into production. Existing benches: `/dev/rx-order`, `/dev/knowledge`.

**Gotcha:** `<Header />` calls `useCompanionAssistant` and the cart context. Those come from
`CustomerShell`, which `/dev/*` routes sit outside of. A bench that renders `Header` must
wrap itself in `<CartProvider><CompanionAssistantProvider>` or it throws
"useCompanionAssistant must be used within CompanionAssistantProvider".

## Generated files

`src/lib/generated/publicContentIndex.ts` holds the prose/alt-text search index
lifted from every public page component. It is committed, and `npm run qa:pr-checks`
fails when it drifts. After editing copy on any public page:

```bash
npm run search:index
```

## Screenshots

The Browser pane is ~800 CSS px wide and is flaky about wide layouts:

- `screenshot` intermittently fails with "did not finish rendering in time" — just retry, it
  usually succeeds on the second call.
- Right after `resize_window` or a scroll, the first capture often shows a large blank band.
  That is a compositing artifact, not a layout bug — verify with
  `getBoundingClientRect()` before chasing it, then re-shoot.
- `resize_window` above ~800px **crops** rather than scaling down, so `lg:` layouts get their
  right edge cut. `zoom` region-crop is unsupported. `document.documentElement.style.zoom`
  makes the media queries match but breaks paint — don't.
- No Playwright/Puppeteer is installed; don't reach for headless capture.

Practical approach: emulate ~1100px to get `lg:` layouts with tolerable cropping, use
`resize_window { preset: "mobile" }` for the 375px pass, and prove anything the crop hides
with `read_page` or a `javascript_tool` measurement instead of a picture.

Reject the cookie banner ("Reject All") once per session or it covers the lower viewport.

## Cheap structural checks

Faster and more reliable than reading a screenshot:

```js
// overflow
document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
// which responsive panes are live
[...document.querySelectorAll('main .grid > div')].map(d => d.offsetParent !== null)
```
