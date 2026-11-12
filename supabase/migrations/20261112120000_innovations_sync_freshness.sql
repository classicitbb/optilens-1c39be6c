-- Office sync freshness: when each Innovations entity last reached the website,
-- against the cadence of the always-on OptiLens Local sync worker
-- (hot 2 min, warm 15 min, nightly 02:00). Read by platform-health-check.
create or replace view public.innovations_sync_freshness
with (security_invoker = true) as
with last_runs as (
  select
    entity,
    max(finished_at) filter (where status in ('success', 'partial')) as last_delivered_at,
    max(started_at) as last_attempt_at,
    (array_agg(status order by started_at desc))[1] as last_status
  from public.innovations_sync_runs
  where dry_run = false
  group by entity
), tiered as (
  select
    l.*,
    case
      when l.entity in ('customers', 'balances', 'order_activity', 'statements', 'statement_lines') then 'hot'
      when l.entity in ('banks', 'contacts', 'lens_aliases') then 'warm'
      when l.entity in ('store_lenses', 'store_lens_power_rows') or l.entity like 'inn\_%' then 'nightly'
    end as tier
  from last_runs l
)
select
  entity,
  tier,
  case tier when 'hot' then interval '10 minutes' when 'warm' then interval '45 minutes' else interval '30 hours' end as max_age,
  last_delivered_at,
  last_attempt_at,
  last_status,
  now() - last_delivered_at as age,
  (last_delivered_at is null
    or now() - last_delivered_at > case tier when 'hot' then interval '10 minutes' when 'warm' then interval '45 minutes' else interval '30 hours' end) as is_stale
from tiered
where tier is not null;

comment on view public.innovations_sync_freshness is
  'Per-entity freshness of the Innovations office sync against the sync worker cadence (hot 2m / warm 15m / nightly).';
