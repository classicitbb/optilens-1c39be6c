-- Add the first connected Copilot capability without creating a parallel CRM.
-- Suggestions remain ordinary Copilot actions; only an approved action creates
-- an activity in the existing CRM activities table.

INSERT INTO public.copilot_workflow_settings (
  workflow,
  provider,
  email_template_key,
  email_template_name,
  email_subject_pattern
) VALUES (
  'crm_opportunity_scan',
  'claude',
  'not-applicable',
  'Not applicable',
  'Not applicable'
) ON CONFLICT (workflow) DO NOTHING;

NOTIFY pgrst, 'reload schema';
