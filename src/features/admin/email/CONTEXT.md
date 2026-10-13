# Email context

`/admin/email` is the OpticAdmin Email app (launcher entry `email` in `src/features/admin/core/config/apps.ts`). It is a client for company IMAP mailboxes; it stores nothing in Supabase.

Data lives on the OptiLens bridge (optilens-local, branch `feature/email-client`): `lib/email/*` syncs every connected mailbox one after another every 2 minutes (read-only, last 90 days, 500 per folder) into SQL Server schema `mail` and serves `/api/email/*`.

Mailboxes: any staff member connects as many work mailboxes as they use ("Connect a mailbox": address + mailbox password, tested against the mail server, stored DPAPI-encrypted on the bridge in `mail.accounts`). Personal mailboxes open only to `mail.account_members` (owner + people they add); shared mailboxes (orders@, admin-created) open to every admin/operator. Admins can manage any mailbox but do not read a personal one unless added. Mail is on Namecheap cPanel hosting, so there is no admin-wide read access; each mailbox needs its own password once. The browser calls the bridge directly through a Cloudflare tunnel; the address comes from `VITE_EMAIL_BRIDGE_URL` (set in `.env` to https://mail-bridge.classicvisions.net), or the `optilens.emailBridgeUrl` localStorage override set on the page's "not connected" screen. Every request sends the user's Supabase access token; the bridge verifies it with Supabase Auth and requires an `admin` or `operator` role. CORS is limited to the OpticAdmin origins listed in the bridge's `lib/email/routes.js`.

CRM link: emails are never copied into the CRM. The reading pane looks up the sender in `contacts.email` (which can hold a list), and the contact dialog's Email tab (`ContactEmailHistory`) asks the bridge for every message to or from the contact's addresses (`/api/email/history`). Sent mail is appended to the mailbox's Sent folder, so it shows in history after the next sync.

Email HTML renders in a sandboxed iframe (no scripts, no same-origin) with remote images blocked until "Show pictures". Inline `cid:` images are not rewritten yet.

The email workspace fills the admin shell with 5px outer padding. Mailbox and message-list widths have drag and arrow-key separators from the `md` three-column layout upward; the CRM width separator appears in the `xl` side-by-side reading pane. The CRM pane can be hidden and restored from the message heading. These widths and visibility are local component state and reset on reload. On smaller layouts, the existing single-column presentation remains in place.

The ribbon uses a split New mail button plus a grouped menu of existing actions; unsupported Outlook actions are not represented. Folder branches with descendants can be expanded or collapsed without changing the selected mailbox. Clicking an attachment opens a local preview for images, PDFs, and small text/CSV files (up to 1 MiB for text), with Download as a separate action. HTML and Office files are download-only. Preview object URLs are revoked when the preview closes.

Not built yet: drafts, rules, PST import, Iris drafting, rich-text compose. Personal accounts (Gmail, Outlook.com) are meant to open in their own webmail.
