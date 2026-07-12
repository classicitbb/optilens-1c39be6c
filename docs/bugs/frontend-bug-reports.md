# Frontend Bug Reports

Track frontend regressions and customer-facing issues.

## 2026-07-10 — Closed issues

### Public tasks were buried in a long marketing homepage
- Surface: `/`
- Symptom: ordering, tracking, lens selection, help, and account actions felt like unrelated destinations and required excessive scrolling.
- Resolution: replaced the entry page with a compact role-aware smart front door based on the supplied Classic Visions mockup.

### Customer account information required fragmented requests
- Surface: `/profile`
- Symptom: orders, balances, statements, drafts, tickets, and pricing were fetched and interpreted across separate views.
- Resolution: added a customer-derived command-centre aggregate with honest source and freshness labels, while retaining detailed drill-down pages.

### Lens guidance could not be carried safely into ordering
- Surface: lens selection and LabLink handoff
- Symptom: no controlled recommendation snapshot or private editable handoff existed, increasing the risk of inferred prices or false submission expectations.
- Resolution: added published deterministic rules, assigned-price-only results, owner-private Rx drafts, and a visible “not yet submitted” LabLink summary with no clipboard dependency.

### Header actions were clipped at phone width
- Surface: shared public header at 390 px and below
- Symptom: the logo wrapped and the Shop label was partially cut off, competing with the smart-home actions.
- Resolution: preserved the one-line brand and changed sign-in/shop to accessible icon actions at the smallest breakpoint.

### Smart homepage omitted the shared footer
- Surface: `/`
- Symptom: the action-first homepage ended after service facts, removing the established company, support, legal, social, and contact links.
- Resolution: restored the shared `Footer` component after the smart-home content so the compact journey retains the full site footer.

## 2026-07-11 — Closed issues

### Synthetic current-period statement presented as a posted statement
- Surface: customer Statements & Billing
- Symptom: the newest entry was calculated from balance data and had no source statement ID or line items.
- Resolution: portal selection now contains only posted Innovations statements; live balance remains separate.

### Shipment tracking used where live order status was required
- Surface: customer My Orders
- Symptom: the live panel showed shipment sessions rather than the current LMS order status.
- Resolution: added a separate MSSQL-backed Innovations Order Status table without removing shipment tracking.

### Older open shipment omitted from customer delivery status
- Surface: customer My Orders
- Symptom: the delivery panel applied a 90-day cutoff, hiding still-open shipment 10419 and preventing customers from expanding a shipment to inspect its work.
- Resolution: the live request now asks for all open shipments plus closed deliveries from the last 30 days; shipment rows expand to show supplied order/item details and a tracking link.

## 2026-06-24 — Closed issues

### Product cost columns readable through direct table SELECT
- Surface: Supabase RLS for `addons`, `lenses`, and `supplies`
- Symptom: authenticated viewer/customer roles could read base product tables that include cost-bearing fields.
- Resolution: replaced broad role SELECT policies with editor-role SELECT policies and preserved cost-free public views for customer-safe browsing.

### Public analytics tables accepted unrestricted insert payloads
- Surface: website analytics runtime tables
- Symptom: public INSERT policies accepted arbitrary rows with `WITH CHECK (true)`.
- Resolution: tightened INSERT policies with visitor ID, token, path, metric, rating, device, and value checks while leaving normal public analytics ingestion enabled.

### API v1 lint blocked by merge-conflict marker
- Surface: `supabase/functions/api-v1/index.ts`
- Symptom: lint failed on a leftover conflict marker in list ordering fallback logic.
- Resolution: resolved the conflict to a single fallback path that retries `id` ordering only when the caller did not provide an explicit order.

## 2026-04-13 — Closed issues

### SLA policy description HTML rendering risk
- Surface: `/admin/helpdesk/sla-policies`
- Symptom: saved rich-text descriptions were rendered directly into the table cell via `dangerouslySetInnerHTML`.
- Resolution: route description HTML through `sanitizeRichTextHtml` before render so published policy copy still displays but unsafe markup is filtered.

### PDF preview initial zoom ambiguity
- Surface: admin PDF preview shell
- Symptom: `manualZoom` started as `null`, leaving the first-load zoom state implicit.
- Resolution: initialize `manualZoom` to `1` so preview behavior starts from an explicit 100% baseline and downstream zoom logic reads a concrete value.

### Public LED PRO route coverage gap
- Surface: public lens pages
- Symptom: new lifestyle-lens content needed canonical routing, navigation discoverability, and route-accessibility coverage to avoid orphaned content.
- Resolution: added `/lenses/led-pro` route registration, shared discovery references, and integration assertions for the public route registry plus runtime route declaration.

### LED PRO page merge-conflict regression
- Surface: `/lenses/led-pro`
- Symptom: an interrupted merge left conflict markers in `src/pages/lenses/LedProPage.tsx`, which broke both lint and production build.
- Resolution: resolved the page to a single embedded-demo implementation and restored the page to valid TSX so validation can complete.
