# CRM context

Contacts use `src/pages/admin/erp/ContactsPage.tsx` and `src/hooks/useContacts.ts`.
Person/company/customer links are distinct: preserve `parent_id`, `linked_customer_id` and `innovations_parent_customer_id` semantics and the existing validation.

The contact editor's `CompanyCombobox` is editable and keyboard-selectable. Save stays open; Save & Close completes the same pipeline then closes. Email lists remain normalized text in `contacts.email`; downstream recipient semantics must be audited before release.

`crm-enrich-contacts` provides the existing Google Places blank-fill/approval policy, plus manual `mode: research` source suggestions using server-only `FIRECRAWL_API_KEY`. Research reads saved contact context, shares the attempt cap, never auto-writes contact fields, and suggestions enter only the current editor draft. Provider calls are billable; use mocked tests by default.

Innovations inbound address mapping already exists. Salesperson receiver compatibility is source-only; producer mapping and bidirectional writeback are pending. Do not infer SQL columns or let website saves imply an Innovations write.

See `docs/crm-contact-editor-follow-up.md` for evidence, remaining contract work and approval boundaries.
