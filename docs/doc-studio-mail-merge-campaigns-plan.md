# Doc Studio Mail-Merge Campaigns — Implementation Plan

Status: agreed, not started
Date: 2026-07-31
Scope: personalized bulk email ("mail merge") from saved Doc Studio email templates

---

## 1. Summary

Add a **Campaigns** surface to the admin CRM that takes a saved Doc Studio email
template, resolves an audience of contacts, substitutes per-recipient merge
fields into the subject and body, and enqueues one individually-addressed
message per recipient.

The Doc Studio email composer stays the authoring tool. It gains one thing: a
merge-field palette so tokens can be inserted into the body. Everything else —
audience selection, subject, preview, send, results — lives in a new React page.

**Save then send.** You compose and save a template in Doc Studio, then open
Campaigns and send it. There is no compose-and-blast-in-one-step path.

---

## 2. Decisions

| # | Decision | Outcome |
|---|---|---|
| 1 | Where the feature lives | New React admin page, not inside `studio.html` |
| 2 | Recipient source of truth | `contacts`; `customers` is an enrichment join only |
| 3 | Company records as recipients | Only when no person is linked to them |
| 4 | Greeting style | `Hello <FirstName>,` — no honorifics, **no schema change** |
| 5 | Merge-field insertion | Palette added to Doc Studio body editor **and** the Campaigns subject field |
| 6 | Where the merge happens | **Server-side**, new `/email/campaign` endpoint + `email_campaigns` table |
| 7 | "All customers" definition | `linked_customer_id is not null` (ERP-linked) |
| 8 | Segments | Ship with **derived** segments; defer lead/prospect triage |
| 9 | Bulk-email hygiene | Suppression + `purpose: marketing` + real unsubscribe URL |
| 9b | Suppression scope | Fixed **everywhere now**, at the queue choke point |
| 10 | Token palette | Six tokens; hard block on empty `{{AccountNumber}}`; **no credentials** |
| 11 | Review gate | Resolved recipient table, per-row render, test-send, confirm dialog |

---

## 3. Verified data baseline

Queried against the live database on 2026-07-31. These numbers justify the
design and should be re-checked if they drift materially.

### Audience size

| Metric | Count |
|---|---|
| Active contacts | 764 (530 companies, 234 people) |
| Contacts with an email | 196 |
| **People with an email** | **118** |
| People with an *effective* company (see resolver) | 102 |
| Companies with an email | 78 |
| — suppressed because a person is linked | 31 |
| — **surviving as recipients** | **47** |
| Distinct person email addresses | 114 |
| **Total addressable** | **≈160** |

### Company linkage

| Signal | People (of 118) |
|---|---|
| `business_name` (free text) | 90 |
| `linked_customer_id` | 87 |
| `parent_id` (relational) | 51 |
| **Any signal** | **118 — zero orphans** |

- 51 people have **no `parent_id` but a `business_name` that matches a real
  company record**. Treating that match as a link raises relational coverage
  from 51 to 102 and makes "everyone at this company" viable for **21
  companies covering 59 people** (up from 6 companies).
- This works **at query time**. No backfill is required.
- `business_name` and the parent company name **disagree for 7 people**. Parent
  wins; those 7 should be surfaced for cleanup.
- Normalized matching found **zero near-misses** — exact normalized comparison
  (lowercase, strip non-alphanumerics) is sufficient today.
- `linked_customer_id` contributes **zero** company suppression — ignore that
  path for linkage purposes.

### Classification (why segments are derived, not stored)

| Field | Values across the 118 emailable people |
|---|---|
| `status` | `lead` — **all 118** |
| `pipeline_stage` | New 96, Active Customer 18, Prospect 3, Inactive 1 |
| `stage` | null for 114 |
| `pipeline` | null for 114 |
| `type` | business 100, individual 18 (entity kind, not a segment) |

**All 130 ERP-linked contacts are marked `status = 'lead'`**, and 110 sit in
`pipeline_stage = 'New'`. The classification fields are stale to the point of
being misleading. Nothing in this feature may read `status`.

### Token fill rates

| Token | Populated (of 118) |
|---|---|
| Greeting / FirstName / Name / Email | 118 |
| Company | 118 (102 real, 16 fall back to own name) |
| AccountNumber | 87 — 100% of ERP-linked, blank for 31 |
| City | 84 |
| Phone | 78 |
| Country | 118, constant "Barbados" |
| Salesperson / Website | **0 — empty columns** |

### Joins and formats

- `contacts.linked_customer_id` → **`customers.id`** (87/87).
  **Not** `customers.innovations_customer_id` (0/87).
- `contacts.name` token counts: 1 word ×9, 2 ×85, 3 ×21, 4 ×2, 5 ×1.
  Last-token-as-surname would misfire on ~33 of 118 — hence no honorifics.
- Only 1 of 118 records has an embedded honorific.

---

## 4. Architecture

```
Doc Studio (studio.html, iframe)          Campaigns (React admin page)
  compose email                             pick saved template
  insert merge tokens  ─── save ──→         pick audience
  → docstudio_files                         write subject (+ tokens)
    .renderedHtml                           preview / test send
    .content                                send
                                              │
                                              ▼
                                    POST /email/campaign
                                    (docstudio-api edge function)
                                              │
                                    resolve audience  ──→ contacts (+ customers join)
                                    filter suppressed ──→ suppressed_emails
                                    merge per recipient
                                    enqueue N jobs    ──→ enqueue_email RPC
                                              │
                                              ▼
                                    process-email-queue
                                    suppression backstop (NEW)
                                              │
                                              ▼
                                       sendLovableEmail
```

Key property: `renderedHtml` already lives in `docstudio_files`, so the server
has everything it needs. The client posts under a kilobyte, not 5 MB.

### Why server-side merge

A client-side loop over 160 recipients re-uploads the full ~30 KB body per
call, and a closed tab mid-send leaves a half-sent blast with no record of where
it stopped. Server-side gives one campaign row to audit, resume, and report on.

**The token resolver exists once, in TypeScript, inside the edge function.** The
React page never renders merged output itself — it calls a preview endpoint. No
drift between what you preview and what ships.

---

## 5. Resolver specification

### Recipient set

A recipient is a **person**: `contacts` where `not is_archived`, `not is_company`,
and `email` is non-empty.

A **company** record is a recipient only if no person is linked to it, where
"linked" means:

```
person.parent_id = company.id
  OR normalize(person.business_name) = normalize(company.name)
```

with `normalize(s) = regexp_replace(lower(trim(s)), '[^a-z0-9]', '', 'g')`.

Do **not** use `linked_customer_id` for this test — it suppresses nothing.

### Effective company

```
effective_company_id =
  COALESCE(
    contact.parent_id,
    (SELECT id FROM contacts
      WHERE NOT is_archived AND is_company
        AND normalize(name) = normalize(contact.business_name)
      LIMIT 1)
  )
```

### Token resolution

| Token | Resolution |
|---|---|
| `{{Greeting}}` | `"Hello " + first whitespace token of name` |
| `{{FirstName}}` | first whitespace token of `name` |
| `{{Name}}` | `name` verbatim |
| `{{Company}}` | effective company's `name` → raw `business_name` → linked customer's `name` → own `name` |
| `{{Email}}` | `email` |
| `{{AccountNumber}}` | `customers.account_number` via `contacts.linked_customer_id = customers.id` |
| `{{UnsubscribeUrl}}` | implicit; see §7 |

For a **company-record recipient**: `{{Company}}` is its own name,
`{{Greeting}}` degrades to `"Hello,"`, and `{{Name}}` / `{{FirstName}}` resolve
to the company name.

### Dedupe

After resolution, dedupe by `lower(email)`, **keeping the person row over the
company row**. Your suppression rule already removes 23 of the 24 known
collisions; this catches the remaining 1 and any future ones.

### Segments (all derived, none stored)

| Segment | Definition | Approx. count |
|---|---|---|
| Customers | `linked_customer_id is not null` | 87 people |
| Customer contacts | people whose effective company is ERP-linked | — |
| Company inboxes | surviving company records | 47 |
| Tag group | via `contact_tag_links` | CEO 10, Owner 7, Approved Access to Statement 7, Approved Access to Pricing 6 |
| All contacts | all emailable people | 118 |

**Leads and Prospects are deferred.** Either hide them or show their real counts
(3 prospects) — never infer them from `status`.

---

## 6. Schema changes

One new table. No changes to `contacts`.

```sql
create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_file_id uuid not null references public.docstudio_files(id),
  subject_template text not null,
  audience jsonb not null,          -- { mode, spec, resolvedContactIds[], resolvedAt }
  status text not null default 'draft',  -- draft | sending | sent | partial | failed
  recipient_count integer not null default 0,
  excluded_count integer not null default 0,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
```

RLS mirroring `docstudio_files`.

`email_send_log.metadata` carries `campaign_id` for per-recipient status.

### Audience freezing

`audience` stores **both** the query spec and the **resolved contact ID list**
captured at preview time. The send uses the frozen list, so you send to exactly
the people you reviewed — a contact edited between preview and send cannot
silently join or leave the blast.

---

## 7. Send-path changes

### New: `POST /email/campaign` (docstudio-api)

Body: `{ campaignId }` (campaign row already holds template, subject, audience).

Per recipient:
1. Fetch `docstudio_files.renderedHtml` once.
2. Substitute tokens into subject and body.
3. Rewrite the footer's dead unsubscribe anchor with the real per-recipient URL.
4. Enqueue via `enqueue_email` with `purpose: 'marketing'` and
   `metadata.campaign_id`.

Remove the 100-address cap for this path — `asEmailList(body.to, 100)` blocks a
160-recipient audience.

**To: only. Cc and Bcc are not accepted on this endpoint.**

### New: `POST /email/campaign/preview`

Returns resolved recipients (name, email, company, resolved subject), the
excluded list with reasons, and on request the full merged HTML for one
recipient.

### Fix: unsubscribe URL

Both footer styles hardcode `href="#"`
([studio.html:1838](../public/ds/studio.html#L1838), [:1845](../public/ds/studio.html#L1845)).
The merge pass rewrites these to
`https://classicvisions.net/unsubscribe?token=<token>` — the pattern already
used by `send-transactional-email`.

A visible unsubscribe link that does nothing is worse than none: recipients who
want out press "report spam" instead, which is the fastest way to poison the
sending domain.

### Fix: suppression enforcement (everywhere)

`process-email-queue` forwards straight to `sendLovableEmail` with **no
`suppressed_emails` lookup**. Suppression is only enforced inside
`send-transactional-email`, which the Doc Studio path bypasses entirely.

Add a fail-closed check in `process-email-queue` immediately before
`sendLovableEmail`: on suppression, log `status: 'suppressed'` and delete from
the queue. This is the single choke point — campaigns, one-off Doc Studio sends,
order confirmations and anything added later all inherit it.

Campaigns *also* filter at resolve time, so exclusions are **visible** in the
preview rather than silently dropped downstream.

---

## 8. UI

### Doc Studio (`public/ds/studio.html`)

One addition: a **merge-field palette** on the email tab, beside the existing
"+ Save selection" control. Chips for the six tokens, inserting at the cursor
via the existing `insertSnippet()` / `insertContent()` path. Static markup, no
new state machine.

Verified safe: `esc()` escapes only `&`, `<`, `>` — **braces pass through
untouched**. `styleBody()` preserves text nodes. The preview injects via React
`dangerouslySetInnerHTML`, so the DC framework's `{{ }}` parser never sees user
content. `{{Token}}` is safe as the syntax.

Known limitation: the studio preview shows literal `{{Company}}`. Personalized
output is only visible in the Campaigns preview.

### Campaigns page (`src/pages/admin/crm/CrmCampaignsPage.tsx`)

Route `crm/campaigns`, sibling to `CrmOutboxPage` (which handles 1:1 cadence
drafts and is unaffected).

1. **Template** — pick from `docstudio_files` where `file_type = 'email'`.
2. **Audience** — segment / company / tag / multi-select / single contact.
   Always shows the resolved count and lets you expand the full list.
3. **Subject** — text field with the same merge-field palette.
4. **Review** —
   - resolved recipient table: name, email, company, **resolved subject**, all
     rows, scrollable;
   - excluded addresses listed separately with reasons;
   - click any row to render that person's full merged email;
   - **"Send test to me"** — first recipient's data, delivered to the operator;
   - **hard block** if any recipient would receive an empty `{{AccountNumber}}`,
     naming the count. Not dismissible.
5. **Send** — confirm dialog naming count and segment
   ("Send to 92 recipients in Customers?"). Plain confirm, not typed.
6. **Results** — per-recipient status from `email_send_log` by `campaign_id`
   (queued / sent / failed / suppressed), refreshable.

---

## 9. Work breakdown

| # | Area | File(s) | Notes |
|---|---|---|---|
| 1 | Schema | new migration | `email_campaigns` + RLS |
| 2 | Resolver | `supabase/functions/docstudio-api/` | shared module; audience + tokens |
| 3 | Campaign endpoints | `docstudio-api/index.ts` | `/email/campaign`, `/email/campaign/preview` |
| 4 | Unsubscribe rewrite | resolver module | footer anchor rewrite |
| 5 | Suppression backstop | `process-email-queue/index.ts` | fail-closed, before `sendLovableEmail` |
| 6 | Merge palette | `public/ds/studio.html` | chips → `insertSnippet()` |
| 7 | Campaigns page | `src/pages/admin/crm/CrmCampaignsPage.tsx` | + hooks under `features/admin/crm` |
| 8 | Route + nav | `src/routes/admin/AdminRoutes.tsx`, `src/config/navigationRegistry.ts` | |
| 9 | Tests | `src/tests/unit/` | resolver: company fallback chain, dedupe, empty-token block |

Suggested order: 1 → 2 → 3 → 5 → 4 → 6 → 7 → 8 → 9. Items 5 and 6 are
independent and can run in parallel.

---

## 10. Deployment notes

Three known traps in this project:

1. **Migrations pushed to git do not run against the live database.** The
   `email_campaigns` migration must be applied through the Lovable MCP
   (`query_database` / `apply_migration`). A git-only migration previously caused
   a three-day store outage.
2. **Pushing to GitHub syncs edge-function code but does not redeploy it.**
   `docstudio-api` and `process-email-queue` both need an explicit redeploy
   request to the Lovable agent.
3. Deploy order: schema → edge functions → frontend. The Campaigns page 404s
   against an un-redeployed `docstudio-api`.

---

## 11. Deferred

- **Lead / prospect segments** — needs `pipeline_stage` triage for the 31
  emailable non-ERP-linked people. Repair `pipeline_stage`, do not add a new
  column, and leave `status` alone (it is beyond saving; nothing should read it).
- **`parent_id` backfill** for the 51 `business_name`-matched people. Optional
  cleanup — the resolver handles them at query time either way.
- **The 7 records where `business_name` disagrees with the parent company** —
  surface for manual review.
- **Honorifics (Mr./Ms.)** — would need `salutation` *and* `last_name` columns.
  Explicitly rejected: `name` is a single field and 33 of 118 records would
  misparse, and gender must never be inferred from a first name.
- **Hygiene fixes for the one-off Doc Studio send path** beyond suppression
  (which is now fixed globally). Marketing classification and unsubscribe
  rewrite remain campaigns-only.
- **Scheduled sends, A/B, open/click tracking** — not in scope.

---

## 12. Out of bounds

**Credentials must never be merge fields.** The existing onboarding email
carries `Username:` and `Temporary Password:`. Mail-merging those would mean
plaintext passwords joinable to a contact list, and one resolver bug mails the
wrong person's password to the wrong company. Credential delivery stays in the
`customer-onboarding` edge function — per-person, transactional, generated at
send time.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Silent token typo ships to 160 people | Palette insertion, not hand-typing; resolved subject shown per row in review |
| Empty `{{AccountNumber}}` for 31 people | Hard block at preview, not a warning |
| Stale `status` field misread as a segment | Nothing reads `status`; segments derived from `linked_customer_id` |
| Duplicate sends to person+company | Suppression rule (kills 23/24) + dedupe by lowercased email |
| Suppressed/bounced recipients mailed | Fail-closed check in `process-email-queue` + visible resolve-time filter |
| Audience drifts between preview and send | Frozen resolved contact ID list on the campaign row |
| Cc/Bcc leaking the customer list | Endpoint rejects Cc/Bcc; To-only, one message per recipient |
