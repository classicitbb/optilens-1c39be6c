import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildRunLines, type AssetInput, type AssetStatus, type ClassAccounts, type Convention, type DepreciationMethod, type ExpenseTarget } from "./engine";
import type { ImportRow } from "./importRows";

export interface AssetClass {
  id: string;
  name: string;
  is_intangible: boolean;
  default_life_months: number;
  default_method: DepreciationMethod;
  default_residual_pct: number;
  qbo_cost_account: string;
  qbo_accum_account: string;
  qbo_expense_overhead_account: string;
  qbo_expense_cogs_account: string;
  qbo_disposal_account: string;
  sort_order: number;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  description: string | null;
  class_id: string;
  serial_no: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  custodian_employee_id: string | null;
  supplier: string | null;
  invoice_ref: string | null;
  acquired_on: string | null;
  in_service_on: string | null;
  warranty_expires_on: string | null;
  cost: number;
  expense_target: ExpenseTarget;
  status: AssetStatus;
  disposed_on: string | null;
  legacy_qbo_account: string | null;
  notes: string | null;
  created_at: string;
}

export interface AssetBook {
  id: string;
  asset_id: string;
  book: "book" | "tax";
  method: DepreciationMethod;
  useful_life_months: number;
  residual_value: number;
  rate_pct: number | null;
  convention: Convention;
  opening_accum_dep: number;
  opening_as_of: string | null;
  accum_dep: number;
}

export interface AssetEvent {
  id: string;
  asset_id: string;
  type: string;
  occurred_on: string;
  amount: number | null;
  proceeds: number | null;
  gain_loss: number | null;
  memo: string | null;
  created_at: string;
}

export type RunStatus = "draft" | "approved" | "posted";

export interface DepreciationRun {
  id: string;
  period: string;
  book: "book" | "tax";
  status: RunStatus;
  journal_ref: string | null;
  notes: string | null;
  approved_at: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface DepreciationLine {
  id: string;
  run_id: string;
  asset_id: string;
  class_id: string;
  expense_target: ExpenseTarget;
  amount: number;
}

/** An asset with its accounting book, which is what every screen needs. */
export type RegisterAsset = Asset & { book: AssetBook | null };

export const RUN_STATUS_LABELS: Record<RunStatus, string> = { draft: "Draft", approved: "Approved", posted: "Posted" };
export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = { draft: "Draft", in_service: "In service", disposed: "Disposed", written_off: "Written off" };
export const METHOD_LABELS: Record<DepreciationMethod, string> = { straight_line: "Straight line", declining_balance: "Declining balance" };
export const CONVENTION_LABELS: Record<Convention, string> = { full_year: "Full year in year of purchase", full_month: "From the month in service", mid_month: "Half month in first month" };

// Asset tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

// PostgREST returns at most 1000 rows per request; page through anything that can grow past that.
const PAGE = 1000;
const fetchAll = async <T,>(query: () => any): Promise<T[]> => {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = unwrap(await query().range(from, from + PAGE - 1)) as T[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
};

// numeric columns come back from PostgREST as numbers or strings depending on size.
const num = (v: unknown) => (v == null ? v : Number(v)) as number;
const normaliseBook = (b: AssetBook): AssetBook => ({
  ...b,
  residual_value: num(b.residual_value),
  rate_pct: b.rate_pct == null ? null : num(b.rate_pct),
  opening_accum_dep: num(b.opening_accum_dep),
  accum_dep: num(b.accum_dep),
});

export const nbv = (a: RegisterAsset) => (Math.round(a.cost * 100) - Math.round((a.book?.accum_dep ?? 0) * 100)) / 100;

export const toEngineAsset = (a: RegisterAsset): AssetInput | null =>
  a.book
    ? {
        id: a.id,
        classId: a.class_id,
        cost: a.cost,
        inServiceOn: a.in_service_on,
        status: a.status,
        expenseTarget: a.expense_target,
        book: {
          method: a.book.method,
          usefulLifeMonths: a.book.useful_life_months,
          residualValue: a.book.residual_value,
          ratePct: a.book.rate_pct,
          convention: a.book.convention,
          accumDep: a.book.accum_dep,
          openingAsOf: a.book.opening_as_of,
        },
      }
    : null;

export const toClassAccounts = (c: AssetClass): ClassAccounts => ({
  id: c.id,
  name: c.name,
  costAccount: c.qbo_cost_account,
  accumAccount: c.qbo_accum_account,
  expenseOverheadAccount: c.qbo_expense_overhead_account,
  expenseCogsAccount: c.qbo_expense_cogs_account,
});

export const useAssetClasses = () =>
  useQuery({
    queryKey: ["assets", "classes"],
    queryFn: async () => unwrap(await db.from("asset_classes").select("*").order("sort_order")) as AssetClass[],
  });

const loadRegister = async (): Promise<RegisterAsset[]> => {
  const [assets, books] = await Promise.all([
    fetchAll<Asset>(() => db.from("assets").select("*").order("tag").order("id")),
    fetchAll<AssetBook>(() => db.from("asset_books").select("*").eq("book", "book").order("id")),
  ]);
  const byAsset = new Map(books.map((b) => [b.asset_id, normaliseBook(b)]));
  return assets.map((a) => ({ ...a, cost: num(a.cost), book: byAsset.get(a.id) ?? null }));
};

export const useRegister = () => useQuery({ queryKey: ["assets", "register"], queryFn: loadRegister });

export const useAsset = (id: string | undefined) =>
  useQuery({
    queryKey: ["assets", "asset", id],
    enabled: !!id,
    queryFn: async () => {
      const [asset, books, events, lines] = await Promise.all([
        db.from("assets").select("*").eq("id", id).single(),
        db.from("asset_books").select("*").eq("asset_id", id).eq("book", "book").maybeSingle(),
        db.from("asset_events").select("*").eq("asset_id", id).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
        db.from("depreciation_lines").select("amount, run:depreciation_runs!inner(period, status)").eq("asset_id", id),
      ]);
      const a = unwrap(asset) as Asset;
      const book = unwrap(books) as AssetBook | null;
      return {
        asset: { ...a, cost: num(a.cost), book: book ? normaliseBook(book) : null } as RegisterAsset,
        events: unwrap(events) as AssetEvent[],
        charges: (unwrap(lines) as { amount: number; run: { period: string; status: RunStatus } }[])
          .map((l) => ({ period: l.run.period, status: l.run.status, amount: num(l.amount) }))
          .sort((x, y) => y.period.localeCompare(x.period)),
      };
    },
  });

/** Approved charges with their month, for the roll-forward. */
export const useApprovedLines = () =>
  useQuery({
    queryKey: ["assets", "approved_lines"],
    queryFn: async () =>
      (
        await fetchAll<{ asset_id: string; amount: number; run: { period: string } }>(() =>
          db
            .from("depreciation_lines")
            .select("asset_id, amount, run:depreciation_runs!inner(period, status, book)")
            .neq("run.status", "draft")
            .eq("run.book", "book")
            .order("id"),
        )
      ).map((l) => ({ assetId: l.asset_id, period: l.run.period, amount: num(l.amount) })),
  });

export const useSaveAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, asset, book }: { id?: string; asset: Record<string, unknown>; book: Record<string, unknown> }) => {
      if (id) {
        unwrap(await db.from("assets").update(asset).eq("id", id));
        if (Object.keys(book).length) unwrap(await db.from("asset_books").update(book).eq("asset_id", id).eq("book", "book"));
        return id;
      }
      const created = unwrap(await db.from("assets").insert(asset).select().single()) as Asset;
      unwrap(await db.from("asset_books").insert({ ...book, asset_id: created.id, book: "book" }));
      unwrap(await db.from("asset_events").insert({ asset_id: created.id, type: "acquired", occurred_on: created.acquired_on ?? created.in_service_on ?? new Date().toISOString().slice(0, 10), amount: created.cost }));
      return created.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await db.from("assets").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useDisposeAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { assetId: string; on: string; proceeds: number; writeOff: boolean; memo: string | null }) =>
      num(unwrap(await db.rpc("dispose_asset", { _asset_id: v.assetId, _on: v.on, _proceeds: v.proceeds, _write_off: v.writeOff, _memo: v.memo }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useAddAssetNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { assetId: string; on: string; memo: string }) =>
      unwrap(await db.from("asset_events").insert({ asset_id: v.assetId, type: "note", occurred_on: v.on, memo: v.memo })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useImportAssets = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ asOf, rows }: { asOf: string; rows: ImportRow[] }) =>
      num(
        unwrap(
          await db.rpc("import_opening_assets", {
            _as_of: asOf,
            _rows: rows.map(({ line: _line, errors: _errors, warnings: _warnings, ...r }) => r),
          }),
        ),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
export const useDepreciationRuns = () =>
  useQuery({
    queryKey: ["assets", "runs"],
    queryFn: async () => unwrap(await db.from("depreciation_runs").select("*").eq("book", "book").order("period", { ascending: false })) as DepreciationRun[],
  });

export const useDepreciationRun = (runId: string | undefined) =>
  useQuery({
    queryKey: ["assets", "run", runId],
    enabled: !!runId,
    queryFn: async () => {
      const run = unwrap(await db.from("depreciation_runs").select("*").eq("id", runId).single()) as DepreciationRun;
      const lines = (await fetchAll<DepreciationLine>(() => db.from("depreciation_lines").select("*").eq("run_id", runId).order("id"))).map((l) => ({ ...l, amount: num(l.amount) }));
      return { run, lines };
    },
  });

/** Works the run's lines out again from the register's approved totals. */
const calculateRun = async (runId: string, period: string) => {
  const register = await loadRegister();
  const lines = buildRunLines(register.flatMap((a) => toEngineAsset(a) ?? []), period);
  unwrap(await db.from("depreciation_lines").delete().eq("run_id", runId));
  if (lines.length) {
    unwrap(
      await db.from("depreciation_lines").insert(
        lines.map((l) => ({ run_id: runId, asset_id: l.assetId, class_id: l.classId, expense_target: l.expenseTarget, amount: l.amount })),
      ),
    );
  }
  return lines.length;
};

export const useCreateDepreciationRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (period: string) => {
      const run = unwrap(await db.from("depreciation_runs").insert({ period, book: "book" }).select().single()) as DepreciationRun;
      await calculateRun(run.id, period);
      return run;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useDepreciationRunAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ run, action, journalRef }: { run: DepreciationRun; action: "recalculate" | "approve" | "posted" | "delete"; journalRef?: string }) => {
      if (action === "recalculate") return calculateRun(run.id, run.period);
      if (action === "approve") return unwrap(await db.rpc("approve_depreciation_run", { _run_id: run.id }));
      if (action === "posted") {
        return unwrap(await db.from("depreciation_runs").update({ status: "posted", journal_ref: journalRef || null, posted_at: new Date().toISOString() }).eq("id", run.id));
      }
      return unwrap(await db.from("depreciation_runs").delete().eq("id", run.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

/** Downloads text as a file; used for journal and report exports. */
export const downloadText = (filename: string, text: string, type = "text/csv;charset=utf-8") => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const periodEnd = (period: string) => {
  const d = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
};
