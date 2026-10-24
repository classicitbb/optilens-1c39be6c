# Lead Finder (admin leads)

Search: `lead-intelligence` edge function (plan → providers → AI qualify → score → **CRM match** → limit).
UI: `src/pages/admin/leads/LeadFinderPage.tsx`, `components/LeadCrmPanel.tsx`, `components/LinkContactDialog.tsx`.

## CRM matching (`supabase/functions/lead-intelligence/crmMatching.ts`, pure, unit tested)
- Identity key = `name:<normalised name>|<city or country>`; stable across searches.
- Automatic: operator-confirmed link/alias, or exact normalised name + same city matching exactly one record, or website host with supporting name/city evidence on an unshared, non-social host.
- Suggestions only: fuzzy names, shared domains, name without city. Never auto-linked.
- Customer = `contacts.is_customer`, `linked_customer_id`, parent company that is a customer, a `customers.contact_id` owner, a customer account with no contact, or a manual mark.
- Exclusion happens **before** the result limit. `showCurrentCustomers` input turns it off. CRM reads are paged (PostgREST truncates at 1000).
- CRM lookup failure → `crm.status = "unavailable"`, nothing excluded, saving disabled client-side.

## Persistence (migration `20261007150000_lead_finder_crm_matching.sql`)
- `lead_discovery_identities`, `lead_discovery_links` (one live row per identity; corrections set `revoked_at`), `lead_discovery_reviews`.
- Browser has SELECT only (`has_any_role`); writes go through `lead_finder_confirm_link`, `lead_finder_mark_customer`, `lead_finder_clear_link`, `lead_finder_save_lead` (all require `has_edit_role`).
- Searching writes nothing. Manual link/mark/save persists. A manual customer mark does not touch ERP customers or create a contact.
- Save: advisory lock per identity; target = chosen contact → confirmed link → earlier review → new contact. New contact name collision raises `name_conflict` (contacts.name is unique) instead of reusing a record. Existing contacts only get blank fields filled; status is never changed. Opportunity only for non-customers. Follow-up is a normal `activities` row (`planned`, `task_channel` default `todo`); no outreach starts.
- Unfollow-up after a task exists does not cancel it (deliberate; edit the task in the CRM).

## Not verified
Migration/RPCs have not run against a database. Verify: save twice, two concurrent saves, name-conflict rollback, link→customer→excluded on next search, clear link.
