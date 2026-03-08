

## Helpdesk Module -- Full Review and Fix Plan

### Issues Found

**1. Missing database columns (CRITICAL -- blocks Teams page entirely)**
The `helpdesk_teams` table was created by migration `20260301*` **without** `assignment_mode` or `visibility` columns. The later migration `20260308113000` used `CREATE TABLE IF NOT EXISTS`, which silently skipped because the table already existed. Result: the Teams page crashes with `column helpdesk_teams.assignment_mode does not exist`.

**2. Missing RLS on newer helpdesk tables**
The `20260308113000` and `20260308130000` migrations created/recreated tables but did **not** include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or any RLS policies for:
- `helpdesk_sla_policies`
- `helpdesk_ticket_sla_status`

The older `20260301*` migration correctly set RLS on `helpdesk_teams`, `helpdesk_tickets`, `helpdesk_ticket_stages`, `helpdesk_ticket_types`, `helpdesk_ticket_tags`, `helpdesk_ticket_events`, and `helpdesk_ticket_tag_rel`. Those are fine.

**3. No delete/archive capability for tickets**
Tickets can only be created, stage-changed, and assigned. There is no UI or hook for deleting or archiving tickets. SLA policies and teams can only be toggled active/inactive but never deleted.

**4. No edit capability for teams, SLA policies, or tickets**
Teams cannot be renamed or have their assignment mode changed after creation. SLA policies cannot have target hours adjusted. Tickets have no inline edit for title/description/priority.

**5. Stages are not configurable from the UI**
The `helpdesk_ticket_stages` table exists with seed data but there is no page to create, reorder, rename, or delete stages.

**6. Ticket types and tags have no UI**
Tables `helpdesk_ticket_types` and `helpdesk_ticket_tags` exist in the database but are completely unmanaged from the frontend.

---

### Implementation Plan

#### Step 1 -- Database migration to add missing columns and RLS
Run a single migration that:
- `ALTER TABLE helpdesk_teams ADD COLUMN IF NOT EXISTS assignment_mode text NOT NULL DEFAULT 'manual'` with CHECK constraint
- `ALTER TABLE helpdesk_teams ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal'` with CHECK constraint
- `ALTER TABLE helpdesk_sla_policies ENABLE ROW LEVEL SECURITY` + SELECT/INSERT/UPDATE/DELETE policies (same pattern: `has_any_role` for SELECT, `has_edit_role` for INSERT/UPDATE, `has_role(...,'admin')` for DELETE)
- `ALTER TABLE helpdesk_ticket_sla_status ENABLE ROW LEVEL SECURITY` + policies

#### Step 2 -- Add delete mutations and UI actions

**Tickets**: Add a `useDeleteHelpdeskTicket` hook and a delete button per row (admin only, with confirmation dialog).

**Teams**: Add a delete mutation and button (admin only).

**SLA Policies**: Add a delete mutation and button (admin only).

#### Step 3 -- Add inline edit capability

**Teams**: Add an edit dialog/row that allows renaming, changing assignment mode, and visibility.

**SLA Policies**: Add an edit dialog for name, target hours, priority filter, team, and target stage.

**Tickets**: Add an edit dialog for title, description, priority, team, and type.

#### Step 4 -- Add Stages configuration page

Create `HelpdeskStagesPage.tsx` at `/admin/helpdesk/stages` with:
- List of stages with sequence, name, is_closed, is_folded columns
- Create form (name, sequence, is_closed toggle)
- Inline edit for name and sequence
- Delete button (admin only)
- Wire route in App.tsx

#### Step 5 -- Add Ticket Types and Tags management

Create `HelpdeskConfigPage.tsx` at `/admin/helpdesk/config` with two sections:
- **Ticket Types**: CRUD table (name, description, is_active toggle, delete)
- **Ticket Tags**: CRUD table (name, color picker, delete)
- Wire route in App.tsx and add sidebar navigation

#### Step 6 -- Add sidebar navigation entries

Update the admin sidebar to include sub-links for: Tickets, Teams, Stages, SLA Policies, Config (Types & Tags).

---

### Technical Details

**Migration SQL** will use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for safety and `DO $$ ... END $$` blocks for conditional RLS policy creation.

All new hooks follow the existing pattern: `(supabase as any).from("table_name")` with `useMutation` + `useQueryClient` invalidation.

Delete operations use `AlertDialog` for confirmation, consistent with the rest of the admin UI.

RBAC enforcement: all new pages check `canView("helpdesk")` / `canEditFeature("helpdesk")`, delete is further restricted to admin via `isAdmin` from `useUserRole`.

