# Frontend Help Docs

Support-facing notes for the frontend runtime.

## 2026-07-10 — Smart journey support notes

- Public visitors can switch between “Optical professional” and “Patient or visitor” on the homepage; the device remembers the last choice and patient mode intentionally omits trade prices and ordering actions.
- Signed-in customers visiting `/` normally land on `/profile`. Staff can use “View public site” to inspect the public homepage without signing out.
- A missing lens price means the customer has no matching assigned-pricelist row; do not replace it with a retail or generic price. A missing approved turnaround is displayed as “Confirm with the lab.”
- Saving a lens recommendation creates an editable website draft only. The order is not submitted until the customer completes the existing LabLink workflow.
- If recommendations are unavailable, confirm that a rule set has been reviewed and published and that every referenced product is active and in the approved catalogue.
- Ask Classic cannot search production Innovations/LabLink jobs by patient, PO, or job number until the deferred read-only jobs feed exists.
- The smart homepage should end with the same shared footer used elsewhere; if it disappears, verify that `SmartHome` renders `Footer` after its main content.

## 2026-06-24 — Product-cost and analytics hardening

- If viewer or customer users cannot query `addons`, `lenses`, or `supplies` directly, that is expected; customer-safe product reads should use the public views that omit cost fields.
- If public analytics rows fail to insert, check that `visitor_id` is UUID-shaped, `pathname` starts with `/`, web-vital metric names are one of `CLS`, `FCP`, `INP`, `LCP`, or `TTFB`, and ratings are recognized values.
- If Auth onboarding tests fail around country selection, keep the form requirement intact and adjust the test fixture or Select mock rather than weakening validation.

## 2026-04-13 — LED PRO page and admin support notes

- New customer-facing page: `LED PRO` at `/lenses/led-pro`.
- If a user asks where to find LED PRO content, direct them through the Lifestyle Lenses menu, the lens design guide, or search for `LED PRO` on the public site.
- If LED PRO route checks fail in CI, verify both the registry entry `public.lenses.led-pro` and the runtime route declaration in `src/routes/public/PublicRoutes.tsx`.
- If the LED PRO watch section appears blank, check the embedded demo URL in `src/pages/lenses/LedProPage.tsx` before investigating local media assets.
- SLA policy descriptions in admin now pass through the shared rich-text sanitizer before display; if formatting disappears, inspect the stored HTML rather than bypassing sanitization.
- PDF preview should now open from a defined 100% manual zoom baseline; if operators report unexpected scale on first load, start investigation in `src/components/admin/PdfPreviewShell.tsx`.
