-- Doc Studio storage (Phase 4 of docs/CRM_BUILD_PLAN.md): replaces
-- optilens-local's SQL Server docstudio schema. Accessed only via the
-- docstudio-api edge function (service role) — RLS admin policies are a
-- defense-in-depth backstop.

CREATE TABLE IF NOT EXISTS public.docstudio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('email','letter','signature','social','pricelist','shiplabel','statement')),
  file_name text NOT NULL,
  customer_name text NULL,
  customer_account text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_html text NOT NULL DEFAULT '',
  autosave_content jsonb NULL,
  autosave_rendered_html text NULL,
  latest_autosave_at timestamptz NULL,
  version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS docstudio_files_type_idx ON public.docstudio_files(file_type) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.docstudio_billing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('invoice','quote','proforma','receipt')),
  document_name text NOT NULL,
  billing_number text NULL,
  customer_name text NULL,
  customer_company text NULL,
  customer_account text NULL,
  paper_size text NOT NULL DEFAULT 'letter' CHECK (paper_size IN ('letter','a4')),
  status text NOT NULL DEFAULT 'saved',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_html text NOT NULL DEFAULT '',
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  autosave_content jsonb NULL,
  autosave_rendered_html text NULL,
  autosave_totals jsonb NULL,
  latest_autosave_at timestamptz NULL,
  version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS docstudio_billing_type_idx ON public.docstudio_billing_documents(document_type) WHERE deleted_at IS NULL;

ALTER TABLE public.docstudio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docstudio_billing_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role users can select docstudio files" ON public.docstudio_files;
CREATE POLICY "Role users can select docstudio files"
  ON public.docstudio_files FOR SELECT USING (has_any_role(auth.uid()));
DROP POLICY IF EXISTS "Editors can manage docstudio files" ON public.docstudio_files;
CREATE POLICY "Editors can manage docstudio files"
  ON public.docstudio_files FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select docstudio billing" ON public.docstudio_billing_documents;
CREATE POLICY "Role users can select docstudio billing"
  ON public.docstudio_billing_documents FOR SELECT USING (has_any_role(auth.uid()));
DROP POLICY IF EXISTS "Editors can manage docstudio billing" ON public.docstudio_billing_documents;
CREATE POLICY "Editors can manage docstudio billing"
  ON public.docstudio_billing_documents FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));
