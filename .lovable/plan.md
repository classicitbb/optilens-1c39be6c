## Change Assistant Source Precedence Order

The user wants the assistant's context/source precedence to follow this order:

1. **Website** — published site content (pages, products, articles) +`internal_policy` — company policy docs (authoritative
2. **Knowledge base** — internal wiki/knowledge articles
3. **Internet / Web** — external/controlled sources
4. **Helpdesk** — ticket offer, phone, or email escalation 

### Current State

The `SOURCE_PRECEDENCE` in `src/features/assistant/knowledgeAssistantArchitecture.ts` currently has 3 tiers:

1. )`internal_policy` — company policy docs (authoritative
2. `internal_site` — published site/wiki knowledge
3. `external_controlled` — external retrieval as fallback

The companion assistant edge function system prompt says "Prefer grounded website context first" but doesn't explicitly encode a 4-tier hierarchy that includes helpdesk escalation as a final tier.

### Plan

**1. Update source precedence types and data** (`src/features/assistant/knowledgeAssistantArchitecture.ts`)

- Change `AssistantSourceTier` to: `"website_content" | "knowledge_base" | "external_web" | "helpdesk_escalation"`
- Rewrite `SOURCE_PRECEDENCE` array to 4 tiers:
  1. Website content — live site pages, product catalog, retailer data
  2. Knowledge base — internal wiki articles, policy docs, approved guides
  3. Internet / Web — controlled external sources, industry references
  4. Helpdesk — offer ticket creation, phone, or email when above sources cannot resolve

**2. Update retrieval service types** (`src/features/admin/leads/assistant/types.ts`)

- Update `SourceTier` type to match: `"website_content" | "knowledge_base" | "external_web" | "helpdesk_escalation"`

**3. Update retrieval logic** (`src/features/admin/leads/assistant/retrieval/retrievalService.ts`)

- Adjust the mock knowledge base entries to use the new tier names (`website_content`, `knowledge_base`, `external_web`)
- Add a helpdesk escalation fallback when no other sources satisfy

**4. Update source attribution** (`src/features/admin/leads/assistant/source-attribution/sourceAttribution.ts`)

- Update the `precedence` array to reflect the new 4-tier order

**5. Update edge function system prompt** (`supabase/functions/companion-assistant/index.ts`)

- Revise the system prompt to explicitly encode the 4-tier priority: website first → knowledge base → web/internet → helpdesk/phone/email escalation

**6. Update admin UI module map** (`src/features/admin/leads/assistant/ui/assistantModuleMap.ts`)

- Update any references to the old tier names so the admin page renders correctly

### Files Changed


| File                                                                         | Change                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/features/assistant/knowledgeAssistantArchitecture.ts`                   | New tier type, 4-tier precedence                   |
| `src/features/admin/leads/assistant/types.ts`                                | Update `SourceTier`                                |
| `src/features/admin/leads/assistant/retrieval/retrievalService.ts`           | Update mock data tier names, add helpdesk fallback |
| `src/features/admin/leads/assistant/source-attribution/sourceAttribution.ts` | Update precedence array                            |
| `supabase/functions/companion-assistant/index.ts`                            | Update system prompt with 4-tier context           |
| `src/features/admin/leads/assistant/ui/assistantModuleMap.ts`                | Sync tier labels                                   |
