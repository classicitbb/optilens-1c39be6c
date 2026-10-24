-- Google Document AI settings and evidence-backed shipment-document learning.
-- OCR output is always a draft; this migration grants no automatic shipment,
-- charge, line, review, or lock write capability to the provider.

create table if not exists public.document_ai_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default' unique,
  project_id text,
  location text not null default 'us' check (location in ('us', 'eu')),
  processor_id text,
  enabled boolean not null default false,
  has_service_account boolean not null default false,
  status text not null default 'not_configured' check (status in ('not_configured', 'unverified', 'connected', 'error')),
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_ai_secrets (
  settings_id uuid primary key references public.document_ai_settings(id) on delete cascade,
  encrypted_service_account bytea not null,
  updated_at timestamptz not null default now()
);

alter table public.document_ai_settings enable row level security;
alter table public.document_ai_secrets enable row level security;

create policy "Admins can read document AI settings" on public.document_ai_settings
  for select to authenticated using (public.has_role((select auth.uid()), 'admin'));
create policy "No direct writes to document AI settings" on public.document_ai_settings
  for all to authenticated using (false) with check (false);
create policy "No direct access to document AI secrets" on public.document_ai_secrets
  for all using (false) with check (false);

create trigger update_document_ai_settings_updated_at
  before update on public.document_ai_settings
  for each row execute function public.update_updated_at_column();

create or replace function public.upsert_document_ai_settings(
  p_project_id text,
  p_location text default 'us',
  p_processor_id text default null,
  p_enabled boolean default false,
  p_service_account_json text default null,
  p_actor_user_id uuid default auth.uid()
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_settings_id uuid;
  v_has_secret boolean;
begin
  if not public.has_role(coalesce(p_actor_user_id, auth.uid()), 'admin') then
    raise exception 'Only admins can update Document AI settings.';
  end if;
  if nullif(btrim(p_project_id), '') is null then raise exception 'Google Cloud project ID is required.'; end if;
  if p_location not in ('us', 'eu') then raise exception 'Document AI location must be us or eu.'; end if;
  insert into public.document_ai_settings (tenant_key, project_id, location, processor_id, enabled, status)
  values ('default', btrim(p_project_id), p_location, nullif(btrim(p_processor_id), ''), p_enabled, 'not_configured')
  on conflict (tenant_key) do update set
    project_id = excluded.project_id, location = excluded.location,
    processor_id = excluded.processor_id, enabled = excluded.enabled, updated_at = now()
  returning id into v_settings_id;
  if p_service_account_json is not null and btrim(p_service_account_json) <> '' then
    perform p_service_account_json::jsonb;
    insert into public.document_ai_secrets (settings_id, encrypted_service_account, updated_at)
    values (v_settings_id, extensions.pgp_sym_encrypt(p_service_account_json, public.payment_secret_encryption_key()), now())
    on conflict (settings_id) do update set encrypted_service_account = excluded.encrypted_service_account, updated_at = now();
  end if;
  select exists(select 1 from public.document_ai_secrets where settings_id = v_settings_id) into v_has_secret;
  update public.document_ai_settings set has_service_account = v_has_secret,
    status = case when v_has_secret and p_enabled and nullif(btrim(p_processor_id), '') is not null then 'unverified' else 'not_configured' end,
    updated_at = now() where id = v_settings_id;
  return v_settings_id;
end; $$;

create or replace function public.get_document_ai_credentials()
returns table(project_id text, location text, processor_id text, enabled boolean, service_account_json text)
language sql security definer set search_path = public, extensions as $$
  select s.project_id, s.location, s.processor_id, s.enabled,
    extensions.pgp_sym_decrypt(sec.encrypted_service_account, public.payment_secret_encryption_key())::text
  from public.document_ai_settings s left join public.document_ai_secrets sec on sec.settings_id = s.id
  where s.tenant_key = 'default' limit 1;
$$;

create or replace function public.record_document_ai_test(p_success boolean, p_error_message text default null, p_actor_user_id uuid default auth.uid())
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(coalesce(p_actor_user_id, auth.uid()), 'admin') then raise exception 'Only admins can record Document AI tests.'; end if;
  update public.document_ai_settings set status = case when p_success then 'connected' else 'error' end,
    last_tested_at = now(), last_error = nullif(btrim(coalesce(p_error_message, '')), ''), updated_at = now()
  where tenant_key = 'default';
end; $$;

revoke all on function public.get_document_ai_credentials() from public;
grant execute on function public.get_document_ai_credentials() to service_role;
grant execute on function public.upsert_document_ai_settings(text, text, text, boolean, text, uuid) to authenticated;
grant execute on function public.record_document_ai_test(boolean, text, uuid) to authenticated;

create table if not exists public.shipment_document_extractions (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  document_id uuid not null references public.shipment_documents(id) on delete cascade,
  provider text not null default 'google-document-ai',
  processor_id text not null,
  document_kind text not null default 'unknown' check (document_kind in ('unknown', 'supplier_invoice', 'freight_invoice', 'airwaybill', 'customs')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'failed')),
  extracted_text text,
  extracted_fields jsonb not null default '{}'::jsonb,
  template_id uuid,
  created_by_user_id uuid references auth.users(id),
  approved_by_user_id uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_document_templates (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id),
  document_kind text not null check (document_kind in ('supplier_invoice', 'freight_invoice', 'airwaybill', 'customs')),
  fingerprint jsonb not null default '{}'::jsonb,
  approved_field_mapping jsonb not null default '{}'::jsonb,
  usage_count integer not null default 0 check (usage_count >= 0),
  last_used_at timestamptz,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipment_document_extractions enable row level security;
alter table public.shipment_document_templates enable row level security;
create policy "Staff can read shipment document extractions" on public.shipment_document_extractions for select to authenticated using (public.has_staff_role(auth.uid()));
create policy "Editors can manage shipment document extractions" on public.shipment_document_extractions for all to authenticated using (public.has_edit_role(auth.uid())) with check (public.has_edit_role(auth.uid()));
create policy "Staff can read shipment document templates" on public.shipment_document_templates for select to authenticated using (public.has_staff_role(auth.uid()));
create policy "Editors can manage shipment document templates" on public.shipment_document_templates for all to authenticated using (public.has_edit_role(auth.uid())) with check (public.has_edit_role(auth.uid()));
create trigger update_shipment_document_extractions_updated_at before update on public.shipment_document_extractions for each row execute function public.update_updated_at_column();
create trigger update_shipment_document_templates_updated_at before update on public.shipment_document_templates for each row execute function public.update_updated_at_column();
