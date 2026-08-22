# Statement document automation

## What is included

Newly discovered, non-void Innovations statements create one durable
`statement_document_jobs` row. The worker renders a Letter PDF, creates the
OneDrive folder path, uploads the PDF, and only then queues the existing
`statement-ready` email. Existing statements are marked `skipped` by the
activation-baseline insert in the migration and are never backfilled.

## Server-side secrets

Set these as Supabase secrets through Lovable or the Supabase project settings.
Never put them in Vite variables, browser code, git, or the local office vault:

- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_TENANT_ID`
- `MS_ONEDRIVE_USER` — `classic.it@outlook`
- `APP_BASE_URL` — the canonical Classic Visions website origin
- `STATEMENT_DOCUMENT_WORKER_SECRET` — a random value used by the worker trigger

The worker currently uses Microsoft Graph application credentials and the
`https://graph.microsoft.com/.default` scope. Confirm the mailbox is a
Microsoft 365 work account before enabling the application flow.

## Manual Microsoft setup

1. Confirm the destination account is the personal OneDrive owned by
   `classic.it@outlook` and that `CLASSIC ACCOUNTS FILES/INNOVATIONS DOCUMENTS`
   is the intended shared folder.
2. In Microsoft Entra, grant the application the least-privileged Graph
   application permission that permits folder creation and file upload to the
   destination drive. `Files.ReadWrite.All` may be required for this account
   shape; an administrator must approve it.
3. Record the tenant ID, client ID, and secret in the managed secret store.
4. Confirm employees who need to edit/delete documents have access to the
   destination folder in OneDrive. The application does not grant employee
   access itself.

## Manual Lovable deployment order

1. Review and apply `supabase/migrations/20260818120000_statement_document_automation.sql`.
2. Set the secrets above.
3. Deploy `statement-document-worker`, `statement-document`, and the updated
   `innovations-sync` and `process-email-queue` functions.
4. Configure a protected scheduled invocation of
   `statement-document-worker` with header
   `x-statement-worker-secret: <STATEMENT_DOCUMENT_WORKER_SECRET>`.
   A five-minute schedule is sufficient; do not start it until the Retail test
   plan is approved.
5. Run `npm run qa:edge-smoke` immediately after any `innovations-sync` deploy.

## Safe Retail test sequence

Use a newly received Retail statement only after the activation baseline is in
place. Verify the job transitions, the Letter PDF contents, year/month folders,
OneDrive item ID/URL, and the single queued email. Repeat the same sync and
confirm no new job or email. Test a void statement, a multi-page statement,
and an induced Graph failure followed by retry before enabling unattended
processing.

## Current operational limitation

Attachment forwarding is implemented in the queue payload and dispatcher, but
the Lovable email provider must accept the `attachments` payload shape used here.
Confirm this with a non-customer preview/test recipient before enabling live
customer email. If the provider rejects attachments, the authenticated PDF link
remains the supported fallback.
