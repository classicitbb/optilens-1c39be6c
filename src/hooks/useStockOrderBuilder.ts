import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Data layer for the Stock Order Builder (/admin/website/stock-orders).
//
// The form sells what the website sells: the published store items and their
// variants, nothing else. The catalog comes from get_stock_order_catalog
// (website-published lenses/supplies/add-ons that the account's assigned
// pricelist prices in its 'stock' section) and the variants come from the
// storefront's own reader, get_store_product_variants_public — the same one
// /store/product/* uses, so the two can't drift.
//
// The Innova SKU rides on the variant (opc_code, or metadata.opc_by_eye per
// eye for a chiral lens), written by the Innovations variant import. Prices
// are resolved server-side on stage and again on release; nothing here sends
// a price to the server.
//
// See:
//   - supabase/migrations/20260812000000_unified_order_dispatch.sql
//   - supabase/functions/_shared/orders/hashref.ts (the one order format)

export type StockProductType = "lens" | "supply" | "addon";

export interface StockEligibleAccount {
  id: number;
  name: string;
  account_number: string | null;
  pricelist_version_id: number;
  pricelist_name: string | null;
}

// Accounts whose assigned pricelist prices at least one published website
// item — mirrors the same "on the assigned document = available" rule the
// Rx form already uses (useOrderableCatalog.ts), via the
// stock_lens_eligible_accounts view.
export const useStockEligibleAccounts = () => {
  return useQuery<StockEligibleAccount[]>({
    queryKey: ["stock-eligible-accounts"],
    queryFn: async () => {
      const [{ data: eligible, error: eligibleErr }, { data: retailFallback, error: retailFallbackErr }] = await Promise.all([
        (supabase as any)
          .from("stock_lens_eligible_accounts")
          .select("account_id, pricelist_version_id"),
        // Temporary compatibility path: Retail remains the default stock-order
        // account while its stock rows are repaired. Keep every other account
        // governed by the lab + priced eligibility view above.
        (supabase.from("customers") as any)
          .select("id, name, account_number, assigned_pricelist_id")
          .ilike("name", "retail")
          .limit(1),
      ]);
      if (eligibleErr) throw eligibleErr;
      if (retailFallbackErr) throw retailFallbackErr;
      const rows = (eligible ?? []) as { account_id: number; pricelist_version_id: number }[];
      const retail = (retailFallback ?? [])[0] as { id?: number; assigned_pricelist_id?: number | null } | undefined;
      if (retail?.id && retail.assigned_pricelist_id && !rows.some((row) => row.account_id === retail.id)) {
        rows.push({ account_id: retail.id, pricelist_version_id: retail.assigned_pricelist_id });
      }
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

export interface StockCatalogItem {
  product_type: StockProductType;
  product_id: string;
  name: string;
  category: string | null;
  sku: string | null;
  unit_price: number;
  has_variants: boolean;
  price_source?: "assigned_pricelist" | "retail_pricelist" | "catalog" | "manual";
  source_trail?: string[];
  unit_cost?: number | null;
}

const isMissingStockOrderFeatureError = (error: any) =>
  /stock_order_submissions|get_stock_order_catalog|schema cache|does not exist|relation .* does not exist/i
    .test(String(error?.message ?? ""));

/** Website items this account may order, already priced from its pricelist. */
export const useStockOrderCatalog = (accountId: number | null) => {
  return useQuery<StockCatalogItem[]>({
    queryKey: ["stock-order-catalog", accountId],
    enabled: accountId != null,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_stock_order_catalog", { p_account_id: accountId });
      if (error) {
        if (isMissingStockOrderFeatureError(error)) return [];
        throw error;
      }
      return ((data ?? []) as any[]).map((row) => ({
        product_type: row.product_type as StockProductType,
        product_id: row.product_id,
        name: row.name,
        category: row.category ?? null,
        sku: row.sku ?? null,
        unit_price: Number(row.unit_price ?? 0),
        has_variants: Boolean(row.has_variants),
        price_source: row.price_source ?? undefined,
        source_trail: Array.isArray(row.source_trail) ? row.source_trail.filter(Boolean) : [],
        unit_cost: row.unit_cost == null ? null : Number(row.unit_cost),
      }));
    },
    staleTime: 60_000,
  });
};

export interface StockVariant {
  id: string;
  title: string;
  sku: string | null;
  opc_code: string | null;
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  stock_qty: number;
}

/** Reads the storefront's own variant list for a product, so the builder
 *  offers exactly the variants a customer sees on /store/product/*. */
export const useStockProductVariants = (productType: StockProductType | null, productId: string | null) => {
  return useQuery<StockVariant[]>({
    queryKey: ["stock-order-variants", productType, productId],
    enabled: Boolean(productType && productId),
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_store_product_variants_public", {
        p_product_type: productType,
        p_product_id: productId,
      });
      if (error) throw error;
      return ((data ?? []) as any[])
        .filter((v) => v.is_active)
        .map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku ?? null,
          opc_code: v.opc_code ?? null,
          attributes: (v.attributes ?? {}) as Record<string, unknown>,
          metadata: (v.metadata ?? {}) as Record<string, unknown>,
          stock_qty: Number(v.stock_qty ?? 0),
        }));
    },
  });
};

/** The Innova code(s) a variant can be ordered by. A chiral lens variant
 *  carries one per eye; a symmetric one carries a single shared code. */
export const variantSkuFor = (variant: StockVariant, side: "right" | "left" | "either"): string | null => {
  const byEye = (variant.metadata as any)?.opc_by_eye ?? {};
  if (side !== "either" && byEye?.[side]) return String(byEye[side]);
  return variant.opc_code || byEye?.right || byEye?.left || variant.sku || null;
};

export const variantIsChiral = (variant: StockVariant): boolean =>
  Boolean((variant.metadata as any)?.is_chiral);

export interface ResolvedScan {
  productType: StockProductType;
  productId: string;
  variantId: string;
  variantTitle: string;
  side: "right" | "left" | "either";
}

/** Resolve a scanned or typed code to a website variant. Checked against the
 *  symmetric opc_code and both per-eye codes, since any of the three could be
 *  what's printed on the box. */
export const resolveStockCode = async (code: string): Promise<ResolvedScan | null> => {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const { data, error } = await (supabase.from("store_product_variants") as any)
    .select("id, product_type, product_id, title, opc_code, sku, metadata")
    .eq("is_active", true)
    .or(
      [
        `opc_code.eq.${trimmed}`,
        `sku.eq.${trimmed}`,
        `metadata->opc_by_eye->>right.eq.${trimmed}`,
        `metadata->opc_by_eye->>left.eq.${trimmed}`,
      ].join(","),
    )
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const byEye = (data.metadata ?? {}).opc_by_eye ?? {};
  return {
    productType: data.product_type as StockProductType,
    productId: data.product_id,
    variantId: data.id,
    variantTitle: data.title,
    side: byEye.right === trimmed ? "right" : byEye.left === trimmed ? "left" : "either",
  };
};

export interface StageOrderItem {
  product_type: StockProductType;
  product_id: string;
  variant_id: string | null;
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
      product_type?: StockProductType;
      product_id?: string;
      variant_id?: string | null;
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

const draftColumns = "id, account_id, po_number, order_reference, status, dispatch_provider, payload, created_at, updated_at";

export const useStockOrderDrafts = () => {
  return useQuery<StockOrderDraft[]>({
    queryKey: ["stock-order-drafts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("stock_order_submissions") as any)
        .select(draftColumns)
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
        .select(draftColumns)
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
      submissionId?: string;
      accountId: number; poNumber: string; orderReference: string; instructions: string; items: StageOrderItem[];
    }) => {
      const { data, error } = await (supabase.rpc as any)("save_stock_order_draft", {
        p_submission_id: input.submissionId ?? null,
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
      queryClient.invalidateQueries({ queryKey: ["stock-order-drafts"] });
    },
  });
};

// Stock orders always release through Innovations. The office worker claims
// the outbox row and drops the rendered file into Innova's Incoming folder.
export const useReleaseStockOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await (supabase.rpc as any)("release_stock_order_submission", {
        p_id: id,
        p_dispatch_provider: "innovations",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-order-drafts"] });
    },
  });
};

/** Converts a saved stock draft into the authoritative STOCK quote and its
 * linked DocStudio billing document. Monetary values remain server-resolved. */
export const useSaveStockOrderAsQuote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId }: { submissionId: string }) => {
      const { data, error } = await (supabase.rpc as any)("save_stock_order_as_quote", {
        p_submission_id: submissionId,
      });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as {
        quote_id: string;
        quote_number: string;
        docstudio_document_id: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-order-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
};

/** The exact order text this submission would transmit, rendered by the same
 *  builder both transports use — not a local approximation of it. */
export const useStockOrderPreview = (submissionId: string | null, enabled: boolean) => {
  return useQuery<{ hashref: string; routed: boolean }>({
    queryKey: ["stock-order-preview", submissionId],
    enabled: Boolean(submissionId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gatekeeper-orders", {
        body: { action: "preview", orderKind: "stock", submissionId },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "Could not render the order.");
      return { hashref: String(data.hashref ?? ""), routed: Boolean(data.routed) };
    },
  });
};
