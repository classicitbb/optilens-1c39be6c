# Role-Aware AI Knowledge Assistant Architecture

## Goals
- Compose an assistant from focused modules instead of a monolithic chatbot.
- Support role-aware experiences for `public`, `customer`, `staff`, future `admin`, and separate `moonshot`.
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
- Classifies user message into controlled intent taxonomy (`product_lookup`, `policy_lookup`, `how_to`, `account_support`, `unknown`).

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
- `auth_required`: user must authenticate to continue.
- `ticket_offer`: suggests support handoff when insufficient certainty.
- `escalate_unknown`: unknown intent or no safe answer, route to human review.

## Security and deployment notes
- Client only calls a server endpoint/function; no LLM/provider secret in browser code.
- Use service-role/secret handling only in server runtime (`supabase/functions/*` or private backend).
- Store provider allow-lists and fallback policies in server config.
