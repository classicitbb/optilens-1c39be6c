# Supplier Compare Tool: Operation & Expected Behavior

## Route and scope
- Canonical route: `/admin/pricing/compare`.
- Access: admin-protected route (same protection model as other admin pricing surfaces).
- Data source: read-only lens catalog rows loaded through existing lens hooks.
- Mobile behavior: page intentionally renders blank when device is in mobile layout mode.

## Layout
- Desktop-only four-column layout:
  1. Compare Column 1 (search + result list).
  2. Compare Column 2 (search + result list).
  3. Compare Column 3 (search + result list).
  4. Comparison Results (selected items and deltas).

## Search behavior
- Each compare column supports independent lens search by lens and supplier metadata.
- A **Link Search** toggle exists in Column 1:
  - **Off**: columns 1/2/3 search independently.
  - **On**: typing in column 1 mirrors the same query to columns 2 and 3.
  - When linked is ON, search inputs in columns 2 and 3 are disabled.

## Compare selection behavior
- Each compare column can hold one selected lens in the results panel.
- Adding a lens to one column automatically clears that same lens if it was selected in another compare column.
- This prevents comparing a lens record against itself.

## Duplicate prevention in result lists
- Result lists in each compare column exclude lens IDs already selected in the other columns.
- This exclusion remains active whether linked search is ON or OFF.
- Example sequence:
  - After selecting **A** in column 1, columns 2 and 3 can only show/search selectable results that are **not A**.
  - After selecting **B** in column 2, column 3 can only show/search selectable results that are **not A or B**.
  - After selecting **C** in column 3, all compare selections are unique (A/B/C), and no selected ID is shown as selectable in the other columns.

## Comparison metrics
- Comparison results support these value modes:
  - Cost (USD)
  - Sell (USD)
  - Sell (BBD)
  - Markup %
- Delta modes:
  - Absolute delta
  - Percent delta
- Baseline is always Column 1 selection.

## Preference signals
- Each result row supports Like and Dislike actions.
- Preference state is persisted in localStorage via lens ID and reused in Product Catalog visual indicators/filters.

## Expected operator workflow
1. Open `/admin/pricing/compare` on desktop.
2. Optionally enable **Link Search** to mirror a single query across all compare columns.
3. Pick candidate lenses from columns 1–3.
4. Review Column 4 deltas vs column 1 to determine best supplier choice.
5. Optionally mark candidate lenses Like/Dislike for future filtering context in catalog views.

## Known constraints
- Tool does not write pricing values to backend tables.
- Tool does not support mobile viewport rendering by design.
