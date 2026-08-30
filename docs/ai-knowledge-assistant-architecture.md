# Role-Aware AI Knowledge Assistant Architecture

## Shared identity

All assistant surfaces use the identity **Iris — Classic Visions AI Operations
Partner**. The shared identity and system-prompt foundation are defined in
[`ai-assistant-identity.md`](./ai-assistant-identity.md). Role, retrieval scope,
tools, authorization, and approval requirements stay workspace-specific; a
shared name must never become shared access.

## Goals
- Compose an assistant from focused modules instead of a monolithic chatbot.
- Support role-aware experiences for `public`, `customer`, `staff`, future `admin`, and separate `moonshot`.
- The website assistant uses the bounded audiences `visitor`, `patient`, `dispenser`, `customer`, and `staff`.
- Every answer carries a controlled intent, answer mode, confidence, citations, and available actions.
- Enforce source precedence on every request:
  1. approved internal knowledge
  2. site knowledge
  3. controlled external fallback (optional)
- Never allow external information to override company policy.
- Keep route groups and shell refactor direction intact (`/admin/*`, `/account/*`, public pages).
- Keep all model and external provider calls server-side.

## Module boundaries

### 1) Assistant UI shell (client)
- Renders chat/input/prompt UI and answer modes.
- Reads role + route-group context and sends it to the server orchestrator.
- Must not hold model keys, provider tokens, or retrieval secrets.

### 2) Assistant orchestration service (server)
- Entry point that composes all downstream modules.
- Sequence: intent → retrieval → policy → attribution → answer mode → analytics/gaps/ticket.

### 3) Intent classification (server)
- Classifies user message into controlled intent taxonomy (`product`, `retailer`, `support`, `account_support`, `ordering`, `complaint_remake`, `navigation`, `unknown`).

### 4) Retrieval service (server)
- Pulls from internal indexed knowledge first.
- Optional controlled external retrieval only when policy allows and internal confidence is insufficient.
- Emits whether external fallback was used.

### 5) Answer policy service (server)
- Converts retrieval + intent + role into allowed response mode.
- Blocks output when auth is required or confidence is too low.
- Prevents external-only responses from superseding company policy.

### 6) Source attribution (server)
- Returns citation records with source tier and URL.
- Captures precedence chain for auditability.

### 7) Ticket handoff (server)
- Builds role-aware ticket drafts for unresolved/blocked intents.
- Routes queues by role (`public-support`, `customer-success`, `internal-ops`, `moonshot`).

### 8) Gap logging (server)
- Logs unresolved intents and missing knowledge to backlog analytics.

### 9) Analytics (server)
- Emits mode frequency, fallback rates, citation coverage, escalation rates.

## Answer modes
- `direct_answer`: policy-safe direct response from internal/site knowledge.
- `guided_navigation`: directs user to approved route/docs path with summary.
- `clarification`: asks a focused question when audience or intent is ambiguous.
- `auth_required`: user must authenticate to continue.
- `support_handoff`: prepares a role-aware human-support request with confirmation before submission.
- `escalate_unknown`: unknown intent or no safe answer, route to human review.

## Persistence and feedback contract
- Conversations remain temporary until the visitor chooses `Save this chat`.
- Saved conversations are authenticated, row-owned records with explicit restore, rename, and delete controls.
- Response feedback is one vote per message, available to anonymous sessions and authenticated users, and is aggregated into the staff quality workspace.
- Negative feedback is a knowledge-gap signal; it does not grant staff access to private conversation content.


## Moonshot leadership coach isolation
- Treat Moonshot as a separate product/workspace with its own bounded context, navigation, permissions, analytics, and coach policy layer.
- Reuse shared assistant infrastructure patterns (intent, retrieval, policy, attribution, analytics modules) without sharing retrieval scope or data access policy with other assistant roles.
- Moonshot coach retrieval scope is explicitly limited to Moonshot sources: meetings, issues, quarterly rocks, scorecards, business plan, and strategic notes.
- Moonshot coach retrieval must block non-Moonshot domains (`customer`, `support`, `pricing`, `operations`) to prevent leadership coaching responses from mixing contexts.
- Moonshot coach analytics must publish to a Moonshot-only namespace and remain isolated from customer/support/ops funnels.
- Moonshot URLs and navigation hierarchy remain preserved under the existing Moonshot shell route structure.

## Security and deployment notes
- Client only calls a server endpoint/function; no LLM/provider secret in browser code.
- Use service-role/secret handling only in server runtime (`supabase/functions/*` or private backend).
- Store provider allow-lists and fallback policies in server config.
