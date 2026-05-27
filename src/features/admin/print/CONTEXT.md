# Admin Print/PDF Context

## Scope

Shared print layout, print settings, and PDF preview behavior for admin business documents.
Current consumers include quotation/proposal output.

## Professional quotation/proposal standards

- Quotes and proposals must render as complete business documents, not screenshots of editor state.
- Page 1 should carry full brand, quote metadata, customer/contact details, line items, totals, notes, and footer as space allows.
- Continuation pages must have a compact document header, quote number/customer context, repeated table column headings, page number, and footer.
- Multi-page tables must break only between rows. Never allow a row to appear cut at the top or bottom of a page.
- Column headings on continuation pages must use the exact same column template as the table body below them.
- Print/save output and on-screen preview should stay visually aligned; do not add preview-only structure unless the print path has an equivalent or a deliberate reason.

## Framework notes

- `printStyles.ts` owns page sizing, margins, and reusable print CSS.
- `printLayout.ts` owns list chunking and row-aware print layout helpers.
- Feature documents such as quotes may add document-specific table templates, but should keep column definitions explicit and shared between first-page body tables and continuation headings.
- Preview modals must provide an obvious close/exit control in the header in addition to any default dialog close affordance.
