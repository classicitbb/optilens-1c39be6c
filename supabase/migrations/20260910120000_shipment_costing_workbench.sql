-- Desktop costing workbench: reviewed source documents, explicit evidence links,
-- persisted settlement/FXF values and immutable binder metadata. Historical rows
-- deliberately retain null FXF fields until an operator reviews a new revision.

alter table public.shipments
  add column if not exists settlement_method text,
  add column if not exists fxf_applicability text check (fxf_applicability in ('applicable', 'exempt', 'manual_override')),
  add column if not exists fxf_rate numeric,
  add column if not exists fxf_basis_bbd numeric,
  add column if not exists fxf_expected_bbd numeric,
  add column if not exists fxf_actual_bbd numeric,
  add column if not exists fxf_variance_bbd numeric,
  add column if not exists fxf_override_reason text,
  add column if not exists fxf_override_by uuid references auth.users(id),
  add column if not exists fxf_override_at timestamptz,
  add column if not exists binder_storage_path text,
  add column if not exists binder_created_at timestamptz;

create table if not exists public.shipment_documents (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  source_kind text not null default 'upload' check (source_kind in ('upload', 'email', 'web')),
  original_file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg')),
  byte_size bigint not null check (byte_size > 0),
  storage_path text not null unique,
  uploaded_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.shipment_evidence_links (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  document_id uuid not null references public.shipment_documents(id) on delete cascade,
  target_kind text not null check (target_kind in ('header', 'charge', 'line')),
  target_key text not null,
  target_record_id uuid,
  page_number integer not null default 1 check (page_number > 0),
  bounds jsonb not null default '{"x":0,"y":0,"width":0,"height":0}'::jsonb,
  source_text text,
  approved_by_user_id uuid not null references auth.users(id),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists shipment_documents_shipment_id_idx on public.shipment_documents(shipment_id);
create index if not exists shipment_evidence_links_shipment_id_idx on public.shipment_evidence_links(shipment_id);

alter table public.shipment_documents enable row level security;
alter table public.shipment_evidence_links enable row level security;

grant select, insert, update, delete on public.shipment_documents to authenticated;
grant select, insert, update, delete on public.shipment_evidence_links to authenticated;

create policy "Staff can read shipment costing documents" on public.shipment_documents
  for select to authenticated using (public.has_staff_role(auth.uid()));
create policy "Editors can manage shipment costing documents" on public.shipment_documents
  for all to authenticated using (public.has_edit_role(auth.uid())) with check (public.has_edit_role(auth.uid()));
create policy "Staff can read shipment evidence links" on public.shipment_evidence_links
  for select to authenticated using (public.has_staff_role(auth.uid()));
create policy "Editors can manage shipment evidence links" on public.shipment_evidence_links
  for all to authenticated using (public.has_edit_role(auth.uid())) with check (public.has_edit_role(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shipment-costing-documents', 'shipment-costing-documents', false, 26214400, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff can view shipment costing objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'shipment-costing-documents' and public.has_staff_role(auth.uid())
  );
create policy "Editors can upload shipment costing objects" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'shipment-costing-documents'
    and public.has_edit_role(auth.uid())
    and (storage.foldername(name))[2] = auth.uid()::text
  );

