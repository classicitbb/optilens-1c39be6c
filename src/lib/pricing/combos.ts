/**
 * combos.ts — classify + aggregate `lenses` rows into anchor-priceable combos.
 *
 * Ported from C:\DEV\pricelist-automation\optilens-connector.js's
 * combosFromRows() (BS1-05). Unlike the original, this runs IN-PROCESS
 * against the live `lenses` table directly — there is no external REST pull
 * step, because the classifier and the data now live in the same app.
 *
 * `combosFromRows` is kept pure/testable, separate from the Supabase fetch,
 * mirroring the original file's own split between combosFromRows() (pure)
 * and fetchLenses()/pull() (IO).
 */
import { supabase } from "@/integrations/supabase/client";
import { APPROVED, normMaterial, normTreatment, QUOTE_ONLY, TIER_MAP } from "./classifier";
import type { Combo } from "./engine";

export interface LensRow {
  id: string;
  name: string;
  supplier: string | null;
  brand: string | null;
  mftype: string | null;
  lenstype: string | null;
  material: string | null;
  cost: number | null;
  active: boolean;
  excludedFromAnchor?: boolean;
  excludedReason?: string | null;
  excludedAt?: string | null;
}

interface SupplierProvenance {
  sourceName: string;
  sourceCost: number;
  sourceLensId: string;
  rowCount: number;
  allRows: Array<{ name: string; cost: number; lensId: string }>;
}

export interface ComboWithProvenance extends Combo {
  provenance: Record<string, SupplierProvenance>;
  anchorCost: number;
  anchorSupplier: string;
  cheapestCost: number;
  cheapestSupplier: string;
  supplierCount: number;
}

// Given a combo and a resolved supplier name (e.g. from engine.ts's anchorOf/
// preferredOf), return the actual lens row id to allocate — the cheapest row
// from that supplier within this combo (matches how `suppliers[supplier]`
// itself was computed, so the cost and the lens_id always agree).
export function lensIdFor(combo: ComboWithProvenance, supplier: string): string | null {
  return combo.provenance[supplier]?.sourceLensId ?? null;
}

export interface CombosResult {
  combos: ComboWithProvenance[];
  approved: number;
  mapped: number;
  supplierRowCounts: Record<string, number>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// rows: lens rows already resolved to readable supplier/mftype/lenstype/material names.
export function combosFromRows(rows: LensRow[]): CombosResult {
  const coverage: Record<string, Record<string, number>> = {};
  const meta: Record<string, { treatment: string; tier: string; material: string; mftype: string | null }> = {};
  const prov: Record<string, Record<string, SupplierProvenance>> = {};
  const supplierRowCounts: Record<string, number> = {};
  let approved = 0;
  let mapped = 0;

  for (const r of rows) {
    if (!r.supplier || !APPROVED.includes(r.supplier as (typeof APPROVED)[number])) continue;
    approved++;
    supplierRowCounts[r.supplier] = (supplierRowCounts[r.supplier] || 0) + 1;
    if (r.active === false) continue;
    const cost = Number(r.cost);
    if (!Number.isFinite(cost) || cost <= 0) continue;

    const lk = `${r.mftype}|${r.lenstype}`;
    const tier = TIER_MAP[lk];
    if (!tier) continue; // UNMAPPED — not a data error, just outside the known tier map
    const material = normMaterial(r.name, r.material);
    if (!material) continue;
    const treatment = normTreatment(r.name);

    const key = `${treatment}||${tier}||${material}`;
    meta[key] = { treatment, tier, material, mftype: r.mftype };
    const cov = (coverage[key] ??= {});
    const pr = (prov[key] ??= {});
    const p = (pr[r.supplier] ??= { sourceName: r.name, sourceCost: r2(cost), sourceLensId: r.id, rowCount: 0, allRows: [] });
    p.rowCount++;
    p.allRows.push({ name: r.name, cost: r2(cost), lensId: r.id });
    // Take the CHEAPEST row per supplier per combo as that supplier's quote —
    // a supplier can have several product-name sub-variants that all
    // classify into the same combo (explains "multiple lenses rows per
    // supplier per combo" from the live-data check in BS1-01/02). Its lens_id
    // travels with it so a resolved supplier can be turned back into an
    // allocatable lens row (see lensIdFor below).
    if (r2(cost) < p.sourceCost) {
      p.sourceCost = r2(cost);
      p.sourceName = r.name;
      p.sourceLensId = r.id;
    }
    if (cov[r.supplier] == null || cost < cov[r.supplier]) cov[r.supplier] = r2(cost);
    mapped++;
  }

  for (const k in prov) {
    for (const s in prov[k]) {
      prov[k][s].allRows = prov[k][s].allRows.sort((a, b) => a.cost - b.cost).slice(0, 6);
    }
  }

  const combos: ComboWithProvenance[] = Object.entries(coverage).map(([key, sup]) => {
    const items = Object.entries(sup);
    const anchor = items.reduce((a, b) => (b[1] > a[1] ? b : a));
    const cheap = items.reduce((a, b) => (b[1] < a[1] ? b : a));
    return {
      key,
      ...meta[key],
      suppliers: sup,
      provenance: prov[key],
      anchorCost: anchor[1],
      anchorSupplier: anchor[0],
      cheapestCost: cheap[1],
      cheapestSupplier: cheap[0],
      supplierCount: items.length,
    };
  });

  return { combos, approved, mapped, supplierRowCounts };
}

// ── Per-row classification review (not just the aggregated combos) ─────────
// Auto Price only needs the eligible/aggregated view (combosFromRows above).
// The classification review page needs the OPPOSITE: every row, including
// ineligible ones, with a reason it didn't classify — mirrors the same
// filter chain as combosFromRows, in the same order, so the two can never
// silently disagree about what counts as classified.
export type ClassificationStatus =
  | "classified"
  | "unapproved_supplier"
  | "inactive"
  | "excluded_from_anchor"
  | "invalid_cost"
  | "quote_only"
  | "unmapped_tier"
  | "unmapped_material";

export interface ClassifiedLensRow {
  row: LensRow;
  status: ClassificationStatus;
  comboKey: string | null;
  treatment: string | null;
  tier: string | null;
  material: string | null;
}

export function classifyLensRows(rows: LensRow[]): ClassifiedLensRow[] {
  return rows.map((row): ClassifiedLensRow => {
    const unclassified = (status: ClassificationStatus, tier: string | null = null): ClassifiedLensRow => ({
      row,
      status,
      comboKey: null,
      treatment: null,
      tier,
      material: null,
    });

    if (!row.supplier || !APPROVED.includes(row.supplier as (typeof APPROVED)[number])) {
      return unclassified("unapproved_supplier");
    }
    if (row.active === false) return unclassified("inactive");
    if (row.excludedFromAnchor) return unclassified("excluded_from_anchor");
    const cost = Number(row.cost);
    if (!Number.isFinite(cost) || cost <= 0) return unclassified("invalid_cost");

    const designKey = `${row.mftype}|${row.lenstype}`;
    // QUOTE_ONLY designs are deliberately absent from TIER_MAP (specialty
    // items kept out of the standard matrix by design) — report them
    // distinctly so the review page doesn't flag an intentional exclusion
    // as if it were a gap needing a TIER_MAP entry.
    if (QUOTE_ONLY.has(designKey)) return unclassified("quote_only");

    const tier = TIER_MAP[designKey];
    if (!tier) return unclassified("unmapped_tier");
    const material = normMaterial(row.name, row.material);
    if (!material) return unclassified("unmapped_material", tier);

    const treatment = normTreatment(row.name);
    return { row, status: "classified", comboKey: `${treatment}||${tier}||${material}`, treatment, tier, material };
  });
}

// ── Live fetch (in-process — no external REST pull) ────────────────────────
const SELECT =
  "id,name,base_price,is_active,excluded_from_anchor,excluded_reason,excluded_at,supplier:suppliers(name),brand:brands(name),mftype:mftypes(name),lenstype:lenstypes(name),material:materials(name)";

function pickName(v: { name: string } | { name: string }[] | null): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0]?.name ?? null : v.name ?? null;
}

export async function fetchApprovedLensRows(): Promise<LensRow[]> {
  const rows: LensRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (supabase.from("lenses") as any)
      .select(SELECT)
      .eq("is_active", true)
      .eq("excluded_from_anchor", false)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data as any[]) {
      rows.push({
        id: row.id,
        name: row.name,
        supplier: pickName(row.supplier),
        brand: pickName(row.brand),
        mftype: pickName(row.mftype),
        lenstype: pickName(row.lenstype),
        material: pickName(row.material),
        cost: row.base_price,
        active: row.is_active,
      });
    }
    if (data.length < PAGE) break;
  }
  return rows;
}

export async function buildCombos(): Promise<CombosResult> {
  const rows = await fetchApprovedLensRows();
  return combosFromRows(rows);
}

// Unfiltered — includes inactive/excluded rows and their excludedFromAnchor
// flag, unlike fetchApprovedLensRows (which pre-filters for Auto Price, so
// those rows never even reach it). Only the classification review page uses
// this; Auto Price's eligibility filtering is unaffected by adding it.
export async function fetchAllLensRowsForReview(): Promise<LensRow[]> {
  const rows: LensRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (supabase.from("lenses") as any).select(SELECT).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data as any[]) {
      rows.push({
        id: row.id,
        name: row.name,
        supplier: pickName(row.supplier),
        brand: pickName(row.brand),
        mftype: pickName(row.mftype),
        lenstype: pickName(row.lenstype),
        material: pickName(row.material),
        cost: row.base_price,
        active: row.is_active,
        excludedFromAnchor: row.excluded_from_anchor === true,
        excludedReason: row.excluded_reason ?? null,
        excludedAt: row.excluded_at ?? null,
      });
    }
    if (data.length < PAGE) break;
  }
  return rows;
}

// Upsert every distinct (treatment, tier, material) discovered into
// pricing_items — the stable id downstream tables (pricelist_lines,
// price_change_proposals, pricelist_drift) key off. Safe to call repeatedly.
// Auto Price only needs the upsert side-effect (matrix_allocations doesn't
// reference pricing_items); Save needs the ids back, hence the split below.
export async function upsertPricingItems(combos: ComboWithProvenance[]): Promise<void> {
  if (!combos.length) return;
  await upsertAndResolvePricingItemIds(combos.map((c) => ({ treatment: c.treatment, tier: c.tier, material: c.material })));
}

// Same upsert, but returns comboKey ("treatment||tier||material") -> id so
// callers that need to write pricelist_lines (Save/Save As New) can resolve
// item_ref without a second round trip per row.
export async function upsertAndResolvePricingItemIds(
  items: Array<{ treatment: string; tier: string; material: string }>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!items.length) return map;
  const rows = items.map((i) => ({ treatment: i.treatment, tier: i.tier, material: i.material }));
  const { error: upsertError } = await (supabase.from("pricing_items") as any).upsert(rows, {
    onConflict: "treatment,tier,material",
    ignoreDuplicates: true,
  });
  if (upsertError) throw upsertError;

  // Upsert with ignoreDuplicates doesn't reliably return pre-existing rows,
  // so re-select for exactly the treatments involved (cheap — pricing_items
  // stays small, bounded by combo diversity, not by lens row count).
  const distinctTreatments = [...new Set(items.map((i) => i.treatment))];
  const { data, error: selectError } = await (supabase.from("pricing_items") as any)
    .select("id,treatment,tier,material")
    .in("treatment", distinctTreatments);
  if (selectError) throw selectError;
  for (const row of (data ?? []) as any[]) {
    map.set(`${row.treatment}||${row.tier}||${row.material}`, row.id);
  }
  return map;
}

// Wraps BS1-02's toggle_anchor_exclusion RPC — persistent, catalog-wide
// exclusion of one lens row from every combo's anchor calculation, not a
// session-only override. Used by Auto Price's review step so excluding a
// supplier there has the same lasting effect as excluding it from
// /admin/pricing/catalog directly.
export async function excludeLensFromAnchor(lensId: string, reason: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("toggle_anchor_exclusion", {
    p_lens_id: lensId,
    p_excluded: true,
    p_reason: reason,
  });
  if (error) throw error;
}

// Bulk version — kicking out a whole supplier or brand one lens at a time
// isn't practical past a handful of SKUs. p_excluded=false restores them
// (same RPC handles both directions, matching toggle_anchor_exclusion).
export async function bulkSetAnchorExclusion(lensIds: string[], excluded: boolean, reason?: string): Promise<number> {
  if (!lensIds.length) return 0;
  const { data, error } = await (supabase.rpc as any)("bulk_toggle_anchor_exclusion", {
    p_lens_ids: lensIds,
    p_excluded: excluded,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
