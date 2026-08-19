# Web orders as one filterable table

Replace the three stacked card lists (Pending Web Orders / Completed orders / Other statuses) on `/profile/orders` with a single table styled like the "Order status" and shipment tables above it.

## What changes

- One card containing a table with columns: Order #, Date, Type, Status, Items, Total, Actions (Print order + expand).
- A sliding segmented filter above the table: **Pending | All | Completed | Other**, with **Pending** active by default.
  - Pending = draft, pending, confirmed, processing
  - Completed = completed web orders **plus** confirmed statement payments
  - Other = cancelled, shipped, anything else
- A search box next to the filter, matching on order number, status, date text, total, and product names in the order's items.
- Each row expands (accordion) to show the existing line-item table; the "Print order" button stays per row.
- Statement payments appear as rows in Completed and All, labelled Type = "Statement payment", with the payment reference as its identifier and no expandable line items.
- Existing counts in the header nav ("Pending N") keep working and jump to the table.
- Empty states: "No orders yet" when there are none at all; "No orders match this filter/search" inside the table otherwise.

## Technical notes

- Single file for the UI: `src/components/account/sections/MyOrdersSection.tsx` — remove the `groupedOrders` card loop, add local `statusFilter` and `search` state plus a memoized filtered list.
- Statement payments come from `account_payments` (confirmed/settled rows for the signed-in user, honoring admin emulation the same way `useOrders` does) via a small TanStack Query hook in the same feature area; rows are normalized into the same shape the table renders (id, date, amount, status, type) so filtering and search work uniformly.
- Reuse existing shadcn `Table`, `Badge`, `Input`, and `Button` primitives and the existing `getStatusColor` helper; keep the 0px radius design system and the current price-visibility rules.
