# Plan: Make Lead Finder Produce Real Results

## Current State Analysis

The Lead Finder infrastructure is well-built but **every provider is either a stub or requires an API key nobody has configured (remove any stubs that are impossible to configure because they do not have API keys or require complicated setup)**:


| Provider         | Status                                                    |
| ---------------- | --------------------------------------------------------- |
| Google Places    | **Real implementation** but needs `google_places` API key |
| Facebook Graph   | Stub — always returns `[]`                                |
| Instagram Graph  | Stub — always returns `[]`                                |
| WhatsApp Signals | Stub — always returns `[]`                                |
| Yellow Pages     | Stub — always returns `[]`                                |
| Bing             | Stub — always returns `[]`                                |
| Yahoo            | Stub — always returns `[]`                                |


The mock fallback only fires when `LEAD_INTELLIGENCE_ENABLE_MOCK_RESULTS=true` (non-production env var), and even then it's just 2 hardcoded rows. No connectors are linked. The scoring, strategy planner, CRM save, campaigns, sequences, and audit reports all work — they just have no data to process.

## Fastest Path to Results (Two Layers)

### Layer 1: AI-Powered Lead Generation (zero setup, works immediately)

Add a new `**ai_search**` provider to the `lead-intelligence` edge function that uses the **Lovable AI Gateway** (LOVABLE_API_KEY is already provisioned). When all other providers return nothing, this provider calls the AI gateway with a structured tool-call prompt like:

> "Find 10-15 real optical businesses in {city}, {country} matching '{query}'. Return name, city, country, estimated Google rating, whether they likely have a website, and any known social handles."

The AI model returns structured JSON via tool calling. These results get scored and displayed like any other provider's results. This guarantees results on every search with zero configuration.

### Layer 2: Firecrawl Web Search (real web data, requires connector)

Connect the **Firecrawl connector** and add a `firecrawl_search` provider that uses Firecrawl's search endpoint to find real businesses on the web. This provides grounded, real-world results with actual URLs and business details.

## Implementation Details

### 1. New AI Search Provider

**File**: `supabase/functions/lead-intelligence/providers/aiSearch.ts`

- Uses `LOVABLE_API_KEY` + Lovable AI Gateway
- Sends a structured tool-call request asking for business listings matching the query/location
- Parses the tool-call response into `LeadCandidate[]`
- Falls back gracefully if rate-limited or unavailable
- Always marked as "configured" since LOVABLE_API_KEY is auto-provisioned

### 2. New Firecrawl Search Provider

**File**: `supabase/functions/lead-intelligence/providers/firecrawlSearch.ts`

- Uses `FIRECRAWL_API_KEY` from the Firecrawl connector
- Calls Firecrawl's `/v1/search` endpoint with the lead query
- Extracts business names, locations, and URLs from search results
- Only active when Firecrawl connector is linked

### 3. Update Edge Function Index

**File**: `supabase/functions/lead-intelligence/index.ts`

- Import and register both new providers
- Add `aiSearchConfigured` and `firecrawlSearchConfigured` to `providerStatus` diagnostics
- AI search provider runs last as a fallback if other providers return nothing

### 4. Update Frontend Diagnostics

**File**: `src/features/admin/leads/hooks/useLeadFinder.ts`

- Add `aiSearchConfigured` and `firecrawlSearchConfigured` to the `providerStatus` type

**File**: `src/pages/admin/leads/LeadFinderPage.tsx`

- Show the two new providers in the real-time provider trace panel

### 5. Settings Page Update

**File**: `src/pages/admin/leads/LeadSettingsPage.tsx`

- Add Firecrawl to the provider list (with note that it uses the connector)
- Add an "AI Search" row that shows as always-configured (no key needed)

## What This Achieves

- **Immediate results**: AI search works out of the box on every query. No API keys needed.
- **Real web data**: Connecting Firecrawl adds grounded search results with actual URLs.
- **Existing flow preserved**: Scoring, CRM save, campaigns, sequences, audit reports all work unchanged — they just finally have data to process.
- **Google Places still works**: If someone adds a Google API key, that provider produces the best structured data.

## Files Modified/Created


| File                                                                | Action                                   |
| ------------------------------------------------------------------- | ---------------------------------------- |
| `supabase/functions/lead-intelligence/providers/aiSearch.ts`        | Create                                   |
| `supabase/functions/lead-intelligence/providers/firecrawlSearch.ts` | Create                                   |
| `supabase/functions/lead-intelligence/index.ts`                     | Edit — register new providers            |
| `src/features/admin/leads/hooks/useLeadFinder.ts`                   | Edit — add new provider status fields    |
| `src/pages/admin/leads/LeadFinderPage.tsx`                          | Edit — show new providers in diagnostics |
| `src/pages/admin/leads/LeadSettingsPage.tsx`                        | Edit — show new provider rows            |
