-- Phase 2 Step A verification

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('contacts','opportunities','lead_audits','activities','notes','price_catalog','opportunity_attachments')
order by table_name;

select column_name
from information_schema.columns
where table_schema='public'
  and table_name='price_catalog'
  and column_name in ('web_enabled','wspl_enabled')
order by column_name;
