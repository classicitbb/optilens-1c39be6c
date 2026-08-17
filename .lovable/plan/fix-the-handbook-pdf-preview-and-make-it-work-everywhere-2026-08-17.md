# Fix the Handbook PDF preview (and make it work everywhere)

## What's wrong

Two separate causes, both confirmed:

1. **The security policy blocks it.** The site's Content Security Policy allows framing only the Scotia payment domains — `frame-src https://test.ipg-online.com https://www.ipg-online.com` — and sets `object-src 'none'`. Our own PDF is not on that list, so the browser refuses to render the preview frame at all. This is defined in `vercel.json`, `security/http-header-policy.json`, and both `security/edge/cdn-headers.*.json`.
2. **Even unblocked, `<iframe src=".pdf">` is not cross-platform.** iOS Safari, Android Chrome, and most in-app browsers do not render PDFs inline in a frame; they show a blank box or force a download. Relying on the browser's built-in PDF plugin can never be "permanently cross platform".

Secondary issue: the handbook file is 9.8 MB, so even where framing works it loads slowly with no progress feedback.

## The fix

**1. Allow same-origin framing of our own documents**

Add `'self'` to `frame-src` (and `object-src`) in all four policy files so the app may embed its own PDF. Nothing else in the policy changes — external framing stays blocked and `frame-ancestors 'none'` is untouched.

**2. Render the PDF ourselves instead of depending on the browser viewer**

Add a shared `PdfViewer` component that renders pages to a canvas with `pdfjs-dist` (the same engine Chrome and Firefox use, bundled with the app, worker served from our own origin so no CDN or CSP exception is needed). This renders identically on desktop Chrome/Safari/Firefox/Edge, iOS Safari, and Android Chrome.

The viewer includes:
- page-by-page canvas rendering with lazy loading of pages as you scroll
- a loading state with progress, and page count / current page indicator
- zoom in / out and fit-to-width, with width tracked for small screens
- a clear error state that falls back to "Open in new tab" and "Download PDF" if rendering ever fails

**3. Use it in the Handbook section**

Replace both iframes in `src/components/account/sections/HandbookSection.tsx` — the inline preview and the expanded dialog — with the new viewer. Download and "Open in new tab" buttons stay exactly as they are.

## Technical notes

- New dependency: `pdfjs-dist` (installed with npm, per project rules). The worker is imported through Vite's `?url` so it is bundled and served same-origin; `worker-src 'self' blob:` already permits it.
- New file: `src/components/pdf/PdfViewer.tsx` — self-contained, no admin/portal coupling, reusable by any future document surface.
- CSP edits: `vercel.json`, `security/http-header-policy.json`, `security/edge/cdn-headers.enforce.json`, `security/edge/cdn-headers.report-only.json`. `scripts/sync_vercel_security_headers.mjs` is run afterwards so the generated headers stay in sync with the policy file.
- Design system respected: 0px border radius, semantic tokens only, existing icon set.
- No backend, database, or edge function changes.

## Verification

- Build passes; the handbook page renders pages on desktop and at mobile widths in the preview browser.
- Confirm no CSP violations remain in the console on `/profile/handbook`.
