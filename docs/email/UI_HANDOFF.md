# Email UI handoff: bring /admin/email up to the Outlook prototype

## The template

The user loved this prototype. Treat it as the specification for layout and behaviour:

- Live artifact: https://claude.ai/artifact/9hKjxPH4jUJkbFdqJMsbcq (version 3)
- Source copy in this repo: `docs/email/outlook-prototype.html` (open it in the browser pane and click through it before designing anything)

**Visual rule (user decision, 2026-10-08): use Outlook's layout in OpticAdmin's own colours.** Take structure, ribbons, menus, density and interactions from the prototype. Take every colour, font and radius from the admin theme (`--admin-*` / `--ws-*` tokens in `src/styles/workspace.css`, shadcn components, `AdminLayout`). Do not copy the prototype's Outlook black/blue palette or Segoe UI.

## What exists today (merged on branches, PRs open)

- Web: classicitbb/optilens-1c39be6c PR #611, branch `feature/admin-email`. Read `src/features/admin/email/CONTEXT.md` first.
  - `src/pages/admin/email/EmailPage.tsx`: one-row Home toolbar, mailbox/folder pane, message list, reading pane, CRM panel.
  - `src/features/admin/email/`: `useEmail.ts` (React Query hooks), `ComposeDialog.tsx` (plain-text dialog), `MailboxDialogs.tsx` (connect/share/disconnect), `CrmContactPanel.tsx`, `ContactEmailHistory.tsx` (contact dialog Email tab), `EmailBody.tsx` (sandboxed iframe), `format.ts`.
  - `src/lib/emailBridge.ts`: client for the bridge API.
- Bridge: classicitbb/optilens-local PR #62, branch `feature/email-client`, already running on host 192.168.254.7. `lib/email/*`, migrations 050/051 (schema `mail`). API at https://mail-bridge.classicvisions.net/api/email/* (Cloudflare tunnel, Supabase-session auth, admin/operator only).
- Multi-mailbox: ~15 staff; each can connect any number of work mailboxes; shared mailboxes (orders@) visible to all staff; personal ones to owner + people they add.

## Gap to close (prototype → product)

| Prototype element | Today | Build |
|---|---|---|
| Ribbon tabs ☰ File / Home / View / Help, with Outlook's icon row (chat, calendar, move-to-folder, bell, settings, tips) on the same line as the tabs | Single toolbar row | Tabbed ribbon component; icon row right-aligned on the tab line |
| File menu: Account info, Save as, Print, Open and export, Settings | None | Account info → mailbox manage dialog; Open and export → PST import (bridge work, later); Save as → .eml download (needs bridge endpoint) |
| Home: New mail split button (Mail, Mail from template, Event, Group), Delete▾, Archive, Report▾, Flag/Unflag▾, Pin/Unpin, Snooze▾, Rules, Rule from a sentence, ⋯ | New mail, reply, archive, delete, flag, mark unread | Split button + dropdowns; Pin/Snooze/Report/Rules need bridge support or are stubbed with an honest "coming soon" |
| View: View settings, Messages▾, Zoom, Dark reading pane, Sync, Layout▾, Folder pane▾, Density▾ | None | Mostly client-side, persisted per user in localStorage |
| Help: Send feedback, Annotate this page | None | Feedback → existing Feature Board / helpdesk path; annotate overlay as in prototype |
| Iris button far right of the ribbon | None | Opens existing Iris/Copilot (`AdminCopilotAssistant`, `CompanionAssistant`) scoped to the open email |
| Focused / Other tabs | None | Client-side split (e.g. CRM-matched senders = Focused) until real classification exists |
| Full-window compose with Message / Insert / Format text / Options ribbon, From selector, To button, "Help me write with Iris", Log to CRM toggle | Plain-text dialog with From selector | Rich-text compose (bridge already accepts `text`; add `html`) |
| Attachment preview with "Save to customer file" | Download only | Preview modal; save into the customer's documents |
| Left rail: Mail / Calendar / Contacts | Launcher only | Rail links into existing apps (see below) |

## Hidden details and connections to work out (the next chat should expand these)

- **Calendar.** The prototype's "Schedule in calendar" and "New mail ▸ Event" assume the existing tasks calendar. Find where it lives (`src/pages/admin/crm/CrmActivitiesPage.tsx` is the CRM Activities page; check for a calendar view and how activities store dates), and design deep links such as `/admin/crm/activities?create=1&contact=<id>&subject=...` so an email becomes a dated task or event. Decide whether invites (ICS) are in scope.
- **Contacts.** Reading pane already matches the sender to `contacts.email` (a list field, see `src/lib/contactEmails.ts`). Still to design: "Add as contact" prefilled from the email; showing linked customer account, balance, open orders and quotes (sources exist: orders, statements, quotes; see the MCP tools list in the session for the data shapes); Email tab linking back into the message.
- **Tasks.** "Create task" currently opens Activities with no prefill. Carry subject, contact and a link back to the email.
- **Helpdesk.** "Open support ticket" from an email: helpdesk tickets already exist; map sender → customer and attach the message.
- **Rx orders.** Orders mail (RX-##### in subjects, supplier folders like SATISLOH SHIPMENTS) should link to the Rx order/shipment pages. The bridge already has a supplier-mail automation that reads orders@ and moves processed mail at 08:10 daily; Email must not fight it.
- **Templates.** "Mail from template" should reuse Doc Studio email templates if available.
- **Iris.** Draft replies grounded in CRM/order data; rules from a sentence (prototype shows IF/THEN preview and JSON). Bridge has no rules engine yet.
- **Notifications.** Unread counts in the launcher tile and the top-bar bell.
- **Mobile.** Prototype collapses to list → reading pane at phone width; keep that.
- **Permissions.** Viewers (role `viewer`) can see the launcher tile but the bridge refuses them; show a clear message.

## Constraints

- Follow `AGENTS.md`, `CLAUDE.md` and `STATUS.md`; validate with `tsc -p tsconfig.app.json`, lint, tests, build, `npm run qa:copilot-facts` after route changes.
- Bridge edits happen only in the host checkout over SSH (see optilens-local `docs/REMOTE_AGENT_OPERATIONS.md`), never in `C:\DEV\optilens-local`.
- Codex also works in this repo; do not commit files you didn't change.
- Never send real email for testing without the user naming the recipient.
