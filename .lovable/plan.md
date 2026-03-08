

## Plan: Add Ticket Type Dropdown to All Ticket Forms

### What changes

**Three locations** need a ticket type dropdown added, plus logic to auto-fill description from the selected type name when description is empty.

### 1. Shared Ticket Types Query
Both pages already query teams/stages similarly. Add a `helpdesk_ticket_types` query to both pages (Overview already has teams/stages queries to follow the pattern).

### 2. HelpdeskTicketsPage (Create + Edit)

**Create form** (line 123-148):
- Add a `ticketTypeId` field to `form` state
- Add a `Select` dropdown for ticket types between Contact and Team selects
- On type change: set `ticketTypeId`, and if `description` is empty, fill it with the type name
- Pass `ticketTypeId` to `createTicket.mutateAsync()`

**Edit dialog** (lines 244-277):
- Add `ticket_type_id` to `editForm` state
- Add ticket type `Select` dropdown in the edit dialog grid
- On type change: set `ticket_type_id`, and if `description` is empty, fill it with type name
- Pass `ticket_type_id` in `saveEdit()` call to `updateTicket.mutate()`

### 3. HelpdeskOverviewPage TicketEditDialog (lines 87-185)

- Add ticket types query (or pass as prop from parent which already queries them)
- Add `ticket_type_id` to the form state and sync from ticket data
- Add `Select` dropdown in the grid layout
- On type change: fill description if empty
- Include `ticket_type_id` in the save mutation

### 4. Overview ticket data

- Update the overview tickets query to also fetch `ticket_type_id` and join `helpdesk_ticket_types` for the name
- Show ticket type as a small badge on Kanban cards and in the list view

### Technical details

- Query: `(supabase as any).from("helpdesk_ticket_types").select("id,name").order("name")`
- The `useUpdateHelpdeskTicket` mutation already accepts `ticket_type_id` in its type signature
- The `useCreateHelpdeskTicket` already accepts `ticketTypeId`
- Description auto-fill logic: `if (!currentDescription.trim()) setDescription(typeName)`

### Files to modify
- `src/pages/admin/helpdesk/HelpdeskTicketsPage.tsx` — add type dropdown to create form + edit dialog
- `src/pages/admin/helpdesk/HelpdeskOverviewPage.tsx` — add type dropdown to edit dialog, query types, show on cards/list

