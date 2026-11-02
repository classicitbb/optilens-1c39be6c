import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContractType = "permanent" | "fixed_term" | "probation" | "casual" | "addendum" | "other";

export interface Position {
  id: string;
  title: string;
  department: string;
  department_id: string;
  reports_to_position_id: string | null;
  headcount: number;
  active: boolean;
  job_description: string | null;
  job_description_path: string | null;
  job_description_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeePosition {
  id: string;
  employee_id: string;
  position_id: string;
  is_primary: boolean;
  allocation_percent: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface EmployeeContract {
  id: string;
  employee_id: string;
  position_id: string | null;
  contract_type: ContractType;
  title: string;
  start_date: string | null;
  end_date: string | null;
  signed_date: string | null;
  file_path: string;
  file_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  permanent: "Permanent",
  fixed_term: "Fixed term",
  probation: "Probation",
  casual: "Casual",
  addendum: "Addendum",
  other: "Other",
};

const BUCKET = "hr-documents";

// HR tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export const usePositions = () =>
  useQuery({
    queryKey: ["hr", "positions"],
    retry: 1,
    queryFn: async () => unwrap(await db.from("positions").select("*").order("department").order("title")) as Position[],
  });

export const useEmployeePositions = () =>
  useQuery({
    queryKey: ["hr", "employee_positions"],
    retry: 1,
    queryFn: async () => unwrap(await db.from("employee_positions").select("*")) as EmployeePosition[],
  });

/** An assignment counts while it has not ended. */
export const isCurrentAssignment = (a: Pick<EmployeePosition, "end_date">, today = new Date().toISOString().slice(0, 10)) =>
  !a.end_date || a.end_date >= today;

const safeName = (name: string) => name.replace(/[^\w.-]+/g, "_").slice(-80);

/** Uploads to the private HR bucket and returns the stored path. */
export const uploadHrDocument = async (folder: string, file: File) => {
  const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  unwrap(await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false }));
  return path;
};

export const removeHrDocument = async (path: string) => {
  unwrap(await supabase.storage.from(BUCKET).remove([path]));
};

/** Opens a short-lived signed link; the bucket itself is private. */
export const openHrDocument = async (path: string) => {
  const { signedUrl } = unwrap(await supabase.storage.from(BUCKET).createSignedUrl(path, 60)) as { signedUrl: string };
  window.open(signedUrl, "_blank", "noopener");
};
