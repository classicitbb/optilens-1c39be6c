ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS interest_intent text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_audience_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_audience_check
      CHECK (audience IS NULL OR audience IN ('professional', 'patient'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_interest_intent_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_interest_intent_check
      CHECK (interest_intent IS NULL OR interest_intent IN ('products', 'knowledge', 'support', 'ordering'));
  END IF;
END $$;
