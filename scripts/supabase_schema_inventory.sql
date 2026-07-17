/*
  Supabase schema inventory.

  Run this in the source Lovable Cloud SQL editor and in the destination
  Datamation Supabase SQL editor. Save the single JSON result from each run as:

    tmp/lovable-schema-inventory.json
    tmp/datamation-schema-inventory.json

  The output documents table/view names, columns, constraints, indexes, RLS,
  policies, triggers, functions, enum types, extensions, publications, and
  storage buckets/objects if the Supabase storage schema exists.
*/

with visible_namespaces as (
  select n.oid, n.nspname
  from pg_namespace n
  where n.nspname not in ('information_schema', 'pg_catalog')
    and n.nspname not like 'pg_toast%'
),
relations as (
  select
    n.nspname as table_schema,
    c.relname as table_name,
    case c.relkind
      when 'r' then 'table'
      when 'p' then 'partitioned table'
      when 'v' then 'view'
      when 'm' then 'materialized view'
      when 'f' then 'foreign table'
      else c.relkind::text
    end as relation_type,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    coalesce(s.n_live_tup, c.reltuples)::bigint as estimated_rows
  from pg_class c
  join visible_namespaces n on n.oid = c.relnamespace
  left join pg_stat_user_tables s on s.relid = c.oid
  where c.relkind in ('r', 'p', 'v', 'm', 'f')
),
columns as (
  select
    c.table_schema,
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_schema,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    c.is_identity,
    c.identity_generation,
    c.is_generated,
    c.generation_expression,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.datetime_precision
  from information_schema.columns c
  join visible_namespaces n on n.nspname = c.table_schema
),
constraints as (
  select
    tc.constraint_schema,
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    tc.constraint_type,
    jsonb_agg(kcu.column_name order by kcu.ordinal_position) filter (where kcu.column_name is not null) as columns,
    ccu.table_schema as foreign_table_schema,
    ccu.table_name as foreign_table_name,
    jsonb_agg(ccu.column_name order by kcu.ordinal_position) filter (where ccu.column_name is not null) as foreign_columns
  from information_schema.table_constraints tc
  left join information_schema.key_column_usage kcu
    on kcu.constraint_schema = tc.constraint_schema
   and kcu.constraint_name = tc.constraint_name
   and kcu.table_schema = tc.table_schema
   and kcu.table_name = tc.table_name
  left join information_schema.constraint_column_usage ccu
    on ccu.constraint_schema = tc.constraint_schema
   and ccu.constraint_name = tc.constraint_name
  join visible_namespaces n on n.nspname = tc.table_schema
  group by
    tc.constraint_schema,
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    tc.constraint_type,
    ccu.table_schema,
    ccu.table_name
),
foreign_keys as (
  select
    tc.constraint_schema,
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    rc.update_rule,
    rc.delete_rule,
    rc.match_option
  from information_schema.table_constraints tc
  join information_schema.referential_constraints rc
    on rc.constraint_schema = tc.constraint_schema
   and rc.constraint_name = tc.constraint_name
  join visible_namespaces n on n.nspname = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
),
indexes as (
  select
    schemaname as table_schema,
    tablename as table_name,
    indexname as index_name,
    indexdef
  from pg_indexes
  where schemaname in (select nspname from visible_namespaces)
),
policies as (
  select
    schemaname as table_schema,
    tablename as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname in (select nspname from visible_namespaces)
),
triggers as (
  select
    trigger_schema,
    trigger_name,
    event_object_schema as table_schema,
    event_object_table as table_name,
    action_timing,
    event_manipulation,
    action_statement,
    action_orientation
  from information_schema.triggers
  where event_object_schema in (select nspname from visible_namespaces)
),
functions as (
  select
    n.nspname as function_schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as returns,
    case p.provolatile
      when 'i' then 'immutable'
      when 's' then 'stable'
      when 'v' then 'volatile'
    end as volatility,
    p.prosecdef as security_definer,
    l.lanname as language
  from pg_proc p
  join visible_namespaces n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
),
enum_values as (
  select
    n.nspname as type_schema,
    t.typname as type_name,
    jsonb_agg(e.enumlabel order by e.enumsortorder) as values
  from pg_type t
  join visible_namespaces n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  group by n.nspname, t.typname
),
extensions as (
  select
    e.extname as extension_name,
    e.extversion as extension_version,
    n.nspname as schema_name
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
),
publications as (
  select
    p.pubname as publication_name,
    p.pubinsert,
    p.pubupdate,
    p.pubdelete,
    p.pubtruncate
  from pg_publication p
),
storage_buckets as (
  select jsonb_agg(to_jsonb(b) order by b.id) as data
  from storage.buckets b
  where to_regclass('storage.buckets') is not null
),
storage_object_counts as (
  select jsonb_agg(to_jsonb(o) order by o.bucket_id) as data
  from (
    select bucket_id, count(*)::bigint as object_count
    from storage.objects
    where to_regclass('storage.objects') is not null
    group by bucket_id
  ) o
)
select jsonb_pretty(
  jsonb_build_object(
    'generated_at', now(),
    'relations', coalesce((select jsonb_agg(to_jsonb(r) order by r.table_schema, r.table_name) from relations r), '[]'::jsonb),
    'columns', coalesce((select jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name, c.ordinal_position) from columns c), '[]'::jsonb),
    'constraints', coalesce((select jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name, c.constraint_name) from constraints c), '[]'::jsonb),
    'foreign_keys', coalesce((select jsonb_agg(to_jsonb(f) order by f.table_schema, f.table_name, f.constraint_name) from foreign_keys f), '[]'::jsonb),
    'indexes', coalesce((select jsonb_agg(to_jsonb(i) order by i.table_schema, i.table_name, i.index_name) from indexes i), '[]'::jsonb),
    'policies', coalesce((select jsonb_agg(to_jsonb(p) order by p.table_schema, p.table_name, p.policyname) from policies p), '[]'::jsonb),
    'triggers', coalesce((select jsonb_agg(to_jsonb(t) order by t.table_schema, t.table_name, t.trigger_name) from triggers t), '[]'::jsonb),
    'functions', coalesce((select jsonb_agg(to_jsonb(f) order by f.function_schema, f.function_name, f.arguments) from functions f), '[]'::jsonb),
    'enum_values', coalesce((select jsonb_agg(to_jsonb(e) order by e.type_schema, e.type_name) from enum_values e), '[]'::jsonb),
    'extensions', coalesce((select jsonb_agg(to_jsonb(e) order by e.extension_name) from extensions e), '[]'::jsonb),
    'publications', coalesce((select jsonb_agg(to_jsonb(p) order by p.publication_name) from publications p), '[]'::jsonb),
    'storage_buckets', coalesce((select data from storage_buckets), '[]'::jsonb),
    'storage_object_counts', coalesce((select data from storage_object_counts), '[]'::jsonb)
  )
) as inventory_json;
