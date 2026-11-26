# Public website states

Published on 2026-11-26 as release 0.39.0, commit `8275278e`, to [Classic Visions](https://www.classicvisions.net/). Live search matches, no-result alternatives/reset, retailer no-results/reset and the unsent contact form were verified. Thirty focused tests, TypeScript, lint and build pass; broad test validation remains incomplete and the existing Copilot-facts drift remains outside this change. No inquiry, order or payment was submitted.

The first milestone covers public page search, the retailer directory and the existing Iris contact-request form. The local gallery previews all ten states; permission and session-expiry examples do not implement account guards, sign-in changes or draft recovery. Order/payment submission behavior is outside this milestone.

The existing trade-price eligibility rule also gets an explanatory message and a way back to Iris; its eligibility decision is unchanged.

## Shared presentation

- `src/components/public-states/PublicState.tsx`: section-level empty, error, offline, search, permission and success messages. Announcements are opt-in; actions stay outside the live region.
- `LoadingState.tsx`: stable placeholders, reduced-motion-aware animation and indeterminate native progress. `useDelayedBusy` adds longer-wait guidance after six seconds. Never invent percentage completion or stages.
- `ConnectionNotice.tsx` and `useOnlineStatus`: browser online/offline events are advisory, not proof that a service is reachable. Keep request-level error handling.
- `RequestField.tsx`: native required/email constraints, whitespace rejection and linked inline errors after blur or an invalid submission attempt. Personal-data fields retain autocomplete purposes.

## Feature behavior

The existing ContactForm component was not mounted by the homepage. It now appears before the audience-switch footer, giving the existing `/#contact` links a visible destination with an Iris request action and telephone fallback.

Public search reuses the generated public page index and existing `searchPublicPages` matcher. It loads only after two query characters, caps results at six, distinguishes loading from no matches, retries failed loads and retries on reconnect. Loaded matches remain searchable offline. Iris uses its existing context and retrieval path. A failed shared index promise is cleared for retry.

The retailer directory remains a local-data search. Offline guidance leaves listings and telephone links available and disables assistant help actions. Empty filters distinguish an unlisted island from an unsuccessful text search. Reset and telephone support remain available. The Barbados page also explains offline limitations and preserves the header/footer with a directory link if its market data is absent.

Contact keeps its existing Iris entry point and exposes the existing company telephone number. Public inquiry fields validate where the mistake occurs; sending stays explicit. The existing mutation, attachment handling and request-success decision remain authoritative. Long sends show indeterminate progress and advise keeping the form open. Failed confirmation retains current entries and advises checking with the team before resending after a lost connection. No automatic retry or offline queue is added. Entries remain in the open form only; no new persistence or recovery guarantee is introduced. Trade signup, quote and portal validation and authorization behavior are outside this change.

## Local gallery and verification

Run `npm run dev -- --host 127.0.0.1 --port 5185 --strictPort`, then open `/public-states.html`. This separate development HTML entry is not registered in application routing or included in the production build entry. It uses the website theme, supports light/dark review, and offers local page-index search and retailer filtering. Assistant buttons and example sends are simulated and cannot create business records.

Verify all ten examples, then actual public search, retailer filtering and an unsent contact form in the app. Simulate delayed/rejected index loading and offline/reconnect in tests. Verify native validation with keyboard input in a real browser. Production publication requires separate approval.

```sh
npx vitest run --coverage=false src/tests/unit/publicWebsiteStates.test.tsx src/tests/unit/publicRequestFeedback.test.tsx
```
