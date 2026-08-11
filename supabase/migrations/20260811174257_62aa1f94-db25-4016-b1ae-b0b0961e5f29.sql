ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS interest_intent text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;