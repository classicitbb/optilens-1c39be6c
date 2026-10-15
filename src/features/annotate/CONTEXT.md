# Annotate — feature context

Admin-only page annotation. The header pencil (`AnnotateMenu`, mounted in `AdminTopBar`) opens a menu:
Annotate this page (also the `A` key) and Review & export.

- `annotator.ts` is a framework-free DOM overlay: while active it freezes clicks, lets the admin click any
  element to attach a note (priority: Must change / I'd prefer / Idea), draws numbered pins, and exports
  markdown (Copy / Download `<page>-FEEDBACK.md`) grouped by priority with a readable location and a CSS selector.
- Notes are stored in `localStorage` per `location.pathname` (`cv.annotate.<path>`); nothing is sent to the server.
- `useAnnotator(enabled)` creates/destroys the overlay; `AnnotateMenu` renders only when `useAdminRole().isAdmin`
  (so not while impersonating a non-admin role).
- Overlay elements carry `data-annotate-ui` so annotate mode ignores clicks on them; the pencil trigger and menu
  content must keep that attribute or the menu could not be reached while annotating.
- This replaced the old header pencil that opened Atlas (`/atlas/website`). Atlas is still reachable from the app launcher.
