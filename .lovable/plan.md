# Fix truncated lead names + collapse near-duplicate results

## Problem

Firecrawl search results currently have their business name built by splitting the
page title unconditionally at the first ` | ` or ` - `. Any real business name that
contains those separators ("Vision Care - Bridgetown", "Smith | Optical") is cut
short. Because saving a lead upserts `contacts` on `name`, truncated names also
corrupt dedup/upsert behaviour in the CRM.

Separately, several search hits for the same business (different pages of the same
site, or slight title variations) currently arrive as separate leads, producing
noisy result lists.

## What changes

### 1. Conservative title cleanup (`providers/firecrawlSearch.ts`)

Stop splitting blindly. Only remove a trailing separator segment when it is clearly
a site suffix, judged by:

- the segment matches the result's own domain/brand (e.g. title ends with "Yelp"
  and url host is yelp.com), or
- the segment is in a small known-directory/marketing list (Yelp, Facebook,
  Instagram, LinkedIn, TripAdvisor, Yellow Pages, Google Maps, Home, Contact Us,
  About Us, Official Site/Website), or
- the segment looks like boilerplate: no letters+digits business pattern and the
  leading part is still a plausible name (>= 3 chars).

Never strip more than one trailing segment, and never return an empty string —
fall back to the full title, then the URL. Restore the explanatory comment noting
the hazard so the behaviour is not re-broken.

### 2. Group similar results into one candidate (`candidates.ts`)

Extend `dedupeCandidates` so near-identical rows collapse instead of only exact
key matches:

- Normalise names further for matching: lowercase, strip punctuation, drop common
  suffix words (inc, ltd, llc, co, company, the) and collapse whitespace.
- Match key priority: registrable domain (already done) → normalised name + city.
- After keying, run a second pass that merges remaining entries whose normalised
  names are containment matches or differ only by such suffix words, when city or
  country agrees (or one side is null).
- Merging keeps the richest record as today (fill missing fields, join provider
  labels), and prefers the longer, more complete `name` as the winner so a
  truncated variant never wins over the full name.

### 3. Tests

Add unit tests alongside the existing candidate tests covering:

- titles with legitimate ` - `/` | ` in the business name are preserved,
- directory suffixes are stripped,
- near-duplicate names in the same city collapse to one candidate with the fuller
  name retained.

## Technical notes

- Files: `supabase/functions/lead-intelligence/providers/firecrawlSearch.ts`,
  `supabase/functions/lead-intelligence/candidates.ts`, plus the corresponding
  test file.
- No schema or CRM-save changes; `useSaveLeadToCrm` continues to upsert on `name`
  and simply benefits from cleaner input.
- Redeploy `lead-intelligence` after the change and run the edge smoke suite.
