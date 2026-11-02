# CRM Approval-Gated Sending Plan

**Date:** 2026-11-01 · **Status:** Plan only. No migration written, applied or deployed.
**Builds on:** `docs/CRM_BUILD_PLAN.md` (Phase 3 left sending as human-in-the-loop via `mailto:` / `wa.me`).
**Why:** The only reason sending stayed manual was that nothing safe existed to automate it. This plan adds the safeguards first, then lets staff approve a batch and have the system send it.

This file is served publicly through `/repo-health`. It holds no secrets, credentials, real people or money figures.

## Goals

1. Never email an address that is likely to bounce (verification).
2. Send approved outreach by itself, paced like a person, inside hard limits (sending).
3. Stop a sequence the moment someone replies, bounces or opts out (replies).
4. Keep a human approval step by default; autopilot is a separate, explicit switch.

## What already exists

| Piece | Where | Reuse |
|---|---|---|
| Draft outbox with `draft / approved / sent / rejected / failed` | `outreach_outbox` | Extend, do not replace |
| Drafts with quality gate and persona | `crm-draft-outreach`, `_shared/crm/*` | Keep as the only draft source |
| Bounce, complaint and unsubscribe capture | `handle-email-events`, `suppressed_emails` | Reuse as the opt-out list |
| Managed transport with unsubscribe footer | `_shared/email/managed-send.ts` | See decision D1 |
| Contact email list parsing and matching | `contactEmailList.ts`, `contactEmailMatch.ts` | Reuse for reply matching |
| Scheduled edge functions with a shared secret | `crm-enrich-contacts` + pg_cron | Copy the pattern |
| Support inbound webhook | `helpdesk-inbound-email` | Separate path for outreach replies (D3) |

`suppressed_emails` is not created by any migration in this repo (the managed email setup owns it). Confirm its live columns and `reason` values before relying on it.

## Gaps

- No email verification; `contacts.email` is a free text list.
- No scheduling, pacing, daily cap, quiet hours or kill switch.
- No link between a sent message and an inbound reply.
- No store for outreach settings.

## Proposed migrations (apply in order, each reviewed before applying)

All follow the existing RLS style: `has_any_role` to read, `has_edit_role` to write; service role for functions. Each is additive and reversible.

**M1 `contact_email_checks`**: one row per (contact, address), because `contacts.email` holds a list.
`contact_id`, `email` (lowercased), `status` (`verified` | `catch_all` | `invalid` | `unknown`), `provider`, `checked_at`, `detail jsonb`; unique (`contact_id`, `email`). Only `verified` and `catch_all` are sendable; `catch_all` can be switched off in settings.

**M2 `outreach_outbox` send columns**: `to_email`, `send_at`, `claimed_at`, `provider_message_id`, `rfc_message_id`, `in_reply_to`, `gate_reasons jsonb`, `approved_by`, `attempts int`. Widen the status check to add `scheduled` and `sending`. Unique (`enrollment_id`, `step_order`) as the double-send guard (`step_order` is added too; nullable for ad-hoc drafts).

**M3 `outreach_settings`** (single row): `sending_paused` (default true), `require_approval` (default true), `daily_cap`, `send_window_start/end`, `timezone`, `bounce_rate_pause_threshold`, `allow_catch_all`, `allowed_countries text[]`, `link_domains text[]`, `physical_address`. Defaults are the safe ones; nothing sends until a person flips `sending_paused`.

**M4 `outreach_replies`**: `outbox_id`, `contact_id`, `from_email`, `received_at`, `rfc_message_id`, `in_reply_to`, `body`, `intent` (`interested` | `question` | `objection` | `not_interested` | `out_of_office` | `wrong_person` | `unsubscribe` | `bounce`), `handled_at`. Unique on `rfc_message_id`.

**M5 schedules**: two pg_cron jobs, `crm-outreach-send` every 5 minutes and `crm-outreach-replies` every 10, both authenticated with the scheduler secret as `crm-enrich-contacts` does. Created paused; enabled last.

## Proposed edge functions

- `crm-email-verify`: verifies one address through the chosen provider, writes M1. Runs on contact create and before a draft is approved. Provider calls are billable, so it is capped per day and has a dry-run flag.
- `crm-outreach-send`: claims due approved rows atomically, then re-checks everything at send time: not paused, inside the window, under the daily cap, address `verified`, not in `suppressed_emails`, the gate passes, the contact has not replied, the prospect's company has not replied. Sends, records the message ids, schedules the next step. Adds the unsubscribe line and physical address.
- `crm-outreach-replies`: reads replies, matches them to the outbox row by `In-Reply-To` then by sender address, classifies intent (same AI gateway), stops the sequence, moves the contact's stage, and drafts the answer into the approval outbox. Bounces and unsubscribes write to `suppressed_emails` and pause the cadence.
- Bounce kill switch: if the bounce rate over the last 50 sends passes the threshold, set `sending_paused`.

## UI

- Outbox: batch "Approve selected", per-row scheduled time, gate warnings (done), a visible Sending paused / running banner with the single kill switch.
- Contact card: email status chip (verified / catch-all / invalid).
- Settings: the M3 fields. Turning `require_approval` off needs typing a confirmation word and is logged.

## Decisions (2026-11-01)

| # | Decision |
|---|---|
| D1 | Cold outreach sends from a dedicated secondary domain and mailbox on a normal mail provider, never the main brand domain. The mailbox is warmed up for 2 to 4 weeks first (a warmup service exchanges real two-way mail with other inboxes to build reputation). Sender is a named person (`firstname@`), with Reply-To set to the same address. Never `noreply@`, `info@`, `sales@` or `support@`. **Decided 2026-11-01:** a secondary domain will be used (not the main brand domain); the domain itself is to be chosen and bought later. Sender will be `russell@` with `hello@` as an alternate or Reply-To, both on that secondary domain. Sending stays switched off (`sending_paused`) until the domain is set up and warmed. |
| D2 | Verifier: Reoon. It has a single GET endpoint (`/api/v1/verify` with `email`, `key`, `mode`), the simplest to integrate, and a free tier (its own page advertises 600 credits a month; one review says 100, so confirm at signup). "Unknown" results and errors are not charged. Key supplied as a secret by the owner. |
| D3 | Replies: poll the outreach mailbox from `crm-outreach-replies`, separate from the helpdesk webhook. |
| D4 | Rules for recipients: see "Recipient rules" below. |
| D5 | Daily cap: start at 6 and allow up to 8 a day from one mailbox (`daily_cap = 8`, first week capped at 6). |

## Recipient rules (researched 2026-11-01, not legal advice)

Findings come from secondary sources (law-firm guides, compliance sites, vendor blogs); several disagree on details. Have a local adviser check the primary texts before the first send.

- **Every message:** a clear sender identity, a postal address, and a working opt-out honoured promptly. Opt-outs go to `suppressed_emails` and are never re-contacted. These satisfy the US CAN-SPAM Act and match the UK rules.
- **United States:** CAN-SPAM requires an opt-out, accurate headers and a postal address. Sources disagree on whether business-to-business mail has any exemption, so treat it as covered.
- **United Kingdom:** PECR consent rules do not apply to corporate subscribers (limited companies and similar), but sole traders and some partnerships count as individuals and need consent. A named person's address is still personal data under UK GDPR, so a lawful basis, privacy information and a way to object are needed.
- **Barbados:** the Data Protection Act 2019 regulates direct marketing and gives people a right to object (sources cite a 21-day window to stop). Which provisions are in force, and whether it treats B2B contacts differently, were not confirmed.
- **Jamaica:** the Data Protection Act 2020 says personal data may not be processed for direct marketing without the person's consent, with a possible exception for existing customers. Treat named Jamaican contacts as consent-required.
- **Trinidad and Tobago:** the Act is only partly proclaimed and sources found no specific direct-marketing or electronic-marketing rule. Provisional.
- **Bahamas and other islands:** not verified.

What this changes in the build:
- `outreach_settings` gains `allowed_countries text[]` (default: Barbados only, plus any country the owner explicitly adds). The sender refuses a contact whose country is not on the list.
- Jamaican contacts, and any contact who is a sole trader or an individual rather than a company, stay manual (draft only) until consent is confirmed.
- Each message carries the postal address and a plain "reply STOP" line; a reply of STOP, "unsubscribe" or similar is classified as `unsubscribe` and suppressed.
- Opt-outs are honoured at send time, not only at approval time.

## Rollout order

1. M1 and `crm-email-verify`, shadow mode: verify and display, block nothing.
2. M2, M3, M4 and the send function with `sending_paused = true`; test against staff-owned addresses only.
3. Reply function in shadow mode: classify and log, do not act.
4. Enable the schedules; send a first approved batch of a few emails by hand-picked contacts.
5. Raise the cap on the warm-up schedule if bounces and complaints stay near zero.
6. Only then consider autopilot, and only if you ask for it.

## Test plan

- Unit: send-time gate (every refusal reason), reply matching, intent mapping, cap and window arithmetic, double-send guard.
- Integration: claim-and-send is idempotent under two concurrent runs; a reply stops the sequence for every contact at the same company.
- Manual: a signed-in walk-through of approve → scheduled → sent → reply → draft, using only staff addresses.
- `npm run qa:edge-smoke` after any deploy, per `AGENTS.md`.

## Not in scope

LinkedIn, SMS, and WhatsApp automation (WhatsApp stays one-tap `wa.me`). The sales-agent daemon itself; only its safeguards are ported.
