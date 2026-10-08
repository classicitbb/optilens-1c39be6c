# Email context

`/admin/email` is the OpticAdmin Email app (launcher entry `email` in `src/features/admin/core/config/apps.ts`). It is a client for company IMAP mailboxes; it stores nothing in Supabase.

Data lives on the OptiLens bridge (optilens-local, branch `feature/email-client`): `lib/email/*` syncs every connected mailbox one after another every 2 minutes (read-only, last 90 days, 500 per folder) into SQL Server schema `mail` and serves `/api/email/*`.

Mailboxes: any staff member connects as many work mailboxes as they use ("Connect a mailbox": address + mailbox password, tested against the mail server, stored DPAPI-encrypted on the bridge in `mail.accounts`). Personal mailboxes open only to `mail.account_members` (owner + people they add); shared mailboxes (orders@, admin-created) open to every admin/operator. Admins can manage any mailbox but do not read a personal one unless added. Mail is on Namecheap cPanel hosting, so there is no admin-wide read access; each mailbox needs its own password once. The browser calls the bridge directly through a Cloudflare tunnel; the address comes from `VITE_EMAIL_BRIDGE_URL` (set in `.env` to https://mail-bridge.classicvisions.net), or the `optilens.emailBridgeUrl` localStorage override set on the page's "not connected" screen. Every request sends the user's Supabase access token; the bridge verifies it with Supabase Auth and requires an `admin` or `operator` role. CORS is limited to the OpticAdmin origins listed in the bridge's `lib/email/routes.js`.

CRM link: emails are never copied into the CRM. The reading pane looks up the sender in `contacts.email` (which can hold a list), and the contact dialog's Email tab (`ContactEmailHistory`) asks the bridge for every message to or from the contact's addresses (`/api/email/history`). Sent mail is appended to the mailbox's Sent folder, so it shows in history after the next sync.

Email HTML renders in a sandboxed iframe (no scripts, no same-origin) with remote images blocked until "Show pictures". Inline `cid:` images are not rewritten yet.

Not built yet: drafts, rules, PST import, Iris drafting, rich-text compose. Personal accounts (Gmail, Outlook.com) are meant to open in their own webmail.
