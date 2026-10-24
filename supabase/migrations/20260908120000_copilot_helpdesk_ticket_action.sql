-- Let the Portal Copilot open helpdesk tickets as a recorded action.
--
-- The ticket itself is created immediately (internal, no customer email); the
-- copilot_action row exists so the chat can link to the ticket and the audit
-- trail shows who asked for it.

ALTER TABLE public.copilot_actions DROP CONSTRAINT IF EXISTS copilot_actions_action_type_check;
ALTER TABLE public.copilot_actions
  ADD CONSTRAINT copilot_actions_action_type_check
  CHECK (action_type IN ('send_portal_invite', 'create_followup_task', 'send_docstudio_email', 'apply_contact_enrichment', 'create_support_ticket'));

-- copilot_runs.workflow is a foreign key to copilot_workflow_settings; without
-- this row the ticket run fails with a raw FK error. No email template applies.
INSERT INTO public.copilot_workflow_settings
  (workflow, provider, email_template_key, email_template_name, email_subject_pattern)
VALUES
  ('helpdesk_ticket', 'claude', 'not-applicable', 'Not applicable', 'Not applicable')
ON CONFLICT (workflow) DO NOTHING;

NOTIFY pgrst, 'reload schema';
