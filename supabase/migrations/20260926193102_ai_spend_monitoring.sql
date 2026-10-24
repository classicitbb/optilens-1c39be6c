-- Admin-only AI usage and manually reconciled provider billing snapshots.
-- No prompts, responses, customer IDs, or credentials are stored here.
create table public.ai_spend_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  provider text not null check (provider in ('anthropic', 'lovable-ai', 'google-document-ai')),
  product text not null,
  function_name text not null,
  model text,
  http_status integer check (http_status between 100 and 599),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  units integer check (units >= 0),
  charge_usd numeric(14,6) check (charge_usd >= 0),
  charge_source text check (charge_source in ('provider', 'estimate'))
);

create index ai_spend_events_recent_idx on public.ai_spend_events (occurred_at desc, provider);
alter table public.ai_spend_events enable row level security;
create policy "Admins read AI spend events" on public.ai_spend_events
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

create view public.ai_spend_daily with (security_invoker = true) as
select date_trunc('day', occurred_at) as day,
       provider, product, function_name,
       count(*)::integer as requests,
       count(*) filter (where http_status between 200 and 299)::integer as successful_requests,
       coalesce(sum(input_tokens), 0)::bigint as input_tokens,
       coalesce(sum(output_tokens), 0)::bigint as output_tokens,
       coalesce(sum(units), 0)::bigint as units,
       coalesce(sum(charge_usd), 0)::numeric(14,6) as charge_usd
from public.ai_spend_events
group by 1, 2, 3, 4;

create table public.ai_spend_snapshots (
  provider text not null,
  product text not null,
  unit text not null default 'USD' check (unit in ('USD', 'credits', 'pages')),
  balance_amount numeric(14,2) check (balance_amount >= 0),
  credit_capacity_amount numeric(14,2) check (credit_capacity_amount > 0),
  used_30d_amount numeric(14,2) check (used_30d_amount >= 0),
  spend_30d_usd numeric(14,2) check (spend_30d_usd >= 0),
  as_of timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'manual' check (source = 'manual'),
  primary key (provider, product),
  check (provider in ('anthropic', 'lovable-ai', 'lovable-editor', 'google-document-ai', 'higgsfield', 'openai', 'xai', 'copilot')),
  check (balance_amount is null or credit_capacity_amount is null or balance_amount <= credit_capacity_amount)
);

alter table public.ai_spend_snapshots enable row level security;
create policy "Admins read AI spend snapshots" on public.ai_spend_snapshots
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));
create policy "Admins insert AI spend snapshots" on public.ai_spend_snapshots
  for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'));
create policy "Admins update AI spend snapshots" on public.ai_spend_snapshots
  for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

revoke all on public.ai_spend_events from anon, authenticated;
revoke all on public.ai_spend_snapshots from anon, authenticated;
grant select on public.ai_spend_events to authenticated;
grant select on public.ai_spend_daily to authenticated;
grant select, insert, update on public.ai_spend_snapshots to authenticated;
grant select, insert on public.ai_spend_events to service_role;
grant all on public.ai_spend_snapshots to service_role;
notify pgrst, 'reload schema';
