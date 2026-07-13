## Verify edge functions and SQL migrations are deployed

Confirm the recent backend changes (honeypot anti-bot on homepage contact form + SUPA_security_definer_view fix) are live.

### Steps

1. **Check migration status**
   - Run `supabase--read_query` to verify `customer_payment_profile_public` view has `security_invoker = true`.
   - Verify any `contact_inquiries` schema changes (honeypot-related columns, if added) are present.

2. **Redeploy edge functions**
   - `supabase--deploy_edge_functions` for `contact-inquiry` (updated for honeypot handling) and `innovations-sync` (per earlier request).

3. **Smoke test**
   - `supabase--curl_edge_functions` a benign call to `contact-inquiry` to confirm it responds 200 / expected shape.
   - Check `supabase--edge_function_logs` for both functions to confirm clean boot.

4. **Report**
   - List each function's deploy status, migration verification result, and any warnings.

No code edits — verification and redeploy only.
