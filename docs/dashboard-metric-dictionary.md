# Dashboard Metric Dictionary

This document defines the canonical KPI calculations for dashboard cards. Engineering and analytics should treat these definitions as the source of truth unless a follow-up product decision updates this file.

## Scope and implementation guardrail

- These KPI definitions are **specification only**.
- **Product signoff is required before implementing or changing UI cards** that display these metrics.
- Any shipped card must link to this dictionary and explicitly note any approved deviations.

## Global conventions

- **Timezone:** Use the workspace/account reporting timezone where available; otherwise default to UTC.
- **Null handling:** Exclude null denominators from rate calculations; return `0` when numerator and denominator are both `0`.
- **Soft exclusions:** Exclude archived/inactive records where applicable (for example, `contacts.is_archived = false`).
- **Date field precedence:**
  - Use `created_at` for creation volume/rates.
  - Use `updated_at` only if a metric explicitly describes current-state snapshot behavior.
  - Use `due_at` for overdue calculations.

---

## KPI definitions

## 1) avg markup

- **KPI name:** `avg markup`
- **Business definition:** Average markup percentage across quoted lines, weighted by quantity and cost basis.
- **Primary table(s):** `quotes`, `quote_lines`
- **Join(s):** `quote_lines.quote_id = quotes.id`
- **Formula:**
  - Per-line markup %:
    - `line_markup_pct = ((unit_sell_price_bbd - unit_cost_landed_bbd) / NULLIF(unit_cost_landed_bbd, 0)) * 100`
  - Weighted average markup %:
    - `avg_markup = SUM(line_markup_pct * qty) / NULLIF(SUM(qty), 0)`
- **Required filters:**
  - `quotes.status NOT IN ('Void')`
  - `quote_lines.qty > 0`
  - `quote_lines.unit_cost_landed_bbd > 0`
- **Time window behavior:**
  - **Default:** Rolling 30 days using `quotes.created_at`.
  - **If user selects a range:** filter on `quotes.created_at BETWEEN start AND end`.
  - **If no rows in window:** return `0` and show “No quote lines in selected period.”

## 2) pipeline value

- **KPI name:** `pipeline value`
- **Business definition:** Current total expected revenue in active CRM opportunities.
- **Primary table(s):** `opportunities`
- **Formula:**
  - `pipeline_value = SUM(COALESCE(expected_value, estimated_value, 0))`
- **Required filters:**
  - Exclude closed/lost opportunities: `COALESCE(status, '') NOT IN ('won', 'lost', 'closed')`
  - Exclude null-contact records only if needed by downstream UX (`contact_id IS NOT NULL`)—keep unless product signs off.
- **Time window behavior:**
  - **Snapshot metric (default):** Ignore date range and evaluate current record state.
  - **Optional trend mode (future):** If trend is requested, bucket by `created_at` and still apply active-status filter per bucket date policy (requires product signoff).

## 3) lead save rate

- **KPI name:** `lead save rate`
- **Business definition:** Share of discovered leads that were saved into CRM as contact records in lead pipeline states.
- **Primary table(s):** `contacts`
- **Formula:**
  - `lead_save_rate = saved_leads / discovered_leads`
  - `saved_leads = COUNT(DISTINCT contacts.id WHERE contacts.status IN ('lead','contacted','meeting','proposal'))`
  - `discovered_leads` should come from the same ingestion cohort definition used by Lead Finder/export logs.
- **Required filters:**
  - `contacts.is_archived = false` when field is available.
  - Restrict to lead states only: `status IN ('lead','contacted','meeting','proposal')`.
- **Time window behavior:**
  - Use cohort-by-creation window on `contacts.created_at`.
  - Compute both numerator and denominator within the same selected period.
  - If cohort source is unavailable, metric should render as `N/A` (not `0`) until product approves a fallback denominator.

## 4) quote acceptance rate

- **KPI name:** `quote acceptance rate`
- **Business definition:** Portion of finalized quote outcomes that were accepted by customers.
- **Primary table(s):** `quotes`
- **Formula:**
  - `quote_acceptance_rate = accepted_quotes / decided_quotes`
  - `accepted_quotes = COUNT(*) WHERE status = 'Accepted'`
  - `decided_quotes = COUNT(*) WHERE status IN ('Accepted','Rejected','Expired')`
- **Required filters:**
  - Exclude non-decision states from denominator (`Draft`, `Sent`, `Void`).
- **Time window behavior:**
  - **Default:** Rolling 30 days by `quotes.updated_at` (decision timestamp proxy).
  - **If explicit decision timestamp is added later:** migrate filter to that field.
  - Show `N/A` when `decided_quotes = 0`.

## 5) overdue activities

- **KPI name:** `overdue activities`
- **Business definition:** Count of open CRM activities with due dates before now.
- **Primary table(s):** `activities`
- **Formula:**
  - `overdue_activities = COUNT(*) WHERE due_at < now() AND COALESCE(status,'open') NOT IN ('completed','done','cancelled')`
- **Required filters:**
  - `due_at IS NOT NULL`
  - Open-state filter above.
- **Time window behavior:**
  - **Snapshot metric:** Always calculated at query runtime (`now()`), independent of dashboard date range.
  - **Optional historical trend mode:** If added, chart daily snapshots from a persisted snapshot table (not from backfilled live status) to avoid restatement.

---

## Implementation checklist (must complete before UI)

1. Product approves each KPI formula + filter set in this file.
2. Data owner validates table/field availability in production.
3. Engineering adds unit tests for each metric query.
4. Dashboard card labels/tooltips match KPI names exactly.
5. Any fallback behavior (`0` vs `N/A`) is explicitly tested.
