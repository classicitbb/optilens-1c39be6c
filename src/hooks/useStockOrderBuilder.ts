import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Data layer for the Stock Order Builder (/admin/website/stock-orders).
// Deliberately separate from the Rx order pipeline (useOrderableCatalog.ts,
// RxOrderEmbed) — stock orders are SKU-identified finished/semi-finished
// lenses, not prescription-driven. See:
//   - cvweb-deploy migration 20260811000000_stock_order_pricing_and_outbox.sql
//   - optilens-local docs/innova-stockhashref-format.md
//
// NOT verified against a live database this session — no working Supabase
// connection was available. Column/table names are taken from the migration
// above (which this file assumes is applied) and from
// hooks/useInnovationsStoreLensCatalog.ts, which already reads
// innovations_store_lenses / innovations_store_lens_power_rows live.

export interface StockEligibleAccount {
  id: number;
  name: string;
  account_number: string | null;
  pricelist_version_id: number;
  pricelist_name: string | null;
}

// Accounts whose assigned pricelist has at least one priced stock_variant
// row — mirrors the same "on the assigned document = available" rule the
// Rx form already uses (useOrderableCatalog.ts), via the
// stock_lens_eligible_accounts view.
export const useStockEligibleAccounts = () => {
  return useQuery<StockEligibleAccount[]>({
    queryKey: ["stock-eligible-accounts"],
    queryFn: async () => {
      const { data: eligible, error: eligibleErr } = await (supabase as any)
        .from("stock_lens_eligible_accounts")
        .select("account_id, pricelist_version_id");
      if (eligibleErr) throw eligibleErr;
      const rows = (eligible ?? []) as { account_id: number; pricelist_version_id: number }[];
      if (!rows.length) return [];

      const accountIds = rows.map((r) => r.account_id);
      const versionIds = [...new Set(rows.map((r) => r.pricelist_version_id))];

      const [{ data: customers, error: custErr }, { data: versions, error: verErr }] = await Promise.all([
        (supabase.from("customers") as any).select("id, name, account_number").in("id", accountIds),
        (supabase.from("pricelist_versions") as any).select("id, name").in("id", versionIds),
      ]);
      if (custErr) throw custErr;
      if (verErr) throw verErr;

      const versionName = new Map<number, string>((versions ?? []).map((v: any) => [v.id, v.name]));
      const byId = new Map<number, StockEligibleAccount>();
      for (const row of rows) {
        const customer = (customers ?? []).find((c: any) => c.id === row.account_id);
        if (!customer) continue;
        byId.set(row.account_id, {
          id: customer.id,
          name: customer.name,
          account_number: customer.account_number,
          pricelist_version_id: row.pricelist_version_id,
          pricelist_name: versionName.get(row.pricelist_version_id) ?? null,
        });
      }
      return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 60_000,
  });
};

// Family-level stock lens prices for one pricelist version — keyed by
// innovations_store_lenses.id, per the migration's "price per family"
// design (flagged there as an assumption, not confirmed against real data).
export const useStockLensPricing = (pricelistVersionId: number | null) => {
  return useQuery<Map<string, number>>({
    queryKey: ["stock-lens-pricing", pricelistVersionId],
    enabled: pricelistVersionId != null,
    queryFn: async () => {
      const { data, error } = await (supabase.from("pricelist_catalog_rows") as any)
        .select("item_id, bbd_price")
        .eq("pricelist_version_id", pricelistVersionId)
        .eq("catalog_type", "stock")
        .eq("row_type", "stock_variant")
        .not("bbd_price", "is", null);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        if (row.item_id) map.set(row.item_id, Number(row.bbd_price));
      }
      return map;
    },
    staleTime: 60_000,
  });
};

// Resolve a scanned/typed code to its power row — checked against both
// right_opc and left_opc since either could be what's printed on the box.
export interface ResolvedScan {
  powerRowId: string;
  innovationsLensId: string;
  side: "right" | "left";
  sphere: number | null;
  base: number | null;
  cylinder: number | null;
  add: number | null;
}

export const resolveStockCode = async (code: string): Promise<ResolvedScan | null> => {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const { data, error } = await (supabase.from("innovations_store_lens_power_rows") as any)
    .select("id, innovations_lens_id, sphere, base, cylinder, add, right_opc, left_opc")
    .or(`right_opc.eq.${trimmed},left_opc.eq.${trimmed}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    powerRowId: data.id,
    innovationsLensId: data.innovations_lens_id,
    side: data.right_opc === trimmed ? "right" : "left",
    sphere: data.sphere, base: data.base, cylinder: data.cylinder, add: data.add,
  };
};

export interface StageOrderItem {
  power_row_id: string;
  side: "right" | "left" | "either";
  quantity: number;
  customer_ref: string;
}

export interface StockOrderDraft {
  id: string;
  account_id: number;
  po_number: string | null;
  order_reference: string | null;
  status: string;
  payload: {
    account?: { id?: number; name?: string; account_number?: string | null };
    po_number?: string | null;
    order_reference?: string | null;
    instructions?: string | null;
    items?: Array<{
      power_row_id?: string;
      side?: "right" | "left" | "either";
      sku?: string;
      source?: string;
      description?: string;
      quantity?: number;
      comment?: string;
      unit_price?: number;
    }>;
    order_total?: number;
  };
  created_at: string;
  updated_at: string;
}

const isMissingStockOrderFeatureError = (error: any) =>
  /stock_order_submissions|schema cache|does not exist|relation .* does not exist/i.test(String(error?.message ?? ""));

export const useStockOrderDrafts = () => {
  return useQuery<StockOrderDraft[]>({
    queryKey: ["stock-order-drafts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("stock_order_submissions") as any)
        .select("id, account_id, po_number, order_reference, status, payload, created_at, updated_at")
        .in("status", ["staged", "failed"])
        .order("updated_at", { ascending: false });
      if (error) {
        if (isMissingStockOrderFeatureError(error)) return [];
        throw error;
      }
      return (data ?? []) as StockOrderDraft[];
    },
    staleTime: 30_000,
  });
};

export const useStockOrderDraft = (draftId: string | null) => {
  return useQuery<StockOrderDraft | null>({
    queryKey: ["stock-order-draft", draftId],
    enabled: !!draftId,
    queryFn: async () => {
      if (!draftId) return null;
      const { data, error } = await (supabase.from("stock_order_submissions") as any)
        .select("id, account_id, po_number, order_reference, status, payload, created_at, updated_at")
        .eq("id", draftId)
        .maybeSingle();
      if (error) {
        if (isMissingStockOrderFeatureError(error)) return null;
        throw error;
      }
      return (data ?? null) as StockOrderDraft | null;
    },
  });
};

export const useStageStockOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      accountId: number; poNumber: string; orderReference: string; instructions: string; items: StageOrderItem[];
    }) => {
      const { data, error } = await (supabase.rpc as any)("stage_stock_order_submission", {
        p_account_id: input.accountId,
        p_po_number: input.poNumber || null,
        p_order_reference: input.orderReference || null,
        p_instructions: input.instructions || null,
        p_items: input.items,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { submission_id: string; order_total: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-order-submissions"] });
    },
  });
};

export const useReleaseStockOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await (supabase.rpc as any)("release_stock_order_submission", { p_id: submissionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-order-submissions"] });
    },
  });
};
