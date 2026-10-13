# Finish the Email connection in preview

## What I found (tested with your signed-in session)
- Through the cloud relay, the office mail server answers correctly for the preview address: your mailboxes (Orders, Russell), Orders folders (Inbox 360 messages) and inbox messages all load.
- Remaining gaps that can still show "can't reach the mail bridge":
  1. The relay refuses some addresses the app is opened from: the in-sandbox test address (localhost:8080, which also blocks me from verifying in a real browser) and your custom domain `qbo.classicvisions.net`. Other preview variants of this project's address (e.g. branch/draft previews) are also not on the list.
  2. The app only uses the relay if a startup setting happens to be present; if it is missing, Email shows "not connected" even though the relay works.

## Changes
1. Relay (email-bridge only, other functions untouched): additionally accept `http://localhost:8080`, `https://qbo.classicvisions.net`, and any preview address belonging to this project (`*--d568bffd-cdad-4066-b271-1e09c9a376d6.lovable.app` and `d568bffd-...lovableproject.com` variants). Exact-match/project-scoped only, no open wildcard.
2. Email app: always route through the relay unless a custom bridge address is saved (remove the dependency on the startup setting).
3. Redeploy only email-bridge, run the standard function health check.
4. Verify in a real signed-in browser at 1539x908: Email page shows mailboxes, folders and inbox messages, opening a message works. No mail sent.

## Technical details
- `supabase/functions/email-bridge/index.ts`: wrap `createCorsPolicy()` with an extra origin check (exact set + regex for this project id's lovable.app/lovableproject.com hosts) used for preflight, reject, and response headers.
- `src/lib/emailBridge.ts` `getEmailBridgeUrl`: `override || proxy`.
- Then `npm run qa:edge-smoke` and Playwright check.
