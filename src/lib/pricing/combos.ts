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
import { APPROVED, normMaterial, normTreatment, TIER_MAP } from "./classifier";
import type { Combo } from "./engine";

export interface LensRow {
  id: string;
  name: string;
  supplier: string | null;
  mftype: string | null;
  lenstype: string | null;
  material: string | null;
  cost: number | null;
  active: boolean;
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

// ── Live fetch (in-process — no external REST pull) ────────────────────────
const SELECT = "id,name,base_price,is_active,excluded_from_anchor,supplier:suppliers(name),mftype:mftypes(name),lenstype:lenstypes(name),material:materials(name)";

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

// Upsert every distinct (treatment, tier, material) discovered into
// pricing_items — the stable id downstream tables (pricelist_lines,
// price_change_proposals, pricelist_drift) key off. Safe to call repeatedly.
export async function upsertPricingItems(combos: ComboWithProvenance[]): Promise<void> {
  if (!combos.length) return;
  const rows = combos.map((c) => ({ treatment: c.treatment, tier: c.tier, material: c.material }));
  const { error } = await (supabase.from("pricing_items") as any).upsert(rows, {
    onConflict: "treatment,tier,material",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}
