import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { revealEmployeeSensitive, type Employee, type EmployeeSensitive } from "@/features/admin/hr/useEmployees";
import { buildPayrollArchive, type ArchiveTotals } from "./archivePack";
import type { PayrollRun, PayslipRow } from "./usePayroll";

export interface PayrollArchive {
  id: string;
  run_id: string;
  version: number;
  storage_path: string;
  sha256: string;
  size_bytes: number;
  totals: ArchiveTotals;
  created_by: string;
  created_at: string;
}

const BUCKET = "payroll-archives";

// Payroll tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export const usePayrollArchives = (runId: string | undefined) =>
  useQuery({
    queryKey: ["hr", "payroll_archives", runId],
    enabled: !!runId,
    queryFn: async () =>
      unwrap(await db.from("payroll_archives").select("*").eq("run_id", runId).order("version", { ascending: false })) as PayrollArchive[],
  });

const isDuplicate = (error: { message?: string; statusCode?: string } | null) =>
  !!error && (error.statusCode === "409" || /exists|duplicate/i.test(error.message ?? ""));

/** Build the pack, store it, then record it. Stored packs can't be replaced, so a clash takes the next version. */
export const createPayrollArchive = async ({ runId, payslips, employees }: { runId: string; payslips: PayslipRow[]; employees: Employee[] }) => {
  // Read the run fresh: right after approval the page still holds the draft row.
  const run = unwrap(await db.from("payroll_runs").select("*").eq("id", runId).single()) as PayrollRun;
  const existing = unwrap(await db.from("payroll_archives").select("version").eq("run_id", run.id)) as { version: number }[];
  const { data: auth } = await supabase.auth.getUser();
  const sensitive = new Map<string, EmployeeSensitive | null>();
  for (const p of payslips) sensitive.set(p.employee_id, await revealEmployeeSensitive(p.employee_id));

  let version = Math.max(0, ...existing.map((a) => a.version)) + 1;
  for (let attempt = 0; attempt < 5; attempt++, version++) {
    const pack = await buildPayrollArchive({
      run,
      payslips,
      employees: new Map(employees.map((e) => [e.id, e])),
      sensitive,
      version,
      generatedAt: new Date(),
      generatedBy: auth.user?.email ?? "unknown user",
    });
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(pack.storagePath, new Blob([pack.zip as Uint8Array<ArrayBuffer>], { type: "application/zip" }), { contentType: "application/zip", upsert: false });
    if (isDuplicate(error as never)) continue;
    if (error) throw error;
    return unwrap(
      await db
        .from("payroll_archives")
        .insert({ run_id: run.id, version, storage_path: pack.storagePath, sha256: pack.sha256, size_bytes: pack.zip.byteLength, totals: pack.totals })
        .select()
        .single(),
    ) as PayrollArchive;
  }
  throw new Error("Could not find a free archive version");
};

export const useCreatePayrollArchive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPayrollArchive,
    onSuccess: (archive) => qc.invalidateQueries({ queryKey: ["hr", "payroll_archives", archive.run_id] }),
  });
};

export const downloadPayrollArchive = async (archive: PayrollArchive) => {
  const blob = unwrap(await supabase.storage.from(BUCKET).download(archive.storage_path)) as Blob;
  unwrap(await db.rpc("log_payroll_archive_download", { _archive_id: archive.id }));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = archive.storage_path.split("/").pop() ?? "payroll-archive.zip";
  link.click();
  URL.revokeObjectURL(url);
};
