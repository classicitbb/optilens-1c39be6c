# AI Assistant Feature — Context

## What this is

The companion AI assistant engine that powers in-app knowledge assistance.
This is separate from the admin catalog/pricing work — it is a customer-facing
and internal knowledge retrieval layer.

## Key files

| File | Role |
|---|---|
| `CompanionAssistantContext.tsx` | React context provider for the assistant |
| `CompanionAssistantContext.shared.ts` | Shared types and constants |
| `companionAssistantEngine.ts` | Core engine: query handling, response generation |
| `assistantGeneration.ts` | Generation utilities |
| `knowledgeAssistantArchitecture.ts` | Architecture definitions for the knowledge assistant |

## Architecture reference

Full architecture doc: `docs/ai-knowledge-assistant-architecture.md`

Shared Iris identity: `docs/ai-assistant-identity.md` and
`supabase/functions/_shared/aiIdentity.ts`.

## Invariants

- The assistant must route knowledge queries through the shared knowledge retrieval
  path — do not add a parallel retrieval mechanism.
- Keep the engine (`companionAssistantEngine.ts`) decoupled from React — 
  no direct React imports in the engine file.

## Public request attachments (2026-10-09, local source)

Contact us and Get support accept browse/paste/drop photos, documents and audio (5 files, 10 MB each). Iris transfers unsent composer files into the request and includes sent chat files on submission. `submitPublicInquiry` retains JSON for text-only clients and sends multipart `submission` + `files` otherwise. `contact-inquiry` bounds actual request bytes, validates files independently, then stores them in private ticket-scoped storage after spam/rate checks and ticket creation. Nullable uploader metadata represents a public inquiry; existing participant INSERT and private read policies stay intact. Migration `20261009141913_public_inquiry_attachments.sql` must precede function/frontend release. Partial upload failure returns `attachmentError` while preserving request success. No deployment or live write performed.

Constrained Iris request height: direct form sections must retain natural height and scroll; allowing flex shrink makes attachment rows overlap request fields. Live browser evidence triggered the scoped 2026-10-09 repair.

## Iris visitor conversations — 2026-10-09 (production release)

Public starter prompts now give contextual frame/coating/policy guidance and a relevant follow-up instead of account counts or weak product matches. Account lookup requires a record-specific intent; sign-in alone does not identify a public visitor as a dispenser. Generated answers are included in subsequent conversation context. The lens guide retains audience and supplies use-specific education, prescription/measurement limits and retailer links without promising an automated prescription match. Search the site uses the existing grounded companion-assistant path; legacy web action types remain compatible but no longer call the retrieval-free, 400-character companion-web-search endpoint. No new service, environment variable, schema or authorization change. User approved publication; main commit 631870c6 reached Vercel READY and the custom-domain production aliases. Live browser confirms contextual starters, guide, site-search scope and a generated frame conversation with a simplified follow-up. Generated replies can still add unrequested product suggestions and citation-number mismatches; the server endpoint was not changed.

## Portal support sends — 2026-10-09 (local source)

CustomerOrdersPanel life-buoy questions use the signed-in staff owner and the selected contact as partner_contact_id; notification now defaults on. Person/company audience rules remain unchanged. Ticket creation writes helpdesk_tickets directly, followed by a timeline event; helpdesk-email handles optional staff-to-contact notifications. A failed event or notification must not turn a persisted ticket into a failed submission or encourage duplicate creation. Notification errors and skipped recipients now warn visibly. Iris retains failed request drafts, exposes submissionError inline and guards concurrent form sends. Both forms use mobile input text and 44px send controls; the admin dialog bounds height with dynamic viewport units and scrolls.

Hosted read-only inspection confirms ticket/event grants and RLS allow existing staff and eligible self-owned portal creation. No schema, authorization, Edge Function or environment-variable change. The exact original production failure remains unconfirmed without a named approved send; frontend release and actual email delivery still require approval.
