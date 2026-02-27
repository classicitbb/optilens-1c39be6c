# Leads + CRM: sample seeding and manual entry guide

This guide explains two quick workflows:

1. **Seed sample records** to immediately populate demo data.
2. **Manually add leads and opportunities** from the admin UI.

## 1) Seed sample records (UI)

### Seed Leads
- Go to **`/admin/leads`**.
- Click **Seed Sample Leads** in the page header.
- The action upserts sample contacts with lead statuses and scores.

### Seed CRM Opportunities
- Go to **`/admin/crm/pipeline`**.
- Click **Seed Sample Opportunities**.
- The action creates/upserts contact records first, then creates baseline opportunities in different stages.

## 2) Manual entry (UI)

### Add a Lead manually
- Go to **`/admin/leads`**.
- Use **Manual Lead Intake**:
  - Store / lead name (required)
  - City
  - Country
  - Website
  - Score
- Click **Add Lead**.

### Add an Opportunity manually
- Go to **`/admin/crm/pipeline`**.
- Use **Manual Opportunity Intake**:
  - Contact / store name (required)
  - Opportunity title (required)
  - City
  - Country
  - Estimated value
- Click **Add**.

The opportunity flow will upsert the contact first so you can add opportunities even if the contact does not exist yet.

## 3) Optional SQL seed path

If you prefer SQL, this baseline pattern is equivalent:

```sql
-- upsert contact
insert into public.contacts (name, city, country, status, ai_intent_score)
values ('Sample Optical', 'Kingston', 'Jamaica', 'lead', 75)
on conflict (name) do update
set city = excluded.city,
    country = excluded.country,
    status = excluded.status,
    ai_intent_score = excluded.ai_intent_score;

-- create opportunity for contact
insert into public.opportunities (contact_id, title, stage, country, volume_tier, estimated_value)
select id, 'Sample Opportunity', 'new', 'Jamaica', 'medium', 10000
from public.contacts
where name = 'Sample Optical'
on conflict do nothing;
```
