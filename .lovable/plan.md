

# Fix: Audit Log Not Showing Entries

## Root Cause

The audit log data exists in the database (3 rows confirmed). The RLS policies are correct. The issue is a **stale React Query cache**:

1. The `useAuditLogQuery` hook caches the result with key `["audit_log", filters]`
2. When `logChange()` fires from other pages (Supplies, Reference Data, etc.), it never invalidates the audit log query cache
3. When the user navigates to `/admin/audit`, React Query serves the stale (empty) cached result
4. There is no `refetchOnMount` or `staleTime` configuration to force a refresh

## Fix

Two changes in `src/hooks/useAuditLog.ts`:

1. **Add `staleTime: 0`** to the `useAuditLogQuery` so it always refetches when the component mounts (navigating to the audit page)
2. **Invalidate the audit log queries** after a successful `logChange` so that if the audit page is already mounted, it gets fresh data

### Code changes:

In `useAuditLogQuery`:
- Add `staleTime: 0` and `refetchOnMount: "always"` to the query options

In `useAuditLog`:
- Import `useQueryClient` from tanstack
- After a successful `logChange` mutation, call `queryClient.invalidateQueries({ queryKey: ["audit_log"] })`

## Files

| File | Action |
|------|--------|
| `src/hooks/useAuditLog.ts` | Add query invalidation on mutation success; add staleTime to query |

