

# Plan: Helpdesk Overview & Tickets Major Enhancement

This is a large set of interconnected changes across the Helpdesk module. Here is the breakdown:

---

## 1. Database: Create `helpdesk_priorities` table

A new configurable priorities table so admins can manage priority levels from the config page.

```sql
CREATE TABLE public.helpdesk_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.helpdesk_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view priorities"
  ON public.helpdesk_priorities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage priorities"
  ON public.helpdesk_priorities FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

-- Seed defaults
INSERT INTO public.helpdesk_priorities (level, label, color) VALUES
  (0, 'Low', '#6b7280'),
  (1, 'Normal', '#6b7280'),
  (2, 'Medium', '#f59e0b'),
  (3, 'High', '#f97316'),
  (4, 'Urgent', '#ef4444'),
  (5, 'Critical', '#dc2626');
```

---

## 2. HelpdeskConfigPage — Add Priorities section

Add a third card for "Priorities" with columns: Level, Label, Color, Active, and Delete. CRUD mirrors the Ticket Types pattern using new mutations `useCreateHelpdeskPriority`, `useUpdateHelpdeskPriority`, `useDeleteHelpdeskPriority`.

---

## 3. Mutations — Add priority CRUD hooks

In `useHelpdeskMutations.ts`, add three new hooks for the `helpdesk_priorities` table following the existing pattern.

---

## 4. HelpdeskOverviewPage — Major overhaul

### 4a. Click tile to edit (remove pencil-on-hover)
Make the entire Kanban card clickable to open the edit dialog. Remove the pencil icon from cards.

### 4b. Priority colors shade tiles
Fetch priorities from `helpdesk_priorities` table. Use the priority's `color` as a subtle background tint on each tile (e.g., `background: ${color}15` for 8% opacity).

### 4c. Ticket type above title
Show ticket type badge above the title line on cards and prepend it in list view.

### 4d. Foldable resolved/cancelled columns
Add a `collapsedCols` state set. Columns where `is_closed` or `is_folded` start collapsed. Show a chevron toggle icon. When collapsed, show just the header with count and a drop zone strip. Drag-and-drop still works on collapsed columns.

### 4e. Urgent/Critical tickets > 20h old → red alert popup
On mount and every 30s refetch, check for tickets with priority >= 4 and `created_at` older than 20 hours that are not in a closed stage. Show a bold red alert dialog listing them.

### 4f. Responsive layout
- Desktop: Kanban board as-is
- Tablet (<1024px): Kanban columns wrap or scroll horizontally
- Mobile (<768px): Auto-switch to list view. Header controls stack vertically. Search full-width.

### 4g. List view — click row to edit
Make the entire row clickable (except the stage dropdown) to open the edit dialog. Remove the pencil column.

---

## 5. HelpdeskTicketsPage — Enhancements

### 5a. Enter/Tab through create form
Add `onKeyDown` handlers: Enter on any field triggers `handleCreate()`, Tab naturally flows through fields. Add visible focus ring styling (`focus:ring-2 focus:ring-primary`).

### 5b. Archive instead of delete
Replace the "Delete" button with "Archive" — sets ticket to a closed/archived stage instead of hard-deleting. Remove delete functionality for non-admin or change to archive-only.

### 5c. Click row to edit
Make the entire ticket row clickable to open the edit dialog. Remove the separate Edit button.

### 5d. Mobile-responsive create form
On mobile, the create form collapses into a single-column layout with larger touch targets. Sidebar collapses automatically (already handled by AdminLayout). Add a sticky "Create Ticket" button that expands the form.

### 5e. Ticket type ahead of title
In the ticket queue table, show Type column before Title column.

---

## Files to modify

| File | Changes |
|------|---------|
| Migration SQL | Create `helpdesk_priorities` table with seed data |
| `src/features/admin/helpdesk/hooks/useHelpdeskMutations.ts` | Add priority CRUD mutations |
| `src/pages/admin/helpdesk/HelpdeskConfigPage.tsx` | Add Priorities config card |
| `src/pages/admin/helpdesk/HelpdeskOverviewPage.tsx` | Click-to-edit tiles, priority color shading, foldable columns, urgent alert, responsive, type above title |
| `src/pages/admin/helpdesk/HelpdeskTicketsPage.tsx` | Enter/Tab create, archive-not-delete, click-row-to-edit, responsive create form, type before title |
| `src/features/admin/helpdesk/utils/normalization.ts` | Update priority label function to optionally use DB priorities |

