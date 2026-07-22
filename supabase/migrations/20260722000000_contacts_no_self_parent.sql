-- Contacts must never be their own parent company.
-- "Insight Optical" had parent_id = id, which made every save of that contact
-- fail client-side validation with "A contact cannot be linked to itself."

update public.contacts set parent_id = null where parent_id = id;

alter table public.contacts
  drop constraint if exists contacts_parent_id_not_self;

alter table public.contacts
  add constraint contacts_parent_id_not_self check (parent_id is distinct from id);
