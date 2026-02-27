-- Phase 2 deliverables verification

-- 1) Required core tables exist
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'contacts','opportunities','lead_audits','activities','notes','price_catalog','opportunity_attachments'
  )
order by table_name;

-- 2) Required contacts enrichment columns exist
select column_name
from information_schema.columns
where table_schema='public'
  and table_name='contacts'
  and column_name in (
    'city','country','status','website','instagram_handle','facebook_page','google_place_id','google_rating','google_reviews_count','ai_intent_score'
  )
order by column_name;

-- 3) price_catalog flags exist
select column_name
from information_schema.columns
where table_schema='public'
  and table_name='price_catalog'
  and column_name in ('web_enabled','wspl_enabled')
order by column_name;

-- 4) RLS enabled on new Phase 2 tables
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public'
  and c.relname in ('opportunities','lead_audits','activities','notes','price_catalog','opportunity_attachments')
order by c.relname;

-- 5) baseline auth policies exist on new Phase 2 tables
select tablename, policyname
from pg_policies
where schemaname='public'
  and tablename in ('opportunities','lead_audits','activities','notes','price_catalog','opportunity_attachments')
order by tablename, policyname;

-- 6) Required Phase 2 indexes exist
select indexname
from pg_indexes
where schemaname='public'
  and indexname in (
    'opportunities_contact_id_idx','opportunities_stage_idx',
    'lead_audits_contact_id_idx','lead_audits_opportunity_id_idx',
    'activities_contact_id_idx','activities_opportunity_id_idx','activities_due_at_idx',
    'notes_contact_id_idx','notes_opportunity_id_idx',
    'price_catalog_name_idx','price_catalog_web_enabled_idx','price_catalog_wspl_enabled_idx',
    'opportunity_attachments_opportunity_id_idx'
  )
order by indexname;
