-- Moonshot persistence foundation with strict RLS and backup history.

create table if not exists public.moonshot_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_name text not null,
  meeting_date date not null,
  status text not null check (status in ('Scheduled', 'Completed', 'Draft', 'In Progress')),
  notes text not null default '',
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  duration_minutes integer not null default 90,
  attendee_ids jsonb not null default '[]'::jsonb,
  check_in_prompt text not null default 'Share good news...',
  check_in_response text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moonshot_meeting_agenda_sections (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.moonshot_meetings(id) on delete cascade,
  title text not null,
  minutes integer not null default 5,
  section_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moonshot_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  metric_name text not null,
  goal_value numeric not null default 0,
  actual_value numeric not null default 0,
  trend text not null default 'flat' check (trend in ('up', 'down', 'flat')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly')),
  unit text not null check (unit in ('number', 'percent', 'currency')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moonshot_metric_points (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.moonshot_metrics(id) on delete cascade,
  point_date date not null,
  point_value numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(metric_id, point_date)
);

create table if not exists public.moonshot_rocks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_name text not null,
  due_date date not null,
  status text not null check (status in ('On Track', 'At Risk', 'Off Track', 'Completed')),
  percent_complete integer not null default 0,
  notes text not null default '',
  meeting_id uuid references public.moonshot_meetings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moonshot_todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_name text not null,
  due_date date not null,
  completed boolean not null default false,
  meeting_id uuid references public.moonshot_meetings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moonshot_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_name text not null,
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  status text not null check (status in ('Open', 'In Progress', 'Resolved')),
  identified text not null default '',
  discussed text not null default '',
  solved text not null default '',
  meeting_id uuid references public.moonshot_meetings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moonshot_business_plan (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backup table capturing full row snapshots for change recovery/audit.
create table if not exists public.moonshot_backups (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  snapshot jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create or replace function public.moonshot_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.moonshot_write_backup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_payload jsonb;
  row_id uuid;
begin
  if tg_op = 'DELETE' then
    row_payload := to_jsonb(old);
    row_id := old.id;
  else
    row_payload := to_jsonb(new);
    row_id := new.id;
  end if;

  insert into public.moonshot_backups(source_table, source_id, operation, snapshot, changed_by)
  values (tg_table_name, row_id, tg_op, row_payload, auth.uid());

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Updated-at triggers.
drop trigger if exists moonshot_meetings_touch_updated_at on public.moonshot_meetings;
create trigger moonshot_meetings_touch_updated_at before update on public.moonshot_meetings for each row execute function public.moonshot_touch_updated_at();

drop trigger if exists moonshot_agenda_touch_updated_at on public.moonshot_meeting_agenda_sections;
create trigger moonshot_agenda_touch_updated_at before update on public.moonshot_meeting_agenda_sections for each row execute function public.moonshot_touch_updated_at();

drop trigger if exists moonshot_metrics_touch_updated_at on public.moonshot_metrics;
create trigger moonshot_metrics_touch_updated_at before update on public.moonshot_metrics for each row execute function public.moonshot_touch_updated_at();

drop trigger if exists moonshot_rocks_touch_updated_at on public.moonshot_rocks;
create trigger moonshot_rocks_touch_updated_at before update on public.moonshot_rocks for each row execute function public.moonshot_touch_updated_at();

drop trigger if exists moonshot_todos_touch_updated_at on public.moonshot_todos;
create trigger moonshot_todos_touch_updated_at before update on public.moonshot_todos for each row execute function public.moonshot_touch_updated_at();

drop trigger if exists moonshot_issues_touch_updated_at on public.moonshot_issues;
create trigger moonshot_issues_touch_updated_at before update on public.moonshot_issues for each row execute function public.moonshot_touch_updated_at();

drop trigger if exists moonshot_business_plan_touch_updated_at on public.moonshot_business_plan;
create trigger moonshot_business_plan_touch_updated_at before update on public.moonshot_business_plan for each row execute function public.moonshot_touch_updated_at();

-- Backup triggers.
drop trigger if exists moonshot_meetings_write_backup on public.moonshot_meetings;
create trigger moonshot_meetings_write_backup after insert or update or delete on public.moonshot_meetings for each row execute function public.moonshot_write_backup();

drop trigger if exists moonshot_agenda_write_backup on public.moonshot_meeting_agenda_sections;
create trigger moonshot_agenda_write_backup after insert or update or delete on public.moonshot_meeting_agenda_sections for each row execute function public.moonshot_write_backup();

drop trigger if exists moonshot_metrics_write_backup on public.moonshot_metrics;
create trigger moonshot_metrics_write_backup after insert or update or delete on public.moonshot_metrics for each row execute function public.moonshot_write_backup();

drop trigger if exists moonshot_metric_points_write_backup on public.moonshot_metric_points;
create trigger moonshot_metric_points_write_backup after insert or update or delete on public.moonshot_metric_points for each row execute function public.moonshot_write_backup();

drop trigger if exists moonshot_rocks_write_backup on public.moonshot_rocks;
create trigger moonshot_rocks_write_backup after insert or update or delete on public.moonshot_rocks for each row execute function public.moonshot_write_backup();

drop trigger if exists moonshot_todos_write_backup on public.moonshot_todos;
create trigger moonshot_todos_write_backup after insert or update or delete on public.moonshot_todos for each row execute function public.moonshot_write_backup();

drop trigger if exists moonshot_issues_write_backup on public.moonshot_issues;
create trigger moonshot_issues_write_backup after insert or update or delete on public.moonshot_issues for each row execute function public.moonshot_write_backup();

drop trigger if exists moonshot_business_plan_write_backup on public.moonshot_business_plan;
create trigger moonshot_business_plan_write_backup after insert or update or delete on public.moonshot_business_plan for each row execute function public.moonshot_write_backup();

-- RLS hardening.
alter table public.moonshot_meetings enable row level security;
alter table public.moonshot_meeting_agenda_sections enable row level security;
alter table public.moonshot_metrics enable row level security;
alter table public.moonshot_metric_points enable row level security;
alter table public.moonshot_rocks enable row level security;
alter table public.moonshot_todos enable row level security;
alter table public.moonshot_issues enable row level security;
alter table public.moonshot_business_plan enable row level security;
alter table public.moonshot_backups enable row level security;

drop policy if exists "Role users can read moonshot meetings" on public.moonshot_meetings;
create policy "Role users can read moonshot meetings" on public.moonshot_meetings for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot meetings" on public.moonshot_meetings;
create policy "Editors can write moonshot meetings" on public.moonshot_meetings for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Role users can read moonshot agenda" on public.moonshot_meeting_agenda_sections;
create policy "Role users can read moonshot agenda" on public.moonshot_meeting_agenda_sections for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot agenda" on public.moonshot_meeting_agenda_sections;
create policy "Editors can write moonshot agenda" on public.moonshot_meeting_agenda_sections for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Role users can read moonshot metrics" on public.moonshot_metrics;
create policy "Role users can read moonshot metrics" on public.moonshot_metrics for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot metrics" on public.moonshot_metrics;
create policy "Editors can write moonshot metrics" on public.moonshot_metrics for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Role users can read moonshot metric points" on public.moonshot_metric_points;
create policy "Role users can read moonshot metric points" on public.moonshot_metric_points for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot metric points" on public.moonshot_metric_points;
create policy "Editors can write moonshot metric points" on public.moonshot_metric_points for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Role users can read moonshot rocks" on public.moonshot_rocks;
create policy "Role users can read moonshot rocks" on public.moonshot_rocks for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot rocks" on public.moonshot_rocks;
create policy "Editors can write moonshot rocks" on public.moonshot_rocks for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Role users can read moonshot todos" on public.moonshot_todos;
create policy "Role users can read moonshot todos" on public.moonshot_todos for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot todos" on public.moonshot_todos;
create policy "Editors can write moonshot todos" on public.moonshot_todos for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Role users can read moonshot issues" on public.moonshot_issues;
create policy "Role users can read moonshot issues" on public.moonshot_issues for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot issues" on public.moonshot_issues;
create policy "Editors can write moonshot issues" on public.moonshot_issues for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Role users can read moonshot business plan" on public.moonshot_business_plan;
create policy "Role users can read moonshot business plan" on public.moonshot_business_plan for select using (has_any_role(auth.uid()));
drop policy if exists "Editors can write moonshot business plan" on public.moonshot_business_plan;
create policy "Editors can write moonshot business plan" on public.moonshot_business_plan for all using (has_edit_role(auth.uid())) with check (has_edit_role(auth.uid()));

drop policy if exists "Admins can read moonshot backups" on public.moonshot_backups;
create policy "Admins can read moonshot backups" on public.moonshot_backups for select using (has_role(auth.uid(), 'admin'));
drop policy if exists "Editors can insert moonshot backups" on public.moonshot_backups;
create policy "Editors can insert moonshot backups" on public.moonshot_backups for insert with check (has_edit_role(auth.uid()));
