-- Helpdesk SLA policy definitions and runtime tracking

CREATE TYPE public.helpdesk_sla_status AS ENUM ('in_progress', 'reached', 'failed');

CREATE TABLE IF NOT EXISTS public.helpdesk_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  team_id uuid NOT NULL REFERENCES public.helpdesk_teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority_filter integer NULL,
  ticket_type_ids uuid[] NULL,
  tag_ids uuid[] NULL,
  target_stage_id uuid NOT NULL REFERENCES public.helpdesk_ticket_stages(id) ON DELETE CASCADE,
  target_hours numeric(10,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_sla_policies_tenant_team_name_key UNIQUE (tenant_key, team_id, name),
  CONSTRAINT helpdesk_sla_policies_priority_filter_check CHECK (priority_filter IS NULL OR priority_filter BETWEEN 0 AND 5),
  CONSTRAINT helpdesk_sla_policies_target_hours_check CHECK (target_hours > 0)
);

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_sla_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.helpdesk_sla_policies(id) ON DELETE CASCADE,
  deadline_at timestamptz NOT NULL,
  reached_at timestamptz NULL,
  status public.helpdesk_sla_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_sla_status_ticket_policy_key UNIQUE (ticket_id, policy_id)
);

CREATE INDEX IF NOT EXISTS helpdesk_sla_policies_team_active_idx
  ON public.helpdesk_sla_policies(team_id, active);
CREATE INDEX IF NOT EXISTS helpdesk_ticket_sla_status_ticket_status_idx
  ON public.helpdesk_ticket_sla_status(ticket_id, status);
CREATE INDEX IF NOT EXISTS helpdesk_ticket_sla_status_deadline_idx
  ON public.helpdesk_ticket_sla_status(deadline_at)
  WHERE status = 'in_progress';

DROP TRIGGER IF EXISTS update_helpdesk_sla_policies_updated_at ON public.helpdesk_sla_policies;
CREATE TRIGGER update_helpdesk_sla_policies_updated_at
  BEFORE UPDATE ON public.helpdesk_sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_helpdesk_ticket_sla_status_updated_at ON public.helpdesk_ticket_sla_status;
CREATE TRIGGER update_helpdesk_ticket_sla_status_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_sla_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.helpdesk_compute_applicable_sla_policies(
  p_ticket_id uuid
)
RETURNS TABLE (
  policy_id uuid,
  target_stage_id uuid,
  target_hours numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ticket AS (
    SELECT t.*
    FROM public.helpdesk_tickets t
    WHERE t.id = p_ticket_id
  )
  SELECT
    p.id AS policy_id,
    p.target_stage_id,
    p.target_hours
  FROM ticket t
  JOIN public.helpdesk_sla_policies p
    ON p.team_id = t.team_id
   AND p.tenant_key = t.tenant_key
   AND p.active = true
  WHERE (p.priority_filter IS NULL OR p.priority_filter = t.priority)
    AND (
      p.ticket_type_ids IS NULL
      OR cardinality(p.ticket_type_ids) = 0
      OR t.ticket_type_id = ANY (p.ticket_type_ids)
    )
    AND (
      p.tag_ids IS NULL
      OR cardinality(p.tag_ids) = 0
      OR EXISTS (
        SELECT 1
        FROM public.helpdesk_ticket_tag_rel tr
        WHERE tr.ticket_id = t.id
          AND tr.tag_id = ANY (p.tag_ids)
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.helpdesk_recompute_ticket_sla_deadlines(
  p_ticket_id uuid,
  p_reference_at timestamptz DEFAULT now()
)
RETURNS TABLE (
  policy_id uuid,
  deadline_at timestamptz,
  status public.helpdesk_sla_status
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.helpdesk_ticket_sla_status s
  WHERE s.ticket_id = p_ticket_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.helpdesk_compute_applicable_sla_policies(p_ticket_id) ap
      WHERE ap.policy_id = s.policy_id
    );

  INSERT INTO public.helpdesk_ticket_sla_status (
    ticket_id,
    policy_id,
    deadline_at,
    reached_at,
    status
  )
  SELECT
    p_ticket_id,
    ap.policy_id,
    p_reference_at + make_interval(secs => (ap.target_hours * 3600)::integer),
    NULL,
    'in_progress'::public.helpdesk_sla_status
  FROM public.helpdesk_compute_applicable_sla_policies(p_ticket_id) ap
  ON CONFLICT (ticket_id, policy_id)
  DO UPDATE SET
    deadline_at = EXCLUDED.deadline_at,
    reached_at = NULL,
    status = 'in_progress'::public.helpdesk_sla_status,
    updated_at = now();

  RETURN QUERY
  SELECT s.policy_id, s.deadline_at, s.status
  FROM public.helpdesk_ticket_sla_status s
  WHERE s.ticket_id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.helpdesk_update_ticket_sla_progress(
  p_ticket_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  policy_id uuid,
  status public.helpdesk_sla_status,
  deadline_at timestamptz,
  reached_at timestamptz
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_stage_id uuid;
BEGIN
  SELECT t.stage_id
  INTO v_stage_id
  FROM public.helpdesk_tickets t
  WHERE t.id = p_ticket_id;

  IF v_stage_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.helpdesk_ticket_sla_status s
  SET
    status = CASE
      WHEN p.target_stage_id = v_stage_id THEN 'reached'::public.helpdesk_sla_status
      WHEN s.deadline_at < p_now THEN 'failed'::public.helpdesk_sla_status
      ELSE s.status
    END,
    reached_at = CASE
      WHEN p.target_stage_id = v_stage_id THEN COALESCE(s.reached_at, p_now)
      ELSE s.reached_at
    END,
    updated_at = now()
  FROM public.helpdesk_sla_policies p
  WHERE s.policy_id = p.id
    AND s.ticket_id = p_ticket_id
    AND s.status = 'in_progress';

  RETURN QUERY
  SELECT s.policy_id, s.status, s.deadline_at, s.reached_at
  FROM public.helpdesk_ticket_sla_status s
  WHERE s.ticket_id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.helpdesk_run_overdue_sla_job(
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  processed_tickets integer,
  failed_slas integer,
  reached_slas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  v_processed_tickets integer := 0;
  v_failed_before integer := 0;
  v_reached_before integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can run SLA overdue job manually.';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_failed_before
  FROM public.helpdesk_ticket_sla_status s
  WHERE s.status = 'failed';

  SELECT COUNT(*)::integer
  INTO v_reached_before
  FROM public.helpdesk_ticket_sla_status s
  WHERE s.status = 'reached';

  FOR v_ticket_id IN
    SELECT DISTINCT s.ticket_id
    FROM public.helpdesk_ticket_sla_status s
    WHERE s.status = 'in_progress'
      AND s.deadline_at <= now()
    ORDER BY s.ticket_id
    LIMIT GREATEST(1, COALESCE(p_limit, 500))
  LOOP
    PERFORM public.helpdesk_update_ticket_sla_progress(v_ticket_id, now());
    v_processed_tickets := v_processed_tickets + 1;
  END LOOP;

  RETURN QUERY
  SELECT
    v_processed_tickets,
    GREATEST(
      (
        SELECT COUNT(*)::integer
        FROM public.helpdesk_ticket_sla_status s
        WHERE s.status = 'failed'
      ) - v_failed_before,
      0
    ) AS failed_slas,
    GREATEST(
      (
        SELECT COUNT(*)::integer
        FROM public.helpdesk_ticket_sla_status s
        WHERE s.status = 'reached'
      ) - v_reached_before,
      0
    ) AS reached_slas;
END;
$$;

CREATE OR REPLACE FUNCTION public.helpdesk_handle_ticket_sla_recompute()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.helpdesk_recompute_ticket_sla_deadlines(NEW.id, COALESCE(NEW.opened_at, NEW.created_at, now()));
    PERFORM public.helpdesk_update_ticket_sla_progress(NEW.id, now());
    RETURN NEW;
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.ticket_type_id IS DISTINCT FROM OLD.ticket_type_id
     OR NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    PERFORM public.helpdesk_recompute_ticket_sla_deadlines(NEW.id, now());
    PERFORM public.helpdesk_update_ticket_sla_progress(NEW.id, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_ticket_sla_recompute_trigger ON public.helpdesk_tickets;
CREATE TRIGGER helpdesk_ticket_sla_recompute_trigger
  AFTER INSERT OR UPDATE OF team_id, priority, ticket_type_id, stage_id
  ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.helpdesk_handle_ticket_sla_recompute();

CREATE OR REPLACE FUNCTION public.helpdesk_handle_ticket_tag_sla_recompute()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
BEGIN
  v_ticket_id := COALESCE(NEW.ticket_id, OLD.ticket_id);
  PERFORM public.helpdesk_recompute_ticket_sla_deadlines(v_ticket_id, now());
  PERFORM public.helpdesk_update_ticket_sla_progress(v_ticket_id, now());
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_ticket_tag_sla_recompute_trigger ON public.helpdesk_ticket_tag_rel;
CREATE TRIGGER helpdesk_ticket_tag_sla_recompute_trigger
  AFTER INSERT OR DELETE
  ON public.helpdesk_ticket_tag_rel
  FOR EACH ROW
  EXECUTE FUNCTION public.helpdesk_handle_ticket_tag_sla_recompute();

GRANT EXECUTE ON FUNCTION public.helpdesk_compute_applicable_sla_policies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helpdesk_recompute_ticket_sla_deadlines(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helpdesk_update_ticket_sla_progress(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helpdesk_run_overdue_sla_job(integer) TO authenticated;
