# Release Notes

Summarized release outcomes for each major date-stamped update.

## 2026-09-04 — Walk-in payment customer email and receipt printing

### Release Notes
- Walk-in card payments at **Settings → Walk-in Payments** now support capturing the customer's email address.
- When payment is received, a receipt email is sent to the customer, and the staff member is prompted on screen with a print dialog to print a physical copy.
- Staff can also resend the receipt email or reprint the physical receipt from the completed payment card.

## 2026-09-04 — Scotia payment confirmations and saved statement cards

### Release Notes
- Administrators now have **Settings → Payment Activity**, a compact Scotia card-payment confirmation list showing only when a payment happened, its reference, type, amount, and result.
- Statement amounts remain on one line, and customers can opt in to securely save a card before they continue to Scotiabank.

## 2026-08-27 — Continuous CRM contact enrichment

### Release Notes
- CRM contacts are enriched from public business listings automatically: a nightly sweep plus a 15-minute worker for newly created contacts fill in blank website, phone and address details.
- Existing values are never overwritten silently. A listing that disagrees becomes an approval card in the Copilot with the current value, the proposed value, the source link, the retrieval date and a confidence score.
- Enrichment can also be run on demand — from the Copilot, from **Leads → Enrich All**, or from a single contact's editor.

## 2026-08-27 — Copilot microphone choice and platform self-knowledge

### Release Notes
- The floating Copilot microphone button now opens a picker listing every available input device, with hold-to-record and a live level bar. The chosen microphone is remembered per browser and shared with the full Copilot console.
- The Copilot can now answer questions about OpticAdmin itself — which modules and pages exist, what data it can read or change in each, where the app is hosted and which services supply its data — and offers to carry out the work it is capable of.
- The Copilot knows which admin page is open and prefers that page's data when a question is ambiguous.

## 2026-08-22 — Customer portal experience pass

### Release Notes
- Sitewide release validation is restored across the storefront, Portal Copilot, Rx ordering, and the public store-variant security boundary.
- Portal customers can preview saved drafts, open lab-order details, collapse account navigation, and use a roomier support assistant with in-place chat history and dictation.
- Barbados lab prices are identified as BBD, web-cart prices remain identified as USD, and users without price access no longer see pricing-availability language in Rx ordering.
- My Profile now contains checkout-saved payment methods for editing or removal; customers no longer see a separate card-creation page or internal CRM linkage badges.
- My Profile now also contains saved addresses, and Enter applies an active inline contact-detail edit.
- Portal Copilot voice input now uses a predictable Record → Stop → Transcribe flow, and its Helpdesk ticket tool supplies the required ticket number and numeric priority automatically.

## 2026-08-18 — Statement document automation

### Release Notes
- New Innovations statements can be rendered as Letter PDFs, stored in the governed OneDrive folder hierarchy, and downloaded through the authenticated portal.

## 2026-08-15 — Canonical stock quotations

### Release Notes
- Staff can save a staged Stock Order Builder draft as a numbered quotation and continue with its populated DocStudio quotation document.
- Price selection follows the account pricelist, Retail fallback, then published catalog price; a non-zero manual price requires a reason when no configured source can price the item.

## 2026-08-14 — Portal Copilot qualified CRM suggestions

### Release Notes
- Ask Portal Copilot to scan CRM for qualified follow-up opportunities. It prioritizes current CRM and order-history signals, explains the evidence and inference separately, and avoids contacts already covered by open work.
- Every suggested task remains a review item until an administrator approves it. The scan does not silently create opportunities or change customer data.

## 2026-08-14 — Portal Copilot multi-chat workspace

### Release Notes
- **New chat** now creates a separate, durable Copilot conversation.
- The Chats sidebar keeps up to 50 recent conversations available for switching, including prior attachment analyses and ERP rollout results.

## 2026-08-13 — Admin Portal Copilot MVP

### Release Notes
- Administrators can open **Portal Copilot**, type a rollout request or confirm a voice transcript, and prepare portal access for every ERP-linked customer from live portal data.
- Invitations always wait for explicit approval. Ambiguous or incomplete contacts become editable follow-up tasks, while every decision and execution result remains in the audit history.
- A portal account that succeeds before its email fails is preserved and shown as a partial failure that can be retried safely.
- Push-to-talk now starts speech recognition during the original press, preventing Edge from showing a false permission-denied message after microphone access is approved.

## 2026-08-12 — Unified Order Dispatch and MCP Artifact Stability

### Release Notes
- Rx and stock orders now share one Hashref v2.5 writer and can be released through either Innovations or Gatekeeper without duplicate claims.
- MCP Edge Function generation is now explicit at deployment time; normal Vite builds and Vitest runs no longer overwrite the portable function artifact.

## 2026-08-11 — Stock Order Form Discovery and Drafts

### Release Notes
- The **Stock Order Form** is available from the header app launcher and global search.
- Stock-order account selection now shows only lab accounts with priced stock-lens rows.
- Adding a stock order to drafts persists the staged order and makes it reopenable from the quotations page.

## 2026-08-06 — Header Launcher Shortcuts

### Release Notes
- **Activities** and **Rx Order Form** now appear in the header app launcher for staff with access to their owning CRM or Website app.
- Selecting either shortcut opens the existing page directly; CRM and Website navigation remain unchanged.

## 2026-08-06 — Quote Requests Routed Through Helpdesk

### Release Notes
- Sending a request from **Quote Requests** creates a Helpdesk ticket automatically and shows the complete request as locked, submitted history.
- Use **View conversation** for corrections, questions, and support replies. Older requests remain visible and are labeled when they predate Helpdesk linking.

## 2026-08-04 — Multi-account Portal Access

### Release Notes
- A person keeps one email login while authorized company accounts appear in a switcher in My Account.
- Orders, deliveries, statements, pricing, and other live account data follow the selected account; the server rejects an account that is not an active membership.
- Adding another account to an existing login no longer replaces its original primary customer link.

## 2026-08-04 — Portal Lab Pricelist Tag Resolution

### Release Notes
- The **Is Lab** contact tag now enables Stock Lenses and Lab Supplies when it is assigned to the portal person, parent company, customer-linked contact, or CRM company resolved to that customer account.
- An open portal rechecks this permission when the pricelist page is revisited or the browser regains focus.

## 2026-07-30 — Live Helpdesk Conversations

### Release Notes
- New customer and operator replies appear in the open Helpdesk conversation without manually refreshing the page.
- When a customer asks the assistant for a person, confirms the handoff, and a ticket is created, the assistant opens that exact ticket for a continuous conversation.
- A failed reply now shows one clear error message rather than an additional browser error alert.
- Customer messages appear on the sender's right and support responses on the left. New customer conversations receive an immediate acknowledgement; after hours it includes the urgent support number.

## 2026-07-24 — Sales App Consolidation

### Release Notes
- The standalone Sales app has been closed and removed from the launcher.
- Admins now manage proposals from CRM and quotations plus website orders from Website.
- Admins can now save and test DHL Express MyDHL credentials for on-demand tracking and landed-cost estimates. No shipment, label, or pickup is created by this integration.

## 2026-07-22 — Staff Public Networking Cards

### Release Notes
- Staff can publish a shareable digital business card at `/connect/:slug` with selected email, WhatsApp, phone, skills, and links.
- Event sharing is one tap from the staff profile home screen through **Share my card**, which displays the public-card QR code.
- Administrators can preview or configure a staff member's card directly from Admin → Settings → Users using the QR and ID-card row actions.

## 2026-07-19 — Contacts Access Deployment Assistant

### Release Notes
- Admins can open **Deploy access** from Contacts to provision customer portal or internal staff access without navigating among Contacts, Users, and Website Portals.
- The flow searches by person, email, or account number; it never silently chooses a customer or links an existing login.
- **Access training** provides first-use sandbox scenarios, exception guidance, and an operations follow-up template.

## 2026-07-18 — Integration Status Recovery and Dependency Refresh

### Release Notes
- Administrators can recheck the payment gateway and clear a stale error only after a successful zero-impact credential test.
- Innovations sync status can be refreshed on demand; duplicate account-number links disappear from the warning once the underlying records are resolved.

## 2026-07-16 — Portal Statements and Live Order Status

### Release Notes
- Approved customer accounts can open Statements; only an explicit statements-feature disablement keeps the link locked.
- The local portal server at `http://localhost:8081` can call the live-data gateway, so the live order and delivery panels no longer fail with the generic Edge Function transport message during local public-site testing.

## 2026-07-14 — Website Portal Contact Editing

### Release Notes
- Opening Admin → Website now lands on Website Portals.
- Choose a customer from Website Portals to edit their contact and Innovations account linkage in the familiar Contacts modal without leaving the page.
- Portal accounts now display the email stored for the website signup even when the admin user-list service is unavailable.
- A normal row click opens Portal Settings in that same modal. Right-click a row for direct Contact, Portal, Emulate, or Create login actions.

## 2026-07-13 — Specialty Lenses

### Release Notes
- Added a Specialty Lenses page for Endless Pilot Progressive and OmniLux NAL, with expandable on-page information instead of separate product pages.
- The page is available under Lifestyle Lenses. The desktop column now reads House Brands, and the mobile menu opens as a full-screen frosted panel.

## 2026-07-13 — Innovations EFT Bank Portal Directory

### Release Notes
- Bank Payment Portals automatically receives the exact bank names configured in Innovations for EFT customers.
- Customers are sent only to verified online-banking destinations; the system shows a support fallback when a source value is a placeholder, non-retail institution, or otherwise lacks a verified sign-in page.

## 2026-07-13 — Admin Email Preview Center

### Release Notes
- Settings now includes Email Previews, a split workspace for reviewing all active auth and application emails.
- Operators can switch between templates and change sample name, recipient, and subject values to review personalized preview copy without sending messages.

## 2026-07-13 — Storefront Cost-Access Regression Guard

### Release Notes
- Public storefront prices render for anonymous visitors through safe product RPCs.
- Cost-bearing base tables remain inaccessible to anonymous and non-editor authenticated users, with CI blocking unsafe migration changes.

## 2026-07-11 — Portal Statements and Order Status

### Release Notes
- Statements show only real posted Innovations records, including aging buckets, statement totals, and itemized financial activity.
- My Orders now shows active Innovations WIP and valid same-day shipments from MSSQL-SVR using only Rx number, patient, received date, and current status; existing delivery tracking remains available.
- The sign-in form has a clearer modern layout, inline password-reset access, and a show/hide password control.
- My Account now displays the linked ERP account number (or `ACC#` until one is linked) and places Sign out beside Save Changes.
- Open shipment records remain visible regardless of age; closed deliveries remain available for 30 days and can expand to show shipment work and an export tracking link when supplied.
- Customers can jump to each order section from live count pills, search active lab work by patient or Rx number, and use the wider responsive account layout.

## 2026-06-24 — Product Cost RLS + Analytics Insert Hardening

### Release Notes
- Direct reads on `addons`, `lenses`, and `supplies` now require admin/operator edit access so viewer/customer roles cannot read cost-bearing columns.
- Public product browsing remains available through existing cost-free public views.
- Public analytics writes now validate UUID-shaped visitor IDs, safe path values, known web-vital metrics, ratings, and bounded values.
- npm dependency refresh resolved the reported audit vulnerability; `npm audit` now reports zero vulnerabilities.

## 2026-06-05 — Shipment Costing Fixes + Security/Print Hardening

### Release Notes
- Shipment Detail no longer overwrites charge edits with line-item edits, and the FOB column is now preserved as read-only in the admin costing view.
- Admin UI polish fixes landed for sidebar behavior plus shared input/select rendering to address the text cutoff issues merged this week.
- The DEV merge hardened quote printing, transactional-email authorization/CORS handling, and Vercel security-header synchronization while removing Bun lockfile drift from the npm-only workflow.

## 2026-04-13 — LED PRO Public Lens Page + Admin Rendering Safeguards

### Release Notes
- Added a new public LED PRO lifestyle-lens page at `/lenses/led-pro`.
- LED PRO now appears in public navigation, lens-guide discovery, knowledge-center content, and site search so every public entry point resolves to one canonical route.
- The LED PRO watch section now uses a live embedded demo instead of relying on a locally merged video file.
- Helpdesk SLA policy descriptions now render only after shared rich-text sanitization, and PDF preview starts from an explicit 100% manual zoom state.

## 2026-04-06 — Companion Assistant (Public AI Floating Assistant)

### Release Notes
- A floating companion assistant is now available on all public pages, providing AI-powered help for visitors.
- The assistant is model-backed via the new `companion-assistant` Edge Function.
- A dedicated full-screen assistant window is accessible at `/assistant`.
- Public search panel updated with improved assistant integration.

## 2026-03-31 — PR Doc Symmetry Guardrail

### Release Notes
- Added a module documentation index and PR guard to enforce code/doc companion updates.
- CI PR checks now run doc symmetry validation as a required gate.
- Exception handling now supports explicit rationale-backed overrides via bug exception files or PR metadata labels.

## 2026-02-28 — Admin E2E Runtime Hardening (Lead Finder graceful fallback)

### Release Notes
- Lead Finder now degrades gracefully when the `lead-intelligence` Edge Function cannot be reached.
- Users receive a clear in-page warning and non-crashing diagnostics state instead of repeated fatal runtime failure behavior.
- Search action now catches unexpected failures and reports a controlled toast error.

## 2026-02-28 — Contacts/CRM Location UX Upgrade (Country→State/City constrained dropdowns)

### Release Notes
- Contacts edit dialog now shows Country first, with State and City dropdown options constrained by selected country.
- CRM Manual Opportunity Intake now uses Country, State, and City dropdowns with country-constrained options.
- Existing saved location values continue to display and remain selectable even if legacy/custom text was used previously.

## 2026-02-28 — Product Catalog Regression Fix (Row Scroll + Working Filters)

### Release Notes
- Product catalog table rows now scroll again inside their table frames.
- Filter popovers now stay interactive after opening, so option selection and apply behavior work as expected.
- "Select All" in filter popovers is now directly clickable to clear narrowed selections quickly.

## 2026-02-28 — Product Catalog Table UX Fixes (Sticky Headers + Filter Overlay + Tab Counts)

### Release Notes
- Product catalog segment tables now keep one sticky header layer, preventing header cells from drifting out of frame while rows scroll.
- Column filter popovers now render in a top-level portal with fixed positioning and stronger z-index stacking, so they appear above rows and sticky headers.
- Lens, Add-ons, and Supplies filter tabs now display live counts (e.g., `Active (42)`) based on the current search and column-filter context.

## 2026-02-28 — E2E Stability Pass (Help Panel + Wiki Keying)

### Release Notes
- Fixed an update-loop issue in Help Panel expansion state initialization.
- Fixed duplicate-key warning in wiki section table-of-contents generation for repeated headings.
- Re-validated core admin route smoke checks and credentialed browser flow.

## 2026-02-28 — Admin CRM Homepage + Wiki Markdown Visibility

### Release Notes
- `/admin` now redirects admins/operators/viewers to `/admin/crm/pipeline`.
- Help/Wiki now includes a dedicated **Release Ledger** section with markdown-backed Release Notes, Changelog, and Delivery Plan articles.
- Wiki content renderer now supports markdown headings (`#`, `##`, `###`) and fenced code blocks.

## 2026-02-28 — Smoke Harness Reliability + Credentialed Login Validation

### Release Notes

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Release Notes
