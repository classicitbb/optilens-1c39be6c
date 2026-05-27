# Customer Portal Feature — Context

## What this is

Customer-facing portal logic — account profile, profile completion, and portal
schema validation. Routes live under `/profile/*`.

## Key files

| File | Role |
|---|---|
| `profileCompletion.ts` | Profile completion logic and state |
| `profileSchema.ts` | Zod/validation schema for customer profile |
| `profileCompletion.test.ts` | Unit tests for completion logic |

## Notes

- This is a small, stable feature. Treat it as low-risk unless explicitly tasked here.
- The portal is protected by customer auth (not admin auth) — do not mix guards.
- Keep portal routes under `/profile/**` canonical; no alias duplicates.
