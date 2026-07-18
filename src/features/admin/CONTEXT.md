# Admin Feature Area — Context

## What lives here

All admin-only business logic and UI. Each subfolder is a discrete feature:

| Folder | Purpose |
|---|---|
| `catalog-editor-v2/` | New canvas-based catalog editor (in development, not live route yet) |
| `catalog-publisher-v2/` | Catalog publisher shell and section composition |
| `core/` | Admin shell config — sidebar apps, auth guards, shared admin layout |
| `crm/` | Customer relationship management views |
| `dashboard/` | Admin dashboard metrics and widgets |
| `helpdesk/` | Internal helpdesk / ticket views |
| `leads/` | Lead targeting and CRM seeding |
| `notifications/` | Admin notification system |
| `print/` | Print/PDF output utilities |
| `rx-pricing/` | Rx pricing structure definitions |
| `security/` | Security controls and audit views |

## Hard rules for this area

- All routes under `/admin/**` must be behind `AdminProtectedRoute` — no exceptions.
- The admin sidebar links are driven by `src/features/admin/core/config/apps.ts`. If you add a route, update that file or the link will be dead.
- Do not add business logic to `core/` — it is layout and config only.

## Language

**Customer contact**:
The canonical CRM record for a person or company, including its editable identity, contact details, and customer linkage.
_Avoid_: Portal profile, portal customer record

**Portal account**:
The optional website-login relationship for a customer contact; it is not a second editable customer record.
_Avoid_: Portal contact, duplicate account

**Innovations account number**:
The customer account identifier that connects a customer contact to its Innovations data and online statements.
_Avoid_: Generic account number, portal account number

## Active development focus (2026-05-26)

The catalog editor (`catalog-editor-v2/`) is the current primary work area.
See `STATUS.md` at the project root for known bugs and what's in flight.
