# Statement document automation

## What is included

Newly discovered, non-void Innovations statements create one durable
`statement_document_jobs` row. The worker renders a Letter PDF, stores it in
the private website-managed `statement-pdfs` bucket, and prepares the existing
`statement-ready` email for staff approval. Approval is recorded by
`statement-document-approve`; the protected worker then sends the email. The
first release must use `STATEMENT_EMAIL_MODE=approval`. Only after the Retail
approval workflow is proven may an administrator intentionally change that
server-side setting to `automatic`.

## Server-side secrets

Set these as Supabase secrets through Lovable or the Supabase project settings.
Never put them in Vite variables, browser code, git, or the local office vault:

- `APP_BASE_URL` — the canonical Classic Visions website origin
- `STATEMENT_DOCUMENT_WORKER_SECRET` — a random value used by the worker trigger
- `STATEMENT_EMAIL_MODE` — `approval` for the controlled rollout; `automatic` is a later, explicitly approved mode

## Manual Lovable deployment order

1. Review and apply `supabase/migrations/20260818120000_statement_document_automation.sql` and `supabase/migrations/20261002153000_statement_website_storage.sql`.
2. Set the secrets above.
3. Deploy `statement-document-worker`, `statement-document`,
   `statement-document-approve`, `statement-document-prepare-period`, and
   the updated `innovations-sync` function.
4. Configure a protected scheduled invocation of
   `statement-document-worker` with header
   `x-statement-worker-secret: <STATEMENT_DOCUMENT_WORKER_SECRET>`.
   A five-minute schedule is sufficient; do not start it until the Retail test
   plan is approved.
5. Run `npm run qa:edge-smoke` immediately after any Edge Function deploy.

## Safe Retail test sequence

Use a newly received Retail statement only after the activation baseline is in
place. Verify the job transitions, the Letter PDF contents, private website
storage path, and the single queued email. Repeat the same sync and
confirm no new job or email. Test a void statement, a multi-page statement,
and an induced storage failure followed by retry before enabling unattended
processing. The worker selects the oldest statement period first so older
aging work is handled before newer statement jobs.

## September 2026 rehearsal (one-time, no-send)

The normal activation baseline intentionally ignores statements that already
exist. For the pre-release rehearsal only, an administrator or operator may
prepare the September period with the protected
`statement-document-prepare-period` function. This is an explicit exception
for testing and does not change the October discovery baseline.

Run the dry-run request first and review the returned statement IDs:

```json
POST /functions/v1/statement-document-prepare-period
{
  "rehearsal": true,
  "from_date": "2026-09-01",
  "to_date": "2026-09-30",
  "dry_run": true
}
```

Only after review, repeat the request with `dry_run: false`. It creates missing
pending jobs and safely reopens only skipped or failed jobs that have no
website storage path. Uploaded, approved, and sent jobs are preserved, and void
statements are excluded. No request to this function sends email.

Keep `STATEMENT_EMAIL_MODE=approval` and do not enable the scheduled worker
until the dry-run result is reviewed. Once the worker is intentionally run, it
may generate and store the PDFs; each remains `awaiting_approval` until a
staff member approves it. The September rehearsal must not be used to send
customer email without a separate named-recipient approval. After rehearsal,
leave the activation baseline in place so only October statements first
discovered by the Innovations sync enter the normal workflow.

## Current operational limitation

Attachment forwarding is implemented in the queue payload and dispatcher, but
the Lovable email provider must accept the `attachments` payload shape used here.
Confirm this with a non-customer preview/test recipient before enabling live
customer email. If the provider rejects attachments, the authenticated PDF link
remains the supported fallback.
