-- HR departments and multiple managers.
--
-- departments become a real list (with a parent and a head) instead of free text, and a person can
-- have several managers: a line manager plus dotted-line or functional ones, optionally tied to
-- one of the positions they hold. employees.manager_id, employees.department and
-- positions.department stay as read-only summaries kept in step by triggers, so payroll, the
-- People list and the self-service page keep working unchanged.

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  code text,
  description text,
  parent_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL
    CHECK (parent_department_id IS DISTINCT FROM id),
  head_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX departments_name_idx ON public.departments (lower(name));
CREATE INDEX departments_parent_idx ON public.departments(parent_department_id);

-- Backfill from the names already typed on employees and positions.
INSERT INTO public.departments (name)
SELECT DISTINCT ON (lower(btrim(d))) btrim(d)
FROM (SELECT department AS d FROM public.employees UNION ALL SELECT department FROM public.positions) names
WHERE btrim(coalesce(d, '')) <> ''
ORDER BY lower(btrim(d)), btrim(d);

ALTER TABLE public.employees ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.positions ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE RESTRICT;

UPDATE public.employees e SET department_id = d.id
FROM public.departments d WHERE lower(btrim(e.department)) = lower(d.name);

UPDATE public.positions p SET department_id = d.id
FROM public.departments d WHERE lower(btrim(p.department)) = lower(d.name);

-- A position must sit in a department; park any with a blank one.
INSERT INTO public.departments (name)
SELECT 'Unassigned' WHERE EXISTS (SELECT 1 FROM public.positions WHERE department_id IS NULL)
ON CONFLICT DO NOTHING;
UPDATE public.positions SET department_id = (SELECT id FROM public.departments WHERE lower(name) = 'unassigned')
WHERE department_id IS NULL;
ALTER TABLE public.positions ALTER COLUMN department_id SET NOT NULL;

CREATE INDEX employees_department_idx ON public.employees(department_id);
CREATE INDEX positions_department_idx ON public.positions(department_id);

-- Multiple managers.
CREATE TABLE public.employee_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'line' CHECK (relationship IN ('line', 'dotted', 'functional')),
  is_primary boolean NOT NULL DEFAULT false,
  employee_position_id uuid REFERENCES public.employee_positions(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, manager_id, relationship),
  CHECK (manager_id <> employee_id),
  CHECK (NOT is_primary OR relationship = 'line'),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE UNIQUE INDEX employee_managers_one_primary_idx ON public.employee_managers(employee_id) WHERE is_primary;
CREATE INDEX employee_managers_manager_idx ON public.employee_managers(manager_id);

-- Existing single managers become the primary line manager. Done before the triggers exist so
-- any loop already in the data cannot block the migration.
INSERT INTO public.employee_managers (employee_id, manager_id, relationship, is_primary)
SELECT id, manager_id, 'line', true FROM public.employees
WHERE manager_id IS NOT NULL AND manager_id <> id;

-- Triggers.
CREATE FUNCTION public.hr_sync_department_name() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO NEW.department FROM public.departments WHERE id = NEW.department_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.department_id IS NOT NULL AND NEW.department IS NOT DISTINCT FROM OLD.department THEN
    NEW.department := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER employees_department_name BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.hr_sync_department_name();
CREATE TRIGGER positions_department_name BEFORE INSERT OR UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.hr_sync_department_name();

CREATE FUNCTION public.hr_department_renamed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.positions SET department = NEW.name WHERE department_id = NEW.id;
  UPDATE public.employees SET department = NEW.name WHERE department_id = NEW.id;
  RETURN NULL;
END $$;

CREATE TRIGGER departments_renamed AFTER UPDATE OF name ON public.departments
  FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name) EXECUTE FUNCTION public.hr_department_renamed();

CREATE FUNCTION public.hr_prevent_department_cycle() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_department_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE up AS (
      SELECT d.id, d.parent_department_id FROM public.departments d WHERE d.id = NEW.parent_department_id
      UNION
      SELECT d.id, d.parent_department_id FROM public.departments d JOIN up ON d.id = up.parent_department_id
    )
    SELECT 1 FROM up WHERE up.id = NEW.id
  ) THEN
    RAISE EXCEPTION 'A department cannot sit under one of its own sub-departments';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER departments_no_cycle BEFORE INSERT OR UPDATE OF parent_department_id ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.hr_prevent_department_cycle();

CREATE FUNCTION public.hr_prevent_manager_cycle() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.relationship = 'line' AND EXISTS (
    WITH RECURSIVE up AS (
      SELECT em.manager_id AS id FROM public.employee_managers em
      WHERE em.employee_id = NEW.manager_id AND em.relationship = 'line' AND em.id <> NEW.id
      UNION
      SELECT em.manager_id FROM public.employee_managers em JOIN up ON em.employee_id = up.id
      WHERE em.relationship = 'line' AND em.id <> NEW.id
    )
    SELECT 1 FROM up WHERE up.id = NEW.employee_id
  ) THEN
    RAISE EXCEPTION 'That would make a reporting loop: the manager already reports to this person';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER employee_managers_no_cycle BEFORE INSERT OR UPDATE ON public.employee_managers
  FOR EACH ROW EXECUTE FUNCTION public.hr_prevent_manager_cycle();

-- employees.manager_id mirrors the current primary line manager.
CREATE FUNCTION public.hr_refresh_manager_cache(_employee_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  _manager uuid;
BEGIN
  SELECT em.manager_id INTO _manager FROM public.employee_managers em
  WHERE em.employee_id = _employee_id AND em.is_primary AND (em.end_date IS NULL OR em.end_date >= current_date);
  UPDATE public.employees SET manager_id = _manager
  WHERE id = _employee_id AND manager_id IS DISTINCT FROM _manager;
END $$;

CREATE FUNCTION public.hr_employee_managers_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.hr_refresh_manager_cache(OLD.employee_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN PERFORM public.hr_refresh_manager_cache(NEW.employee_id); END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER employee_managers_cache AFTER INSERT OR UPDATE OR DELETE ON public.employee_managers
  FOR EACH ROW EXECUTE FUNCTION public.hr_employee_managers_changed();

-- A person's job title and department follow their current primary position.
CREATE FUNCTION public.hr_sync_employee_from_position(_employee_id uuid) RETURNS void
LANGUAGE sql AS $$
  UPDATE public.employees e SET job_title = p.title, department_id = p.department_id
  FROM public.employee_positions ep JOIN public.positions p ON p.id = ep.position_id
  WHERE e.id = _employee_id AND ep.employee_id = e.id AND ep.is_primary
    AND (ep.end_date IS NULL OR ep.end_date >= current_date)
    AND (e.job_title IS DISTINCT FROM p.title OR e.department_id IS DISTINCT FROM p.department_id)
$$;

CREATE FUNCTION public.hr_assignment_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.hr_sync_employee_from_position(NEW.employee_id);
  RETURN NULL;
END $$;

CREATE TRIGGER employee_positions_sync_employee AFTER INSERT OR UPDATE ON public.employee_positions
  FOR EACH ROW EXECUTE FUNCTION public.hr_assignment_changed();

CREATE FUNCTION public.hr_position_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  _employee uuid;
BEGIN
  FOR _employee IN SELECT employee_id FROM public.employee_positions WHERE position_id = NEW.id AND is_primary LOOP
    PERFORM public.hr_sync_employee_from_position(_employee);
  END LOOP;
  RETURN NULL;
END $$;

CREATE TRIGGER positions_sync_employees AFTER UPDATE OF title, department_id ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.hr_position_changed();

-- Anyone already on a primary position picks up its title and department now.
UPDATE public.employees e SET job_title = p.title, department_id = p.department_id
FROM public.employee_positions ep JOIN public.positions p ON p.id = ep.position_id
WHERE ep.employee_id = e.id AND ep.is_primary AND (ep.end_date IS NULL OR ep.end_date >= current_date);

CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employee_managers_updated_at BEFORE UPDATE ON public.employee_managers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages departments" ON public.departments FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "HR manages employee managers" ON public.employee_managers FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));

-- Line managers (the primary one and any additional) can read their reports' assessments.
CREATE OR REPLACE FUNCTION public.is_manager_of_employee(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_managers em
    JOIN public.employees m ON m.id = em.manager_id
    WHERE em.employee_id = _employee_id
      AND em.relationship = 'line'
      AND (em.end_date IS NULL OR em.end_date >= current_date)
      AND m.user_id = auth.uid()
  )
$$;
