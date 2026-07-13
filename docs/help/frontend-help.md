# Frontend Help Docs

Support-facing notes for the frontend runtime.

## 2026-07-13 — Specialty Lenses

- Find Endless Pilot Progressive and OmniLux NAL under Lenses → Lifestyle Lenses → Specialty Lenses.
- Use Read more to open the full information in place. Opening another lens closes the first card; this is expected and helps keep long product information manageable on mobile.
- View My Price and Order This Lens retain the requested lens name in the destination URL. The price-request form and LabLink must be updated separately before they can automatically preselect that lens.

## 2026-07-13 — Bank Payment Portals

- Bank names labeled **Synced from Innovations** are managed by `dbo.EFTInstitutions`; do not rename them in the admin screen. The name must remain an exact match for the EFT customer routing field.
- Add a URL only after confirming it is the bank's customer sign-in page. A row without a verified URL does not redirect the customer and instead shows the account-support payment message.

## 2026-07-13 — Email Previews

- Find the review workspace at Admin → Settings → Email Previews.
- Select a template in the left-hand list to inspect its sample recipient, subject, trigger, and full email layout. The sample name, recipient, and subject controls update only the review preview and never send an email.
- The source path shown for a template identifies the live source-managed email. If production wording needs changing, update that template through the normal release process so every existing sender keeps the same secure rendering path.

## 2026-07-13 — Storefront product pricing

- The public storefront fetches products only through the `get_*_safe` Supabase RPCs. Do not replace those calls with direct reads from `lenses`, `supplies`, or `addons`.
- Anonymous visitors should see published sell prices, but the UI must never render base cost or add-on cost values. Run `npm run test -- --runInBand` after changing the product card or store data hook.

## 2026-07-11 — Statements and Innovations Order Status

- Statements are posted financial records. The live current balance is displayed separately and is not a printable or selectable provisional statement.
- If statement rows lack order/payment detail, verify the Innovations statement-line sync and the customer's LMS account mapping.
- My Orders shows live Innovations WIP plus valid shipments created today from the local MSSQL gateway. It shows only Rx number, patient, received date, and status; delivery tracking remains in the Live Delivery Status panel. A missing order response usually means the local live gateway/source MSSQL connection is offline, the customer has no linked account number, or duplicate account-number cleanup is still pending.
- The patient/Rx search narrows the returned WIP and same-day shipment result set.
- The sign-in form supports ordinary keyboard entry, password visibility, and reset-password access. Reset requests require the email field first; clipboard access is not required.
- My Account displays the linked ERP account number below Organization / Company. `ACC#` means the customer has not been linked to an ERP account yet; account-number changes are made by staff in the portal/ERP administration tools.
- Live Delivery Status keeps all open shipments, even older records such as shipment 10419, plus deliveries closed within 30 days. If a shipment lacks its contents or a tracking link, verify the OptiLens Local gateway response includes `orders` and a safe `tracking_url`.

## 2026-06-24 — Product-cost and analytics hardening

- If viewer or customer users cannot query `addons`, `lenses`, or `supplies` directly, that is expected; customer-safe storefront reads use the `get_*_safe` RPCs that redact cost values.
- If public analytics rows fail to insert, check that `visitor_id` is UUID-shaped, `pathname` starts with `/`, web-vital metric names are one of `CLS`, `FCP`, `INP`, `LCP`, or `TTFB`, and ratings are recognized values.
- If Auth onboarding tests fail around country selection, keep the form requirement intact and adjust the test fixture or Select mock rather than weakening validation.

## 2026-04-13 — LED PRO page and admin support notes

- New customer-facing page: `LED PRO` at `/lenses/led-pro`.
- If a user asks where to find LED PRO content, direct them through the Lifestyle Lenses menu, the lens design guide, or search for `LED PRO` on the public site.
- If LED PRO route checks fail in CI, verify both the registry entry `public.lenses.led-pro` and the runtime route declaration in `src/routes/public/PublicRoutes.tsx`.
- If the LED PRO watch section appears blank, check the embedded demo URL in `src/pages/lenses/LedProPage.tsx` before investigating local media assets.
- SLA policy descriptions in admin now pass through the shared rich-text sanitizer before display; if formatting disappears, inspect the stored HTML rather than bypassing sanitization.
- PDF preview should now open from a defined 100% manual zoom baseline; if operators report unexpected scale on first load, start investigation in `src/components/admin/PdfPreviewShell.tsx`.
