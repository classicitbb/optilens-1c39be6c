-- Harden moonshot business plan rich text by sanitizing rich notes on write.

create or replace function public.sanitize_rich_text_html(input_html text)
returns text
language plpgsql
immutable
as $$
declare
  sanitized text := coalesce(input_html, '');
begin
  -- Remove executable script/style blocks first.
  sanitized := regexp_replace(sanitized, '<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', 'gi');
  sanitized := regexp_replace(sanitized, '<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', 'gi');

  -- Remove inline event handlers.
  sanitized := regexp_replace(sanitized, '\son[a-z0-9_-]+\s*=\s*("[^"]*"|''[^'']*''|[^\s>]+)', '', 'gi');

  -- Neutralize javascript: URLs in href/src attributes.
  sanitized := regexp_replace(sanitized, '(href|src)\s*=\s*"\s*javascript:[^"]*"', '\1="#"', 'gi');
  sanitized := regexp_replace(sanitized, '(href|src)\s*=\s*''\s*javascript:[^'']*''', '\1=''#''', 'gi');

  return sanitized;
end;
$$;

create or replace function public.moonshot_sanitize_business_plan_payload()
returns trigger
language plpgsql
as $$
declare
  payload_type text;
  notes text;
begin
  payload_type := jsonb_typeof(new.payload);
  if payload_type is distinct from 'object' then
    raise exception 'moonshot_business_plan.payload must be a JSON object';
  end if;

  notes := coalesce(new.payload #>> '{futureFocus,richNotes}', '');
  new.payload := jsonb_set(
    new.payload,
    '{futureFocus,richNotes}',
    to_jsonb(public.sanitize_rich_text_html(notes)),
    true
  );

  return new;
end;
$$;

drop trigger if exists moonshot_business_plan_sanitize_payload on public.moonshot_business_plan;
create trigger moonshot_business_plan_sanitize_payload
before insert or update on public.moonshot_business_plan
for each row
execute function public.moonshot_sanitize_business_plan_payload();
