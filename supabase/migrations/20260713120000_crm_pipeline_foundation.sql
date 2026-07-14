-- CRM Pipeline Foundation (Phase 1 of docs/CRM_BUILD_PLAN.md)
-- One journey per contact: pipeline (market motion) + stage (shared 9-stage vocabulary + nurture).
-- Additive only: legacy contacts.pipeline_stage / contacts.status stay until Phase 2 UI ships.

-- 1. Pipeline lookup (new markets = new row, no migration)
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.crm_pipelines (key, label, is_active) VALUES
  ('opticals', 'Opticals', true),
  ('department_stores', 'Department Stores', false),
  ('labs', 'Labs', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select crm pipelines"
  ON public.crm_pipelines FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can manage crm pipelines"
  ON public.crm_pipelines FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

-- 2. Contacts: journey fields. pipeline NULL = plain contact (never followed up).
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS pipeline text NULL REFERENCES public.crm_pipelines(key),
  ADD COLUMN IF NOT EXISTS stage text NULL,
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz NULL;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_stage_valid CHECK (
    stage IS NULL OR stage IN (
      'target','outreach','engaged','qualifying','presenting',
      'trial_offer','trial_active','converting','customer','nurture'
    )
  ),
  ADD CONSTRAINT contacts_stage_requires_pipeline CHECK (
    (pipeline IS NULL AND stage IS NULL) OR (pipeline IS NOT NULL AND stage IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS contacts_pipeline_stage_idx ON public.contacts(pipeline, stage) WHERE pipeline IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_next_action_at_idx ON public.contacts(next_action_at) WHERE next_action_at IS NOT NULL;

-- 3. Order activity feed (pushed by optilens-local from Innovations — CRM_BUILD_PLAN Spec A)
CREATE TABLE IF NOT EXISTS public.order_activity (
  innovations_customer_id bigint PRIMARY KEY,
  contact_id uuid NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  last_order_date date NULL,
  orders_last_7_days integer NOT NULL DEFAULT 0,
  orders_last_30_days integer NOT NULL DEFAULT 0,
  orders_last_90_days integer NOT NULL DEFAULT 0,
  avg_gap_days numeric NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_activity_contact_id_idx ON public.order_activity(contact_id);
CREATE INDEX IF NOT EXISTS order_activity_last_order_date_idx ON public.order_activity(last_order_date);

ALTER TABLE public.order_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select order activity"
  ON public.order_activity FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can manage order activity"
  ON public.order_activity FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

-- 4. Cadences (per-pipeline outreach sequences)
CREATE TABLE IF NOT EXISTS public.cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pipeline text NOT NULL REFERENCES public.crm_pipelines(key),
  target_stage text NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cadence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id uuid NOT NULL REFERENCES public.cadences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','call','visit')),
  delay_days integer NOT NULL DEFAULT 0,
  subject text NULL,
  body_template text NULL,
  UNIQUE (cadence_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.cadence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  cadence_id uuid NOT NULL REFERENCES public.cadences(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','exited')),
  current_step integer NOT NULL DEFAULT 0,
  next_step_due_at timestamptz NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS cadence_enrollments_one_active_idx
  ON public.cadence_enrollments(contact_id, cadence_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS cadence_enrollments_due_idx
  ON public.cadence_enrollments(next_step_due_at) WHERE status = 'active';

ALTER TABLE public.cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select cadences"
  ON public.cadences FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can manage cadences"
  ON public.cadences FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select cadence steps"
  ON public.cadence_steps FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can manage cadence steps"
  ON public.cadence_steps FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select cadence enrollments"
  ON public.cadence_enrollments FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can manage cadence enrollments"
  ON public.cadence_enrollments FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

-- 5. Outreach outbox (AI drafts awaiting human approval; the supervision gate)
CREATE TABLE IF NOT EXISTS public.outreach_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  enrollment_id uuid NULL REFERENCES public.cadence_enrollments(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  subject text NULL,
  body text NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','rejected','failed')),
  generated_by text NOT NULL DEFAULT 'ai',
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL,
  sent_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS outreach_outbox_status_idx ON public.outreach_outbox(status);
CREATE INDEX IF NOT EXISTS outreach_outbox_contact_id_idx ON public.outreach_outbox(contact_id);

ALTER TABLE public.outreach_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select outreach outbox"
  ON public.outreach_outbox FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can manage outreach outbox"
  ON public.outreach_outbox FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

-- 6. Customer order health (retention alarm read model)
-- flag: quiet vs own baseline (avg_gap_days x 3, min 5 days) or 14-day universal flag
-- alarm: 21-day universal ceiling -> personal check-in task
CREATE OR REPLACE VIEW public.customer_order_health AS
SELECT
  c.id AS contact_id,
  c.name,
  c.pipeline,
  c.stage,
  oa.last_order_date,
  (CURRENT_DATE - oa.last_order_date) AS quiet_days,
  oa.avg_gap_days,
  oa.orders_last_30_days,
  CASE
    WHEN oa.last_order_date IS NULL THEN 'unknown'
    WHEN (CURRENT_DATE - oa.last_order_date) >= 21 THEN 'alarm'
    WHEN (CURRENT_DATE - oa.last_order_date) >= 14 THEN 'flag'
    WHEN oa.avg_gap_days IS NOT NULL
      AND (CURRENT_DATE - oa.last_order_date) >= GREATEST(CEIL(oa.avg_gap_days * 3), 5)
      THEN 'flag'
    ELSE 'ok'
  END AS health
FROM public.contacts c
JOIN public.order_activity oa ON oa.contact_id = c.id
WHERE c.stage = 'customer';

-- 7. Conservative backfill (user curates the rest via Phase 2 UI)
-- Active customers -> opticals/customer
UPDATE public.contacts
SET pipeline = 'opticals', stage = 'customer', stage_entered_at = now()
WHERE pipeline IS NULL
  AND (is_customer = true OR pipeline_stage = 'Active Customer')
  AND is_archived = false;

-- Old explicit pipeline labels -> nearest new stage
UPDATE public.contacts
SET pipeline = 'opticals',
    stage = CASE pipeline_stage
      WHEN 'Qualified' THEN 'qualifying'
      WHEN 'Prospect' THEN 'engaged'
      WHEN 'Inactive' THEN 'nurture'
    END,
    stage_entered_at = now()
WHERE pipeline IS NULL
  AND pipeline_stage IN ('Qualified', 'Prospect', 'Inactive')
  AND is_archived = false;

-- Lead-machinery entrants (lead finder / leads pages wrote status + lead_score)
UPDATE public.contacts
SET pipeline = 'opticals',
    stage = CASE status
      WHEN 'lead' THEN 'target'
      WHEN 'contacted' THEN 'outreach'
      WHEN 'meeting' THEN 'engaged'
      WHEN 'proposal' THEN 'presenting'
      ELSE 'target'
    END,
    stage_entered_at = now()
WHERE pipeline IS NULL
  AND status IN ('lead', 'contacted', 'meeting', 'proposal')
  AND lead_score > 0
  AND is_archived = false;

-- Link order_activity rows to contacts as they arrive (helper for the sync handler)
CREATE OR REPLACE FUNCTION public.link_order_activity_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.contact_id IS NULL THEN
    SELECT id INTO NEW.contact_id
    FROM public.contacts
    WHERE innovations_contact_id = NEW.innovations_customer_id
       OR linked_customer_id = NEW.innovations_customer_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_activity_link_contact ON public.order_activity;
CREATE TRIGGER order_activity_link_contact
  BEFORE INSERT OR UPDATE ON public.order_activity
  FOR EACH ROW EXECUTE FUNCTION public.link_order_activity_contact();
