-- Deduction amounts HR typed over the calculated ones on a draft payslip, keyed by
-- line (nis, paye, rr_levy, item:<recurring item id>). Recalculation keeps them.
ALTER TABLE public.payslips
  ADD COLUMN overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
