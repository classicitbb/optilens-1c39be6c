# Onboarding and lifecycle audit — 2026-10-24

Goal under test: reach every optical practice in the Caribbean, 10x accounts, over $10M sales by 2028, with timing automated and content supervised.

Method: read the code paths end to end and ran the existing tests. Nothing was run against hosted data, no email was sent, no form was submitted. There is no Deno, no Postgres and no staging target in this environment, so edge functions and RPCs were read, not executed.

## 1. Scorecard against your requirements

| # | You asked for | Today | Verdict |
|---|---|---|---|
| 1 | Forms work from every angle a customer can use | Trade-account and price-list forms post to `contact-inquiry` (rate-limited, honeypot, CRM match, ticket, owner alert). Sign-up goes through the same function. | Works for the public path. No tokenised invitation path, no save-and-resume, no admin-on-behalf path. |
| 2 | Admin side is a guided flow, little data injection | Inquiry becomes a helpdesk ticket plus a CRM contact at stage `qualifying`. Everything after is manual: create user, link customer, assign pricelist, approve. | Missing. No wizard, no decision tree, no "type of account to configure" choice. |
| 3 | Staff can onboard on the customer's behalf | `create-user` / `invite-user` exist but take bare email, password and customer id. The application data (credit refs, business type, volume) is not carried into account setup. | Missing. |
| 4 | Employees sign in, self-joined or added, systematised | Strong base: `portal_account_memberships` with roles (owner, manager, ordering, finance, member, viewer), per-feature overrides, audit events, approval queue, `confirm-portal-staff`. | Data model is right. Flow is fragmented: employee self-claim needs an account number then staff approval; the account owner cannot add colleagues; `confirm-portal-staff` takes no role. |
| 5 | See the stage a lead is in, and send it to them | `contacts.pipeline` + `contacts.stage` (target → ... → customer, plus nurture) with a board. Only `stage_entered_at` is stored. | Stage is visible. Stage history is not kept, and nothing is sent to the lead on a stage change. |
| 6 | Send an application/onboarding link at the right stage | No invitation token, no per-contact link, no "application opened / started / submitted" tracking. | Missing. |
| 7 | Congratulation emails as a client passes stages | None. The onboarding email template exists but is deliberately never sent. | Missing. |
| 8 | "No" leads kept warm with tips, timing unsupervised, content supervised | `nurture` stage and cadences exist; AI drafts land in `outreach_outbox` as drafts for approval. | Design matches your rule. Execution does not: see findings 1 to 3. |
| 9 | Periodic dated campaigns to existing customers, manage replies | Doc Studio mail-merge plan exists; cadences are per pipeline. No dated calendar, no reply capture. | Missing. |

## 2. Test results

- Ran: `customerOnboarding.integration`, `AuthPage`, `ProfessionalsPortalPage`, `publicInquiryRouting`, `portalAccessDeployment`, `leadDossier`. 6 files, 42 tests, all pass.
- Caveat: `customerOnboarding.integration.test.ts` only asserts that source files contain certain strings. It proves the wiring is present, not that an account gets created. No test exercises a real onboarding end to end, a stage change, a duplicate submission or a cadence run.
- Not run: edge-function execution, SQL/RLS behaviour, live email delivery, authenticated browser walkthrough.

## 3. Findings, most serious first

1. **Cadences only advance when a person opens the outbox.** `useGenerateDueSteps` is client-side ("scheduler-lite", `src/features/admin/crm/hooks/useCadences.ts:119`). If nobody opens the page, no step is drafted. This contradicts "timing unsupervised". Needs a scheduled server job.
2. **Outreach send bypasses suppression and unsubscribe.** The outbox sends by `mailto:` / `wa.me` (`src/pages/admin/crm/CrmOutboxPage.tsx`), not through `sendManagedEmail`, which is where suppression, retries and the unsubscribe footer live. Bulk or automated nurture cannot ride on that. There is also no per-contact marketing consent or do-not-contact flag in the CRM path.
3. **No stage history.** `stage` and `stage_entered_at` are overwritten on each move (`supabase/migrations/20260713120000_crm_pipeline_foundation.sql`). You cannot show "contact, lead, conversation, price list, application" as a timeline, measure time in stage, or find where leads stall.
4. **Every web inquiry lands at `qualifying`.** `matchOrCreateSalesContact` (`supabase/functions/_shared/leads/gather.ts:66`) sets `qualifying` for price-list requests, trade applications and portal sign-ups alike. A completed application should be a different stage from a price-list request.
5. **A form submit changes nothing for the visitor beyond a toast.** `ProfessionalsPortalPage.tsx:430` shows "our team will follow up". Confirmation email is conditional on the account's auto-notification setting and absent for some inquiry types, and there is no status page or reference number.
6. **Profile is written before the inquiry for signed-in users** (`ProfessionalsPortalPage.tsx:396-406`). If the inquiry then fails, the profile is already changed and the user is told to retry. Low harm, but not atomic.
7. **Existing-user lookup breaks past 1,000 logins.** `invite-user` and `create-user` find an existing user with `listUsers({ perPage: 1000 })` and one page only (`supabase/functions/admin-user-management/index.ts` around lines 347, 372, 433). Beyond 1,000 auth users an existing person returns "A user with this email already exists" instead of being linked. Fix with a direct lookup by email.
8. **Onboarding does one thing.** `customer-onboarding` assigns the first template pricelist and returns success even when no template exists (`pricelistAssigned: false`). The caller logs failures and moves on (`triggerCustomerOnboarding`), so staff are never told setup was incomplete.
9. **Default invite is a link the admin must paste by hand** (`generateLink`, no email). Whether the customer ever used it is only tracked by a manual "invite sent" timestamp.
10. **No application-to-account bridge.** The credit/reference answers go into ticket notes as free text. Nothing turns them into a structured application record staff can review, approve, or convert into customer + pricelist + credit terms.

## 4. Target design

### 4.1 One lifecycle, one record
Keep `contacts.stage` as the spine and add:
- `contact_stage_events` (contact, from, to, at, actor: human | rule | AI, reason). Written by a trigger so no path can skip it.
- `lifecycle_templates`: for each stage, an optional customer message, an optional internal task, and an owner role.
- Split the early stages by evidence: `price_list_requested`, `application_sent`, `application_started`, `application_submitted`, `account_approved`, `first_order`, `second_order`. "Second order" is the real conversion marker.

### 4.2 Invitation and application as one object
- `onboarding_invitations`: token (hashed), contact, type (`price_list`, `trade_account`, `team_member`), pre-filled fields, expiry, status (sent, opened, started, submitted, expired).
- `account_applications`: structured answers (business type, branches, volume, credit route, references) tied to the contact, with `source` = `self_service` | `staff_assisted`.
- Staff-assisted mode is the same form, opened by staff, with a "complete on behalf of" banner, phone-friendly field order, and a record of who typed it. Customer gets a confirm-and-sign link afterwards, so the consent is theirs.

### 4.3 Admin wizard (the "multiple choice" step)
On application submit, staff see one screen, not a ticket:
1. Account type: new independent, chain, lab, department store, existing customer adding a site.
2. Payment route: prepaid, supplier references, requested starter limit. Credit is a recommendation with evidence, never auto-granted (matches the current rule).
3. Pricing: which template or tier, one tap, shows margin floor result.
4. Portal: owner login, feature set preset by account type.
5. Welcome pack: pre-built message set for that type and country, editable.
Each choice writes the records the manual path writes today (customer link, pricelist access, membership, ticket close, stage move) in one transaction with an audit event.

### 4.4 Team access
- Owner invites colleagues from their portal (role picker, default `ordering`); optional email-domain auto-match that still lands in the approval queue.
- Staff-added employees use the same invitation object with type `team_member`.
- `confirm-portal-staff` takes a role and feature preset. One queue shows both self-claimed and invited people.
- Quarterly "who still needs access?" prompt to the owner.

### 4.5 Stage emails
Event-driven from `contact_stage_events`: acknowledgement on submit (with reference number), "application received", "approved, here is how to order", first-order congratulation, second-order thank-you. Each is a template that staff approve once, then it sends unattended. Edits to wording re-enter review.

### 4.6 Not-now and long-standing customers
- Not now: acknowledge warmly, move to `nurture`, enrol in a monthly tips sequence. Content library approved in batches (six to twelve items), cadence timing automatic.
- Existing customers: a dated campaign calendar (new lens families, portal features, statements, pricelist education). Replies route into the existing helpdesk/inbox as tickets, tagged with the campaign.
- Both require a server scheduler, unsubscribe link, and suppression check on every send.

## 5. Frontier standards check

| Area | Frontier practice | Where you stand |
|---|---|---|
| Email deliverability | SPF, DKIM, DMARC aligned; one-click unsubscribe header (RFC 8058); spam complaints kept under about 0.3%; Gmail and Yahoo enforce this for bulk senders | Transactional path is managed. CRM outreach path is not covered (finding 2). |
| Consent and data protection | Recorded basis and opt-out per contact; Barbados, Jamaica and Trinidad and Tobago each have data protection law with different status | No consent field in CRM. Have counsel confirm per-country B2B rules before bulk sends. |
| Lifecycle tracking | Immutable stage events, time-in-stage, conversion rate per stage | Missing (finding 3). |
| Onboarding | Time-to-first-value is the metric; progressive disclosure; save and resume; assisted completion | No measurement, no resume, no assisted path. |
| Lead response | Reply inside minutes, not hours | Owner alert states a 4 business-hour reply target. An instant, accurate acknowledgement plus a booking link closes most of the gap. |
| Agent safety | Human approval on irreversible and external actions; logged, reversible, bounded | Current design (AI drafts, human approves, AI never sets price or credit) is sound and should be kept. |

## 6. Where decision AI and other AI can remove human input

Use a ladder: rules first, then a model for judgment on messy text, then autonomy only where a wrong action is cheap and reversible.

| Job | Approach | Autonomy |
|---|---|---|
| Find and enrich every Caribbean practice | Existing lead finder plus Places data; model deduplicates and classifies | Full, review exceptions weekly |
| Score and route (A/B/C/D in your hub doc) | Deterministic score first (size, country, fit, engagement), model only to read free-text replies | Full |
| Read replies and classify intent (interested, not now, wrong person, price, unsubscribe) | Model classifier with confidence; low confidence goes to a person | Full for unsubscribe and not-now; human for interested |
| Send timing | Rules by stage, country business days, send windows, throttles | Full |
| Message content | Model drafts from approved library and facts; human approves each new template, not each send | Supervised once, then automatic within template |
| Application triage | Checklist: required fields, reference format, duplicate or existing customer, sanctions-style red flags. Model summarises evidence | Auto-complete the clean ones; staff approve credit |
| Credit and discounts | Policy rules plus order history. Model explains, never decides | Human, always |
| Team access requests | Domain match + owner confirmation | Auto if owner confirms |
| Stalled-lead rescue | Rule detects time-in-stage beyond baseline, drafts a different angle | Draft for approval |
| Customer growth | Order-gap and range-gap signals (`order_activity` already syncs) select who gets which campaign | Full on selection, supervised on content |
| Voice and WhatsApp | Click-to-call is being built; add transcripts into the timeline and let a model summarise and propose next step | Summary auto, action human |

Decision AI here means a transparent policy layer: each decision carries inputs, rule fired, and confidence, and is stored in the stage event. Auditability matters more than model sophistication, because it is what lets you widen autonomy safely.

Guardrails to keep: no invented claims, prices, urgency or proof (your standing rule); no model access to unrestricted data; spend ceiling per day on sends and AI; kill switch per campaign; every automated send reversible by pause.

## 7. The $10M by 2028 target

The arithmetic you need is two numbers I do not have: current active accounts and average annual spend per active account (derivable from `order_activity` and invoices). Illustration only: at 250 accounts averaging $40k a year the run rate is $10M; at 500 accounts it is $20k. The funnel then sets the effort: accounts needed divided by conversion rate gives practices to reach, and the time-in-stage numbers give the capacity.

Three levers, in order of return: (1) activate and deepen the existing base (second order, range expansion) because it is cheapest and the data is already there; (2) shorten application-to-first-order, which is the stage where this build is weakest; (3) raise reach to every practice through automated, compliant outreach. Measure a weekly funnel: reached, replied, price list, application started, submitted, approved, first order, second order, plus time in each stage by country.

I would not publish or promise the $10M externally until the two inputs above are in the dashboard.

## 8. Suggested build order

1. `contact_stage_events` trigger and funnel view (small, unlocks all measurement).
2. Server scheduler for cadences, wired to `sendManagedEmail` with suppression and unsubscribe; consent/DNC field.
3. `onboarding_invitations` and `account_applications`; send-link button on the contact; opened/started/submitted tracking.
4. Staff-assisted application mode.
5. Admin approval wizard writing all records in one transaction.
6. Team invitation and role-aware approval.
7. Stage emails and nurture library.
8. Dated customer campaign calendar and reply routing.
9. Fix finding 7 (user lookup) and finding 8 (surface incomplete setup) now; both are small.

Items 1, 2 and 9 can start immediately and are independent of each other.

## 9. Not verified

Live behaviour of every edge function named above, RLS on the membership and CRM tables, actual email delivery and placement, the CRM outbox in an authenticated browser, and the cadence seed data on the hosted project. Percentages and standards cited are general industry practice, not measured on this system.
