-- New staff role for the office administrator who holds the HR assignment.
-- Enum values cannot be used in the transaction that adds them, so the role's
-- grants and helper changes live in the next migration.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'office_admin';
