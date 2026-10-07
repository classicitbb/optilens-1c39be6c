# Contact editor follow-up — 2026-10-07

## Local implementation

- Parent Company is an editable combobox: typing filters names in the field, Enter selects the first match, arrows change the highlighted option, Escape/Tab leave without selecting. None clears the link; the existing cycle/account linking validation remains authoritative.
- Email addresses accepts commas, semicolons, colons and newlines. Save validates every address and normalizes/deduplicates the list in the existing `contacts.email` text field. The first address is primary when creating a customer record. This change does not alter portal login identity or promise delivery to every address; existing mail consumers need a separate recipient audit before deploying list storage.
- Save keeps the editor open. Save & Close closes only after the complete save pipeline succeeds. Duplicate saves are guarded across contact, tags and customer-link operations. The inserted contact ID survives a later failure, so a retry does not create a duplicate person/company.
- Salesperson options now come from recorded contact values rather than unrelated website user accounts. The sync receiver accepts the existing `salesperson` column, but the office producer does not yet supply it. No new salesperson schema/IDs were guessed.
- Find business details accurately labels the existing Google Places lookup. No-match, ambiguous and failed results are reported instead of claiming no details were missing.
- Research public web uses the existing `FIRECRAWL_API_KEY` on the server, through the existing administrator-only `crm-enrich-contacts` endpoint with `mode: research`. It searches the saved name, company, city and country code; retrieves up to eight public results and page Markdown through Firecrawl v2; returns links, snippets, candidate emails and retrieval time. Suggestions change only the editor draft and require Save. The research path shares the daily attempt cap and records a `firecrawl_search` attempt before the provider request. It never writes contact fields automatically. Scheduled calls cannot use this mode. No billable lookup was run.

Provider reference: [Firecrawl Search](https://docs.firecrawl.dev/api-reference/endpoint/search). Search is bounded and cannot cover every internet page or establish a person's identity by name alone.

## Innovations findings and remaining implementation

The office `lib/innovations-sync.js` contact query already joins the customer's preferred address and sends street, street2, city, state, ZIP, country and country code. The receiver allows all of those. Customer sync sends a flattened address. Local source alone does not establish why a particular hosted contact is blank; inspect its immutable Innovations contact/customer links, the latest mapped office dry run and the preservation trigger before repairing data.

The office contact SELECT/map does not include salesperson. Confirm actual source metadata, salesperson table/key/name semantics and a known assigned/unassigned example before adding the producer field. Deploy receiver compatibility first; then review an office dry run before enabling the producer. Receiver auth/gateway configuration is unchanged.

Website Save currently writes the website database only. Bidirectional address/salesperson sync is not implemented. Hosted code must not connect directly to SQL Server. Implement it in the office integration boundary with these requirements:

1. Confirm whether each field belongs to the person (`Contacts`), company (`Customers`) or preferred address row, using actual metadata. Editing a person's inherited company address must explicitly identify the shared target and affected contacts.
2. Persist a durable request containing immutable IDs, allowlisted changed fields, before/after values, source revision, actor and idempotency key. Keep billing, balances, portal access and account numbers outside this contract.
3. An office worker validates the target and expected revision before a parameterized transaction. Reject stale edits instead of silently overwriting an ERP edit. Do not create or reassign address/customer rows implicitly.
4. Record applied/rejected/failed status and audit evidence, then reconcile inbound sync without overwriting a pending website edit. Display Website saved separately from Innovations applied/failed.
5. Start with fixture and dry-run tests. Production SQL writes, scheduling, migration and deployment need approval under AGENTS.md. No office repository changes or database writes were performed here.

## Validation

TypeScript, lint (warnings only), production build and the initial full suite (1356 tests) pass. Eight focused tests cover parsing, provider response handling and company keyboard selection. Final build and PR checks pass after the retained-link correction. Real typing and Enter selection passed in an isolated Edge fixture and subsequently in the authenticated contact dialog on port 8081. The real dialog shows the email-list field, research action and both save buttons; no contact was saved. Port 8080 serves a different checkout. Provider tests use mocked fetch; they do not prove deployed configuration or real person matching. See HANDOFF.md for remaining integration work.
