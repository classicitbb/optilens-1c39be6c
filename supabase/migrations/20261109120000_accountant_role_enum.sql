-- Finance-only staff role. Enum values cannot be used in the transaction that
-- adds them, so the helpers, grants and policies live in the next migration.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
