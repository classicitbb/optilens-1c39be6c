# Frontend Help Docs

## 2026-09-04 — Payment activity and saved cards

- Administrators can open **Settings → Payment Activity** to confirm whether a Scotia card payment was successful, declined, or had an error. The page intentionally does not show card or bank-response details.
- When paying a statement by card, select **Save this card securely for future payments** before continuing to Scotiabank. The card is saved only if the bank approves the payment; full card details and CVV are never stored by Classic Visions.

## 2026-08-27 — Keeping contact details up to date

- Contacts are topped up automatically overnight. Blank website, phone and address fields are filled from the business's public listing; anything already filled in is left alone.
- When a public listing disagrees with what is stored, the Copilot raises an approval card showing the current value, the proposed value, the source link and a confidence score. Select **Apply fields** to accept it or **Reject** to dismiss it — a rejected finding is not proposed again.
- To run it yourself: open a contact and select **Enrich from public web**, use **Leads → Bulk Actions → Enrich All**, or ask the Copilot to "enrich <business name>", "what enrichment is pending?" or "queue those for approval".
- Country is always sent for approval rather than filled in, because every contact starts with Barbados as its stored country and that default cannot be told apart from a deliberate entry.

## 2026-08-27 — Choosing a microphone and asking the Copilot what it can do

- In the floating Copilot, select the chevron beside the microphone to choose an input device. The active device is ticked, and the bar beside the microphone moves while it is picking up sound.
- Turn on **Hold to record** to record only while the microphone button is held. Both the device choice and this setting are remembered on your browser and apply to the full Copilot console as well.
- If a remembered microphone is unplugged, the Copilot switches back to the system default and tells you.
- Ask the Copilot what it can do — for example "what can you change on this page?" or "where is this data from?". It knows the modules, pages and data sets of OpticAdmin and will offer to do the work rather than describe the manual steps.

## 2026-08-22 — Using the updated customer portal

- In the Rx form, patient names are normalized to uppercase in the completed-section summary. Staff-only settings stay in the page header; the sticky order toolbar contains order actions only.
- Portal Copilot CRM evidence and inference remain visible inside each action card. Select **Approve** to create the reviewed follow-up task; preparing the suggestion alone creates no CRM work.
- Select **Preview** on Saved Drafts for a quick read-only view; choose **Continue** or **Restore** only when you want to edit or return items to the cart.
- Select a lab-order row to review its received date, promise date, status and available invoice total. Prices shown there are Barbados dollars (BBD); web-store/cart prices are US dollars (USD).
- Use the divider control to collapse account navigation to icons; hover or focus an icon to see its destination.
- Select **Help** again to close the assistant. The history icon opens saved chats in the same panel; drag the desktop panel header to move it.
- Microphone dictation fills the composer for review and editing. Enter sends; Shift+Enter adds a line, and the composer scrolls after six lines.
- Cards saved during checkout appear under **My Profile → Saved payment methods**. Edit their saved details or remove them there; new cards are added only through checkout.
- Shipping and billing addresses appear under **My Profile → Saved addresses**. While editing a profile contact field, press Enter or select the checkmark to apply it.
- In Portal Copilot, click the microphone once to begin recording and again to stop. Wait for **Transcribing…**, then review the punctuated text and confirm it before sending.

## 2026-08-18 — Downloading a statement PDF

- Open **My Account → Statements** and use the authenticated statement link. PDF download requests are authorized against the signed-in customer account and do not expose OneDrive credentials.

## 2026-08-15 — Saving a stock quotation

- Build the stock order, wait for the automatic draft save, then select **Save as quotation**. The saved quotation opens in DocStudio for the document workflow.
- A product price follows the selected account's pricelist, Retail fallback, then the published catalog. If none applies, an editing staff member must enter a non-zero manual price and explain why.

## 2026-08-14 — Reviewing Copilot CRM suggestions

- In **Admin → Portal Copilot**, enter **Scan CRM for lapsed buyers and qualified follow-up opportunities**.
- Review the source evidence separately from Copilot's inference, plus the priority, due date and recommended next action. Edit the internal task if needed.
- Select **Approve** only when it should become live CRM work. Rejecting leaves the CRM unchanged; the scan never creates an opportunity automatically.

## 2026-08-14 — Using multiple Portal Copilot chats

- Select **New chat** to open a separate conversation. Start as many as needed; each appears in the **Chats** sidebar after creation.
- Select any chat in the sidebar to restore its messages and associated ERP approval cards. Starting or switching chats does not delete earlier work.
- A new chat is titled automatically from its first command or attachment note.

## 2026-08-13 — Portal Copilot ERP rollout

- Open **Admin → Portal Copilot** and enter **Roll out portal access to all ERP customers**. Voice input must be reviewed and confirmed before the workflow can prepare actions.
- For voice input, press and hold **Hold to talk**, approve microphone access if Edge asks, continue holding while speaking, then release to review the transcript.
- Review the live summary and each action. Correct editable email or follow-up details, then approve invitations individually; rejecting an action records the decision without provisioning access.
- A partial-failure badge means the portal account exists but the invitation email was not queued. Resolve the email issue and use retry; do not create a second account manually.
- If the page reports that Copilot storage or the Edge Function is unavailable, deploy the Copilot migration and functions before using the workflow.

## 2026-08-12 — Releasing an order through Gatekeeper or Innovations

- In the Rx and Stock Order forms, choose the transport at release time. A Gatekeeper release sends immediately; an Innovations release waits for the office worker.
- Use **Preview file** to inspect the exact Hashref order before release. If a stock item cannot be released, correct its website publication, pricelist price, or variant OPC/SKU first.
- If Gatekeeper contract refresh fails, reconnect or refresh contracts in Admin → Settings → Integrations; the sender requires an active contract with lab number, customer number, and routing key.

Support-facing notes for the frontend runtime.

## 2026-08-11 — Stock order form

- Open the header grid and select **Stock Order Builder**, or type **stock order** into the header search bar.
- The account picker intentionally lists only lab accounts with stock-lens pricing. If an expected account is missing, confirm its CRM **Is Lab** tag and assigned stock pricing.
- Select **Add to drafts** to save a staged order. Open **Website → Quotations** to see Stock order drafts, then choose **Open draft** to continue it.

## 2026-08-06 — Header launcher shortcuts

- Open the grid icon in the admin header, then select **Activities** to go directly to CRM follow-ups and scheduled work.
- Select **Rx Order Form** to start an admin Rx quotation without first opening Website → Quotations.
- A shortcut is hidden when the signed-in staff member does not have access to its owning CRM or Website app.

## 2026-08-06 — Quote requests and replies

- A customer sends the original product and quantity details once from **Quote Requests**. The sent request cannot be edited afterward.
- Open **View conversation** beside the request to send corrections or additional details. Staff replies and customer replies remain in the linked Helpdesk ticket.
- A **Legacy request · No Helpdesk conversation** label means the request predates ticket linking; it remains visible but has no fabricated conversation.

## 2026-08-04 — Multiple accounts on one login

- Customers with more than one active company account use the account selector beside **My Account**. Customers with one account do not see the selector.
- Confirm the company name or account number shown in the selector before placing an order, opening a statement, or starting a payment.
- To grant another account, use Deploy access with the person's existing login and the additional customer. This adds access without changing the original default account.
- If an expected account is absent, verify that its membership is active. Do not create a second login or change `profiles.crm_customer_id` to force access.

## 2026-08-04 — Lab pricelist access

- In Admin → Contacts, select **Is Lab** on the portal person or their linked company and save the contact. When the customer returns to My Pricelists, Stock Lenses and the Lab Supplies section should appear.
- If access remains hidden, confirm the contact is linked to the same customer account as the portal profile and confirm the tag save did not show an error.

## 2026-07-30 — Live Helpdesk conversations

- When viewing an open ticket, new replies should appear without refreshing. If they do not, first check that the user is signed in and permitted to the ticket; the page deliberately does not subscribe to any other customer's conversation.
- Operators receive a Helpdesk notification when a customer replies. Opening the ticket shows the complete current thread; no inbox reload is needed.
- If sending fails, the operator should receive a single **Failed to send** notice. A second browser-level promise error is a regression and should be reported with the ticket URL and time.
- In a customer conversation, messages written by the signed-in customer are on the right and support replies are on the left. The office sees the inverse: staff messages right, customer messages left.
- A customer receives one automatic acknowledgement per ticket. Outside Monday–Friday, 8:30 AM–5:00 PM Barbados time, it advises that the ticket will be reviewed next business day and gives **+1 246 433-4928** for urgent help.
- In the assistant, a customer must confirm **Ask a person** before the Helpdesk conversation is created. After confirmation, use the opened ticket to continue with a human.

## 2026-07-24 — Sales app consolidation

- The Apps launcher no longer has Sales. Open CRM → Proposals for proposal work.
- Open Website → Quotations for quotes and their print previews, and Website → Orders for public-store order fulfilment.
- Old `/admin/sales/**` and `/admin/orders` addresses are intentionally unavailable; use the destination app links above.

## 2026-07-24 — DHL Express integration

- Open Admin → Settings → Integrations to save the DHL Express account number plus the MyDHL API username and password supplied by DHL. The password cannot be viewed after saving; enter both credential fields to rotate them.
- Use **Test configuration** before enabling the service. The test sends only DHL's read-only reference-data request; it does not create a shipment, label, pickup, or quote. DHL's test environment allows 500 service calls per day.
- Tracking and landed-cost requests are server-side, on-demand admin operations. The customer Delivery Status panel stays on its existing customer-scoped source until DHL tracking can be safely matched to the customer's delivery record.

## 2026-07-22 — Staff networking cards

- For a trade show or networking event, staff open their profile home screen and select **Share my card**. The QR code opens their public card without requiring the recipient to sign in.
- Recipients can use **Save contact** on the public card to download a `.vcf` contact file, or tap an email/WhatsApp button to start contact directly.
- Administrators can configure or inspect a card at Admin → Settings → Users: use the ID-card icon to edit, and the QR icon to preview. A card must be published before its QR code should be shared.
- If a card must stop being public, switch off **Publish this card** and save; the public route immediately becomes unavailable.

## 2026-07-19 — Contacts access deployment

- Start in Admin → Contacts → **Deploy access**. Search by person, email, or account number, then choose the contact and the primary customer account; the assistant will not make either choice silently.
- If a login already uses the contact email, choose whether to link it or leave it unchanged. A login that has not verified email can be prepared, but it remains locked until verification.
- Use **Access training** before live deployment for the guided sandbox scenarios. For a missing email, incompatible customer link, duplicate account number, or failed deployment, copy the operations follow-up template from its Exceptions tab.
- A synced Innovations field may fill an empty CRM field but must not overwrite a populated CRM value. Correct the contact/customer record before retrying a deployment.

## 2026-07-18 — Integration status checks

- If the payment gateway badge shows Error after credentials were corrected, open Admin → Settings → Integrations and select **Recheck & clear error**. The test creates no charge; it only verifies credential resolution and request-hash generation.
- For an Innovations duplicate account-number warning, correct the customer linkage in the source/admin workflow and then select **Recheck status**. Do not clear the warning without resolving the duplicate records.

## 2026-07-16 — Statements and live status access

- An approved customer should see Statements as an active account-navigation link. If it remains locked, review that customer's Statements feature override in the portal administration screen.
- If My Orders shows “Failed to send a request to the Edge Function” during local testing at `http://localhost:8081`, confirm the deployed Edge Functions include the latest CORS release. This is a browser request-origin issue, not an order-data result.

## 2026-07-14 — Website Portals

- Admin → Website now opens Website Portals. Website page content management remains at Admin → Website → Content.
- Select a customer account to open its Contacts edit modal without leaving Website Portals. Use Details for the signup email and contact details, and Account Settings for the Innovations account number.
- A missing website email after this release indicates an incomplete signup/profile synchronization issue, not a portal display-only field. Confirm the profile email in the customer contact flow.
- A normal click opens Portal Settings in the shared dialog. Right-click a customer row for Edit contact, Edit portal, Emulate, or Create login; unavailable actions are disabled until the customer is linked or has a website login.

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
