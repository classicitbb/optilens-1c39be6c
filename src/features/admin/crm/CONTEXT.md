# CRM context

CRM follow-up (2026-10-07, local source): contact Places lookups now use Places API (New) searchText and details endpoints, header credentials and explicit field masks. Business-name similarity is scored separately from location search context; ambiguity thresholds stay intact. Manual research combines Google Places listing details with OpenAI cited web sources when configured, records one attempt per provider, and shows unavailable/failed providers alongside successful results. Google errors count as failed enrichment rather than Nothing new found, including responses from older deployments. Scheduled enrichment remains Google-only. Deployment, Places API (New) enablement/key restrictions and billable live lookup verification remain pending; no Google configuration or credential changes were made.

Contacts use `src/pages/admin/erp/ContactsPage.tsx` and `src/hooks/useContacts.ts`.
Person/company/customer links are distinct: preserve `parent_id`, `linked_customer_id` and `innovations_parent_customer_id` semantics and the existing validation.

The contact editor's `CompanyCombobox` is editable and keyboard-selectable. Save stays open; Save & Close completes the same pipeline then closes. Email lists remain normalized text in `contacts.email`; downstream recipient semantics must be audited before release.

`crm-enrich-contacts` provides the existing Google Places blank-fill/approval policy, plus manual `mode: research` source suggestions using server-only `OPENAI_API_KEY`. Research reads saved contact context, shares the attempt cap, never auto-writes contact fields, and suggestions enter only the current editor draft. Provider calls are billable; use mocked tests by default.

Innovations inbound address mapping already exists. Salesperson receiver compatibility is source-only; producer mapping and bidirectional writeback are pending. Do not infer SQL columns or let website saves imply an Innovations write.

See `docs/crm-contact-editor-follow-up.md` for evidence, remaining contract work and approval boundaries.
