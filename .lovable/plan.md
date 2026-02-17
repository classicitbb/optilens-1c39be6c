

# Fix: Viewport-Locked Layout with Contained Scrolling

## Problem
The admin layout's outer container uses `min-h-screen`, allowing it to grow beyond the viewport and producing a browser-level scrollbar. This also causes sticky table headers to scroll out of sight because the scroll happens on the window, not on the table's own container.

## Terminology
- **Sticky headers**: Table headers that remain pinned at the top of their scroll container while rows scroll beneath them.
- **Viewport-locked layout** (or "contained scrolling"): The entire UI fits exactly within the browser window; only designated inner areas (tables, content panels) scroll.

## Solution

### 1. AdminLayout.tsx — Lock to viewport

Change the outer wrapper from `min-h-screen` to `h-screen overflow-hidden`. Change the main content area from `flex-1 overflow-auto` to `flex-1 overflow-auto` (keep) but ensure the parent is height-constrained:

```
Before:  <div className="admin-tool flex min-h-screen w-full">
After:   <div className="admin-tool flex h-screen w-full overflow-hidden">
```

This single change ensures:
- The sidebar, top bar, and main area never exceed the viewport
- Only `<main>` (with `overflow-auto`) scrolls internally
- Sticky headers inside tables now work because the scroll container is the `<main>` or the table wrapper, not the window

### 2. ProductCatalogPage.tsx — Fill available height

Change the outer div from `p-4 space-y-4` to also include `h-full flex flex-col overflow-hidden`, and wrap the tab content area in a `flex-1 overflow-auto min-h-0` container so the table's own scroll wrapper works correctly within the available space.

### 3. CompanySettingsPage.tsx — Fill available height

Same pattern: make the page container `h-full overflow-auto` so if content exceeds the main area, it scrolls within the page, not the window.

### 4. Table max-height cleanup

The data tables currently use `maxHeight: "calc(100vh - 280px)"` which is a rough estimate. With the viewport-locked layout, we can change this to `flex-1 overflow-auto` on the table wrapper and let CSS flexbox handle the height naturally, or keep the calc but it will now work correctly since the parent is properly constrained.

## Files to Change

| File | Change |
|------|--------|
| `src/components/admin/AdminLayout.tsx` | `min-h-screen` to `h-screen overflow-hidden` |
| `src/pages/admin/ProductCatalogPage.tsx` | Make page fill height with flex column layout |
| `src/pages/admin/CompanySettingsPage.tsx` | Add `h-full overflow-auto` to outer div |

## Result
- No browser-level scrollbar on any admin page
- Sidebar, top bar, and footer links always visible
- Table headers stick to the top of their scroll area
- Horizontal scrolling works within the table container
- Pattern applies site-wide since it's fixed at the layout level

