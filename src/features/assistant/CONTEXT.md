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
