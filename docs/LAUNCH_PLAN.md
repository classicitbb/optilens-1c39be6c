# Launch plan (handoff, 2026-11-13)

Goal: the site fully launched to customers. This is the working list for the agent
that picks it up. It comes from a fast review on 2026-11-13: live-site probes, a
read-only look at the live database, CI, and the repo. Each finding says how it was
checked so it can be re-checked before acting. Nothing here was fixed unless it
says so.

Read `AGENTS.md` and `STATUS.md` first. The rules at the end of this file apply to
every item.

## What was checked and what it showed

| Check | Result |
|---|---|
| Live pages (`/`, `/store`, `/knowledge`, `/professionals/*`, `/find-a-retailer`, `/auth`, `/pay`, legal pages, `robots.txt`, `sitemap.xml`, `llms.txt`) | All answer 200 from Vercel. Sitemap lists 58 URLs. |
| Security headers on `www.classicvisions.net` | CSP, HSTS (preload), `nosniff`, `X-Frame-Options`, Referrer-Policy and Permissions-Policy are all present. |
| Database vs repo migrations since August | 139 tables, 211 functions and 70 columns created by migration files were looked up live. All exist except `wiki_headings.parent_id` (new, item 6) and `statement_document_jobs.storage_bucket`. This checks that objects exist, not that function bodies are the latest version. |
| QuickBooks sandbox | Connected 2026-11-12. Disconnect and three reconciliations completed with no errors. |
| QuickBooks production | Not working. See item 1. |
| CI on `main` | "PR Validation" is red on the last two pushes: the release-ledger drift check fails. Lint, tests, typecheck and build jobs pass. |
| Email, last 7 days | 7 sent, 0 failed. |
| Edge function health table | Tracks only 3 functions; all healthy. |
| Open security alerts | None. |
| Portal accounts | 87 active memberships (79 people), 1 pending. |
| Open pull requests | None. |

## Phase 1: blockers

Do these in order. Items marked **owner** need a person with access or a decision;
prepare everything else and ask.

### 1. QuickBooks production connection

Found: `https://qbo.classicvisions.net` answers through Cloudflare with the public
website's HTML for every path, including `POST /qbo/transaction` (200, HTML). It is
not a gateway. The sandbox host answers correctly (403 without a session, 204
preflight with the admin origin echoed). `qbo_integration_state` has a sandbox row
only. The Integrations page shows a production card whose Connect button therefore
fails; "QuickBooks connection unavailable" was logged 16 times on
`/admin/settings/integrations`.

Do:
1. **owner** Point `qbo.classicvisions.net` at a Vercel deployment of this repo
   configured as the production gateway, with the secrets listed in
   `docs/qbo-oauth-production-runbook.md` (`QBO_GATEWAY_ENVIRONMENT=production`,
   the production client ID, `QBO_REDIRECT_URI=https://qbo.classicvisions.net/qbo/oauth/callback`,
   and the rest).
2. **owner** In the Intuit developer portal, complete the production-keys review
   for the app and add that redirect URI. Production keys are only issued there.
3. **owner** On the OptiLens Local host, create the production protected store and
   set `OPTILENS_QBO_ENVIRONMENT=production`. Leave
   `OPTILENS_QBO_PRODUCTION_APPLY_ENABLED` unset.
4. In `QboIntegrationCard.tsx`, read the gateway response as text before parsing so
   a non-JSON answer gives a plain message ("The QuickBooks gateway is not
   answering") instead of a parse error.
5. Follow up on three gaps seen in the sandbox row: `company_name` is never
   reported, `last_refresh_at` is never reported, and every reconciliation
   "discovered" exactly 500 records, which looks like a page limit in the Local
   worker. All three live in OptiLens Local, not this repo.

Done when: `POST /qbo/transaction` without a session returns 403 on the production
host, unknown paths return 404, a connect from the Integrations page produces a
`production` row with status `connected`, and a reconciliation completes. To prove
token refresh, run a sandbox reconciliation more than an hour after connecting.

### 2. Where customer orders are sent

Found: `gatekeeper_settings` has one row: environment `staging`, enabled, status
`connected`, last connected 2026-10-06, status polling off.
`order_dispatch_settings.auto_transmit` is on. 21 Rx submissions and 4 stock
submissions are recorded as sent through `gatekeeper`. `STATUS.md` says the
production PIN reconnection is still pending.

Do: confirm with the **owner** which lab endpoint those 25 submissions reached and
whether the lab received them. Then either reconnect Gatekeeper with a production
PIN and enable status polling, or switch the route to Innovations until that is
done. Do not transmit a test order without the owner's say-so.

Done when: the settings row shows the production environment (or the route is
Innovations by decision) and one real order is confirmed received by the lab.

### 3. Payments

Found:
- No end-to-end card payment has been taken through the Scotia test gateway
  (`STATUS.md`).
- `website_features.card_payments_bypass_public` is on. Its own description says it
  lets any signed-in customer pay statements by card without the per-customer
  approval flag, and the migration that added it calls it a test bypass.
- 17 `scotia_ecom` orders have been `pending` since 2026-08-12 and 25 `on_account`
  orders are `pending`. Nothing moves them on or cleans them up.
- 9 stock submissions have been `staged` since 2026-09-09 and one is `failed`.
- Self-serve walk-in payment is switched on in settings, but
  `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` were unset at last note, so
  the page reports itself disabled.

Do: **owner** decides whether the public bypass stays on at launch. Run one card
payment through the Scotia test environment for each path (store checkout,
statement payment, walk-in link) and confirm the order or payment reaches its final
status. Decide what `pending` means for on-account orders and add the missing
transition or a clean-up for abandoned card checkouts. Set the Turnstile keys or
turn self-serve off in settings.

### 4. Red CI on `main`

Fixed on branch `launch-prep`, not yet merged: the release ledger is synced, and a
second failure hidden behind it is corrected. The QuickBooks gateway hosts had been
added to the `connect-src` list in `vercel.json` only, so the header sync check
failed and the next sync would have removed them and broken the Connect button.
They are now in `security/http-header-policy.json`. `npm run qa:pr-checks` passes
locally. Merge the branch and confirm "PR Validation" goes green on `main`.

### 5. The most frequent production error

Found: `runtime_error_events`, last 14 days: "Failed to load resource: link" about
170 times across `/admin`, `/atlas/wiki`, `/admin/dashboard`, `/profile` and other
signed-in routes. `GlobalErrorLogger.tsx` logs this when a `<link>` element fails
to load, so a stylesheet, font or preload is failing for signed-in users.

Do: reproduce on the live site with the network panel open, find which link fails
(a font stylesheet blocked by the CSP and a preload for a chunk that no longer
exists after a deploy are the first two to rule out), fix it, and confirm the
count stops growing. Make the logger record the link's `href` so the next one is
obvious.

Also: errors from local development are written to the same production table
(a `useRef` crash on `/` logged today came from a dev session). Skip logging when
`import.meta.env.DEV`.

### 6. Atlas subsections: apply the database change

Built on branch `launch-prep` (2026-11-13): sections nest, a section drags onto
another section, and the section menu has "Add subsection" and "Move to top level".
Tests pass and the tree was exercised in a browser on a test page.

The feature needs `supabase/migrations/20261113120000_wiki_headings_parent.sql`
(one nullable column, a check constraint and an index). It is **not applied**.
Apply it to the live database before the frontend ships; until then adding a
subsection or dragging a section shows an error and changes nothing. Then check it
in a signed-in session: add a subsection, drag one section into another, drag it
back out, delete a parent section.

### 7. Edge functions

`STATUS.md` lists many functions as changed in source but not deployed. A push
does not deploy them. Make one list of functions whose source differs from what is
live, get the **owner** to trigger the deploy, then run `npm run qa:edge-smoke`.
On this workstation that command fails on the certificate revocation check; run it
from CI or the Lovable sandbox.

## Phase 2: walk the customer journey

Use a test customer account the owner provides. At phone width (375px) and desktop,
go through each step and note anything that blocks, confuses or looks unfinished:

1. Homepage → apply for a trade account → the owner's alert email → approval.
2. First sign-in → portal → assigned pricelist.
3. Rx order: start, save a draft, quote, submit (stop before transmission unless
   the owner approves a real send).
4. Stock and supplies order.
5. Store: browse, cart, checkout on account and by card (test gateway).
6. Statements: open an invoice, pay by card (test gateway).
7. Help desk: raise a ticket with an attachment, reply, receive the email.
8. Signed out: `/store` and product pages must not show sell prices.

`docs/release-checklist.md` and `docs/homepage-prelaunch-qa.md` have older lists;
fold in anything still relevant.

Known gap to settle here: `customers.country_code` is empty for every account, so
anything keyed on country cannot work yet.

## Phase 3: homepage and brand

Done on `launch-prep` (2026-11-13), without changing layout or content: removed
the decorative rings and glow, the spaced-out capital-letter labels, the glass
panels, the two-colour headline, the "01 02 03" numbering and the ornament lines;
tightened card corners; rewrote four sub-headings that read as filler. Checked at
desktop and phone width.

Still to do:
1. **owner** Real photographs. The hero picture is a generated image of people who
   do not work here, captioned "Made in Barbados". This is the strongest remaining
   sign. Replace it with a real photo of the lab, the team or the product. The repo
   has none.
2. **owner** Fill the empty facts in `homeContent.ts` `PLACEHOLDERS`: founding year,
   standard turnaround, account approval time, territories served, customer quotes,
   supplier logos. The testimonial and logo sections stay hidden until then.
3. Give the other public pages the same treatment. `Features.tsx`, `Products.tsx`,
   `About.tsx`, `ProfessionalsPage.tsx` and `Hero.tsx` use the same patterns.
4. Decide whether to keep the fade-in-on-scroll effect; it is used site-wide.
5. Light theme still has about 35 text-contrast failures on the Rx form.

## Phase 4: smaller fixes

- Unknown URLs return 200 with the app shell. Return a real 404 for them.
- `classicvisions.net` redirects to `www` with a temporary 307. Make it permanent.
- `admin.classicvisions.net` returns 403. Fix the DNS record or remove it.
- The sandbox gateway host also serves the whole website. The runbook says gateway
  hosts must expose the `/qbo/*` routes only.
- `STATUS.md` is out of date: many entries say "not applied" for database changes
  that are live (see the table above). Rewrite it to current state and move history
  to `docs/release-notes.md`.
- Six extra git worktrees and about two dozen merged local branches are left over.
  Remove the ones that are merged.
- `SmartHome.tsx` is not imported anywhere.
- Creating a top-level Atlas section whose name matches a deleted one silently does
  nothing and reports success.

## Not needed for launch

FreePBX calling, HR and payroll, fixed assets, the pricing mirror, Rx photo capture,
the catalogue generator, CRM cadence automation and the Copilot rollout tools are
staff-side or unfinished by design. Leave them out of the launch scope.

## Rules for whoever works this list

- A migration file in git does not run on the live database. It is applied
  separately, and only after the owner agrees to that specific change.
- A push does not deploy edge functions or guarantee the live site has rebuilt.
  Check the deployed bundle or function, not the commit.
- Do not message the Lovable agent unless the owner asks for a deploy in that turn.
- Never send a real order, email or payment as a test without the owner's say-so.
- Keep money figures, staff names and customer details out of Markdown files.
- Typecheck with `npx tsc -p tsconfig.app.json --noEmit`; the root `tsc` checks
  nothing.
- After editing copy on a public page run `npm run search:index`.
