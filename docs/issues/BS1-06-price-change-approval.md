# BS1-06 · Price-match proposals + owner/manager approval

**Depends on:** BS1-04

## Context (locked decision)
Staff PROPOSE a price match; **owner/manager approval is required** to apply it (which forks the account).
Log who/when/why. This is a normal sales motion, not an exception.

## Task
1. Migration: `price_change_proposals`
   - customer_id, item_ref, current_price, proposed_price, competitor_ref/reason,
     computed_margin_at_proposal, status (pending|approved|rejected|withdrawn),
     proposed_by, decided_by, decided_at, timestamps.
2. Guardrail: proposals below the 15% floor margin are flagged `below_floor=true` in the record and visually in review.
3. RPCs: `propose_price_change`, `approve_price_change` (admin/owner role only — applies the fork line atomically), `reject_price_change`.
4. Notification hook: pending proposals surface in the admin cockpit (badge/queue). Reuse existing notifications infra (20260331 portal_presence_notifications migration).
5. Reverts (BS1-04) also route through proposals when initiated by non-owner staff.

## Acceptance
- Non-owner staff cannot mutate customer prices directly (RLS enforced), only propose.
- Approval applies fork line + audit entry in one transaction.
