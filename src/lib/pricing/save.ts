/**
 * save.ts — BS1-05 task 7: commit the matrix editor's current state into
 * BS1-04's actual price authority (pricelist_lines), via set_master_price()/
 * set_custom_price(). Auto Price only fills matrix_allocations (the
 * structural "which lens fulfils this cell" layer, unchanged table); this
 * is the separate step that writes the resolved price into the layer
 * effective_price() — and eventually the portal/Rx form — actually reads.
 *
 * Deliberately does NOT reuse classifyLensRows()'s eligibility gates
 * (approved supplier / active / excluded / cost). A cell in the matrix was
 * either auto-priced (already eligible when Auto Price ran) or linked by
 * hand (the operator's own decision) — Save commits what's already decided,
 * it doesn't re-validate. It only needs tier/treatment/material to resolve
 * which pricing_item a cell belongs to.
 */
import { supabase } from "@/integrations/supabase/client";
import { normMaterial, normTreatment, TIER_MAP } from "./classifier";
import { upsertAndResolvePricingItemIds } from "./combos";
import type { MatrixAllocation } from "@/hooks/useMatrixAllocations";

export interface LensLookupRow {
  name: string;
  mftype: string | null;
  lenstype: string | null;
  material: string | null;
}

export function resolveComboForLens(lens: LensLookupRow): { treatment: string; tier: string; material: string; comboKey: string } | null {
  const tier = TIER_MAP[`${lens.mftype}|${lens.lenstype}`];
  if (!tier) return null;
  const material = normMaterial(lens.name, lens.material);
  if (!material) return null;
  const treatment = normTreatment(lens.name);
  return { treatment, tier, material, comboKey: `${treatment}||${tier}||${material}` };
}

export interface SavePlanItem {
  allocationId: number;
  lensName: string;
  comboKey: string;
  pricingItemId: string;
  priceUSD: number;
}

export interface SavePlan {
  items: SavePlanItem[];
  skippedUnlinked: number; // no lens_id or no price on the cell
  skippedUnresolvable: number; // linked lens's mftype/lenstype/name doesn't resolve to a combo
}

async function buildPlanItems(
  allocations: MatrixAllocation[],
  lensLookup: Map<string, LensLookupRow>,
  fxRate: number
): Promise<{ resolved: Array<{ allocation: MatrixAllocation; combo: NonNullable<ReturnType<typeof resolveComboForLens>>; lensName: string }>; skippedUnlinked: number; skippedUnresolvable: number }> {
  const resolved: Array<{ allocation: MatrixAllocation; combo: NonNullable<ReturnType<typeof resolveComboForLens>>; lensName: string }> = [];
  let skippedUnlinked = 0;
  let skippedUnresolvable = 0;

  for (const allocation of allocations) {
    if (!allocation.lens_id || allocation.allocated_price_bbd == null) {
      skippedUnlinked++;
      continue;
    }
    const lens = lensLookup.get(allocation.lens_id);
    if (!lens) {
      skippedUnlinked++;
      continue;
    }
    const combo = resolveComboForLens(lens);
    if (!combo) {
      skippedUnresolvable++;
      continue;
    }
    resolved.push({ allocation, combo, lensName: lens.name });
  }

  return { resolved, skippedUnlinked, skippedUnresolvable };
}

// ── Save: commit to the master pricelist ────────────────────────────────
export async function computeSavePlan(allocations: MatrixAllocation[], lensLookup: Map<string, LensLookupRow>, fxRate: number): Promise<SavePlan> {
  const { resolved, skippedUnlinked, skippedUnresolvable: initialUnresolvable } = await buildPlanItems(allocations, lensLookup, fxRate);
  if (!resolved.length) return { items: [], skippedUnlinked, skippedUnresolvable: initialUnresolvable };

  const idMap = await upsertAndResolvePricingItemIds(resolved.map((r) => r.combo));
  const items: SavePlanItem[] = [];
  let skippedUnresolvable = initialUnresolvable;
  for (const r of resolved) {
    const pricingItemId = idMap.get(r.combo.comboKey);
    if (!pricingItemId) {
      skippedUnresolvable++; // pricing_items upsert/select raced or failed silently — treat as unresolvable
      continue;
    }
    const priceUSD = Math.round(r.allocation.allocated_price_bbd! * fxRate * 100) / 100;
    items.push({ allocationId: r.allocation.id, lensName: r.lensName, comboKey: r.combo.comboKey, pricingItemId, priceUSD });
  }
  return { items, skippedUnlinked, skippedUnresolvable };
}

export async function applySavePlan(items: SavePlanItem[]): Promise<number> {
  let applied = 0;
  for (const item of items) {
    const { error } = await (supabase.rpc as any)("set_master_price", { p_item_ref: item.pricingItemId, p_price: item.priceUSD });
    if (error) throw error;
    applied++;
  }
  return applied;
}

// ── Save As New: fork sparse deltas to one customer ─────────────────────
export interface ForkPlanItem extends SavePlanItem {
  masterPriceUSD: number | null;
}

export interface ForkPlan {
  items: ForkPlanItem[]; // only items that DIFFER from master — the sparse delta
  skippedUnlinked: number;
  skippedUnresolvable: number;
  skippedNoChange: number; // matches master already, no fork line needed
}

async function fetchMasterPrices(pricingItemIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!pricingItemIds.length) return map;
  const { data, error } = await (supabase.from("pricelist_lines") as any)
    .select("item_ref,custom_price,pricelists!inner(kind)")
    .eq("pricelists.kind", "master")
    .in("item_ref", pricingItemIds);
  if (error) throw error;
  for (const row of (data ?? []) as any[]) map.set(row.item_ref, row.custom_price);
  return map;
}

export async function computeForkPlan(allocations: MatrixAllocation[], lensLookup: Map<string, LensLookupRow>, fxRate: number): Promise<ForkPlan> {
  const { resolved, skippedUnlinked, skippedUnresolvable } = await buildPlanItems(allocations, lensLookup, fxRate);
  if (!resolved.length) return { items: [], skippedUnlinked, skippedUnresolvable, skippedNoChange: 0 };

  const idMap = await upsertAndResolvePricingItemIds(resolved.map((r) => r.combo));
  const candidates: Array<{ r: (typeof resolved)[number]; pricingItemId: string; priceUSD: number }> = [];
  let localUnresolvable = skippedUnresolvable;
  for (const r of resolved) {
    const pricingItemId = idMap.get(r.combo.comboKey);
    if (!pricingItemId) {
      localUnresolvable++;
      continue;
    }
    const priceUSD = Math.round(r.allocation.allocated_price_bbd! * fxRate * 100) / 100;
    candidates.push({ r, pricingItemId, priceUSD });
  }

  const masterPrices = await fetchMasterPrices(candidates.map((c) => c.pricingItemId));
  const items: ForkPlanItem[] = [];
  let skippedNoChange = 0;
  for (const c of candidates) {
    const masterPriceUSD = masterPrices.get(c.pricingItemId) ?? null;
    // A cent of float noise shouldn't fork a line that's really unchanged.
    if (masterPriceUSD != null && Math.abs(masterPriceUSD - c.priceUSD) < 0.005) {
      skippedNoChange++;
      continue;
    }
    items.push({
      allocationId: c.r.allocation.id,
      lensName: c.r.lensName,
      comboKey: c.r.combo.comboKey,
      pricingItemId: c.pricingItemId,
      priceUSD: c.priceUSD,
      masterPriceUSD,
    });
  }

  return { items, skippedUnlinked, skippedUnresolvable: localUnresolvable, skippedNoChange };
}

export async function applyForkPlan(customerId: number, items: ForkPlanItem[], reason: string): Promise<number> {
  let applied = 0;
  for (const item of items) {
    const { error } = await (supabase.rpc as any)("set_custom_price", {
      p_customer_id: customerId,
      p_item_ref: item.pricingItemId,
      p_price: item.priceUSD,
      p_reason: reason,
      p_source: "manual",
    });
    if (error) throw error;
    applied++;
  }
  return applied;
}
