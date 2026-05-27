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

## Invariants

- The assistant must route knowledge queries through the shared knowledge retrieval
  path — do not add a parallel retrieval mechanism.
- Keep the engine (`companionAssistantEngine.ts`) decoupled from React — 
  no direct React imports in the engine file.
