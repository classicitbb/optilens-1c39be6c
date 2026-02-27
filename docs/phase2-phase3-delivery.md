# Phase 2 + Phase 3 Delivery (Absolute Best Leads Generator v1.0)

## Phase 2 — SQL run + confirmation

### SQL executed
- `supabase/migrations/20260226190000_phase2_database_foundation.sql`

This SQL includes:
- Contacts enrichment columns (city/country/status/website/social/Google fields + ai_intent_score)
- New tables: `opportunities`, `lead_audits`, `activities`, `notes`, `price_catalog`, `opportunity_attachments`
- Indexes for all major lookup columns
- RLS enabled + baseline authenticated policies
- Explicit guarantee that `price_catalog.web_enabled` and `price_catalog.wspl_enabled` exist

### Direct execution (Step A)
If you have direct DB access, run:

```bash
export DATABASE_URL="postgresql://..."
./scripts/run_phase2_step_a.sh
```

This will apply:
- `supabase/migrations/20260226190000_phase2_database_foundation.sql`

and then verify with:
- `scripts/phase2_step_a_verify.sql`

### Confirmation checklist (post-migration)
Run these SQL checks in Supabase SQL editor:

```sql
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
```

Expected:
- All 7 tables returned.
- Both `web_enabled` and `wspl_enabled` returned.

---

## Phase 3 — file/folder structure, components/hooks, queries, prompts, sequence JSON

## File/folder structure

```text
src/
  features/admin/leads/
    types.ts
    hooks/
      useLeads.ts
      useLeadScoring.ts
      useInstagramPostPack.ts
      useLeadSequenceBuilder.ts
  pages/admin/leads/
    MyLeadsPage.tsx
    LeadFinderPage.tsx
    LeadsAiAssistantPage.tsx
    LeadCampaignsPage.tsx
    LeadAuditReportsPage.tsx
    LeadSettingsPage.tsx

supabase/migrations/
  20260226190000_phase2_database_foundation.sql
```

## Components/pages delivered
- **My Leads** (`/admin/leads`) command centre with refresh + build package CTA
- **Lead Finder** (`/admin/leads/finder`) with “Find 50 Leads” and “Smart Batch” shell
- **AI Assistant** (`/admin/leads/ai`) with IG prompt seed + package CTA
- **Campaigns & Sequences** (`/admin/leads/campaigns`) with 5-step flow view
- **Audit Reports** (`/admin/leads/reports`) with generate shell + attach/package action path
- **Leads Settings** (`/admin/leads/settings`) for scoring/API/compliance sections

## Hooks
- `useLeads`: pulls `contacts` where `status='lead'`
- `useLeadScoring`: 5-component score + AI boost → Hot/Warm/Cold band
- `useInstagramPostPack`: prompt builder + mock pack shape
- `useLeadSequenceBuilder`: default 5-step WhatsApp/Email/IG-DM flow

## Supabase queries used
- Leads list:
```sql
select id,name,country,city,website,instagram_handle,facebook_page,
       google_rating,google_reviews_count,ai_intent_score,status,notes
from contacts
where status = 'lead'
order by updated_at desc
limit 500;
```

- Attach proposal to opportunity (from Phase 1 + 3 integration):
```sql
insert into opportunity_attachments (opportunity_id, attachment_type, payload)
values (:opportunity_id, 'proposal', :payload_jsonb);
```

## AI prompts

### Brand voice base prompt
"You are Classic Visions' lead growth strategist for Caribbean optical wholesale. Be supportive, practical, Caribbean-friendly, and money-focused. Prioritize actions that improve sell-through, conversion speed, and supplier reliability."

### Instagram generator prompt (primary)
"Using this lead profile (name, country, reviews, IG/FB activity, top products), generate a ready-to-post Instagram content pack with:
1) 5 carousel slide concepts,
2) 3 caption options in Caribbean-friendly tone,
3) hashtag sets (local + optical niche),
4) a 30s reel script + trending audio style,
5) 3 story ideas with poll questions.
Output strict JSON fields: carousel, captions, hashtags, reel, stories."

### WhatsApp opener prompt
"Write a short, high-converting WhatsApp opener for an optical store owner. Mention one observed pain point and one measurable benefit from switching to Classic Visions."

### Objection-handling prompt
"Simulate buyer objections (price, stock reliability, switching friction) and provide concise rebuttals tailored to Caribbean optical retail." 

## Exact sequence JSON example

```json
{
  "name": "Classic Visions 5-Step Lead Convert",
  "steps": [
    { "step": 1, "channel": "whatsapp", "delayHours": 0, "goal": "Ice-break + value hook" },
    { "step": 2, "channel": "email", "delayHours": 24, "goal": "Send mini audit + CTA" },
    { "step": 3, "channel": "whatsapp", "delayHours": 48, "goal": "Handle objections + social proof" },
    { "step": 4, "channel": "instagram_dm", "delayHours": 72, "goal": "Friendly follow-up + content teaser" },
    { "step": 5, "channel": "email", "delayHours": 96, "goal": "Final nudge + meeting link" }
  ],
  "compliance": {
    "respectOptOut": true,
    "maxTouchesPerWeek": 5,
    "manualReviewForInstagramDM": true
  }
}
```

