# Walk-in payment design review

Layout B was selected for further review. New payment and draft continuation now use a native modal popup over the register; Save draft closes it. Escape and the close button dismiss it, with native focus restoration. Browser checked opening, draft resume/save and Escape. Sample-only behavior remains unchanged.

`WalkInPaymentsPrototype.tsx` and its scoped CSS are a sample-only design bench
on branch `codex/walk-in-payments-design`. Compare compact preparation and
history layouts while separating drafts, requests, receipts and mail delivery.

Run `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`, then open
`/admin/finance/walk-in-payments?design=1&variant=A`. B is register first; C is
task focus. The bottom switcher updates the variant URL. This entry is enabled
only by `import.meta.env.DEV` in `src/main.tsx`; production renders the existing
App and unchanged authorization guards. The bench simulates the shell rather
than mounting the actual admin application.

Names, addresses and amounts are synthetic. State is memory only. Draft
save/resume, filters, receipt details, email retry and the customer handoff are
simulations with no backend, mailbox, gateway, localStorage or API calls.
Contact/expiry controls are illustrative, not persisted. Customer-link access,
email delivery fixes and persistent drafts are separate implementation work
after design selection. No deployment is authorized.
