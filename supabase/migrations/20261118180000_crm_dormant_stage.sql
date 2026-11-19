ALTER TABLE public.contacts
  DROP CONSTRAINT contacts_stage_valid,
  ADD CONSTRAINT contacts_stage_valid CHECK (
    stage IS NULL OR stage IN (
      'target','outreach','engaged','qualifying','presenting',
      'trial_offer','trial_active','converting','customer','nurture','dormant'
    )
  );
