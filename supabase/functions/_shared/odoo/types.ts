export type ConflictPolicy = "prefer_odoo" | "prefer_optilens" | "newest_write_date" | "manual_review";

export type OdooConnection = {
  id: string;
  tenant_key: string;
  base_url: string;
  database_name: string;
  user_identifier: string | null;
  auth_mode: "api_key" | "password";
  dry_run_enabled: boolean;
  sync_batch_size: number;
  pull_cursor: string | null;
  push_cursor: string | null;
  conflict_policy: ConflictPolicy;
};

export type OdooPartner = {
  id: number;
  write_date?: string;
  name?: string;
  is_company?: boolean;
  parent_id?: [number, string] | false;
  type?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  street?: string;
  street2?: string;
  city?: string;
  state_id?: [number, string] | false;
  zip?: string;
  country_id?: [number, string] | false;
  vat?: string;
  active?: boolean;
  [key: string]: unknown;
};
