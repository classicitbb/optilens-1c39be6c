-- Helpdesk subtype taxonomy and assistant intake context

ALTER TABLE public.helpdesk_ticket_types
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS operations_lane text NOT NULL DEFAULT 'support';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'helpdesk_ticket_types_operations_lane_check'
      AND conrelid = 'public.helpdesk_ticket_types'::regclass
  ) THEN
    ALTER TABLE public.helpdesk_ticket_types
      ADD CONSTRAINT helpdesk_ticket_types_operations_lane_check
      CHECK (operations_lane IN ('support', 'knowledge_operations'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS helpdesk_ticket_types_tenant_code_key
  ON public.helpdesk_ticket_types(tenant_key, code)
  WHERE code IS NOT NULL;

ALTER TABLE public.helpdesk_tickets
  ADD COLUMN IF NOT EXISTS source_session_id text,
  ADD COLUMN IF NOT EXISTS source_role_mode text,
  ADD COLUMN IF NOT EXISTS source_route_context text,
  ADD COLUMN IF NOT EXISTS source_authentication_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'helpdesk_tickets_source_channel_check'
      AND conrelid = 'public.helpdesk_tickets'::regclass
  ) THEN
    ALTER TABLE public.helpdesk_tickets
      DROP CONSTRAINT helpdesk_tickets_source_channel_check;
  END IF;

  ALTER TABLE public.helpdesk_tickets
    ADD CONSTRAINT helpdesk_tickets_source_channel_check
    CHECK (source_channel IN ('manual', 'email', 'phone', 'chat', 'portal', 'api', 'odoo_sync', 'ai_assistant'));
END $$;

CREATE INDEX IF NOT EXISTS helpdesk_tickets_source_channel_idx
  ON public.helpdesk_tickets(source_channel);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_source_session_idx
  ON public.helpdesk_tickets(source_session_id)
  WHERE source_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_review_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  queue_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  source_signal text,
  source_reference text,
  article_id uuid REFERENCES public.help_articles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_review_queue_items_queue_name_check
    CHECK (queue_name IN ('knowledge_operations', 'repeated_gaps', 'article_improvement')),
  CONSTRAINT helpdesk_ticket_review_queue_items_status_check
    CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed')),
  CONSTRAINT helpdesk_ticket_review_queue_items_ticket_queue_unique
    UNIQUE (ticket_id, queue_name)
);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_review_queue_items_queue_status_idx
  ON public.helpdesk_ticket_review_queue_items(queue_name, status, created_at DESC);

DROP TRIGGER IF EXISTS update_helpdesk_ticket_review_queue_items_updated_at ON public.helpdesk_ticket_review_queue_items;
CREATE TRIGGER update_helpdesk_ticket_review_queue_items_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_review_queue_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.helpdesk_ticket_review_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket review queue items" ON public.helpdesk_ticket_review_queue_items;
CREATE POLICY "Authenticated users can view helpdesk ticket review queue items"
  ON public.helpdesk_ticket_review_queue_items FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can manage helpdesk ticket review queue items" ON public.helpdesk_ticket_review_queue_items;
CREATE POLICY "Editors can manage helpdesk ticket review queue items"
  ON public.helpdesk_ticket_review_queue_items FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

INSERT INTO public.helpdesk_ticket_types (tenant_key, code, name, description, operations_lane, is_active)
VALUES
  ('default', 'knowledge_gap', 'Knowledge gap', 'Missing coverage discovered while serving a question.', 'knowledge_operations', true),
  ('default', 'article_issue', 'Article issue', 'Incorrect, outdated, or low-quality article feedback requiring review.', 'knowledge_operations', true),
  ('default', 'account_specific_request', 'Account-specific request', 'Customer-specific access, account, or profile request.', 'support', true),
  ('default', 'order_job_status_request', 'Order/job status request', 'Status checks for active orders, jobs, or lab work.', 'support', true),
  ('default', 'invoice_statement_request', 'Invoice/statement request', 'Billing documents, statements, and invoice clarification.', 'support', true),
  ('default', 'returns_warranty_support', 'Returns/warranty support', 'Returns, remakes, and warranty handling.', 'support', true),
  ('default', 'general_escalation', 'General escalation', 'Escalated item requiring human handling outside known flows.', 'support', true)
ON CONFLICT (tenant_key, name)
DO UPDATE SET
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  operations_lane = EXCLUDED.operations_lane,
  is_active = true,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
