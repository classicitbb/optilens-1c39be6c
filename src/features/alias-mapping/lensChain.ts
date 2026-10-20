// Lens chain: is an Innovations alias fully connected, from the synced catalogue
// to a customer who can order it at a listed price?
//
// The alias is the only identity present at both ends, so the chain is per alias.
// Stages the cloud can compute from data it already holds are evaluated here.
// Stages that live only in Innovations (lens on, price group, Innovations
// pricelist, cost source) are listed as "unknown" until the office pushes them —
// see docs/lens-chain-office-discovery-brief.md.
import { buildPriceLookup, cellForAlias } from "@/features/rx-order/pricing/matrixPricing";

export type StageSource = "innovations" | "cloud";
export type StageStatus = "pass" | "fail" | "unknown";

export const CHAIN_STAGES = [
  { code: "lens_on", source: "innovations", label: "Lens on in Innovations", hint: "Turn the lens on in Innovations." },
  { code: "price_group", source: "innovations", label: "In a price group", hint: "Add the alias to a price group in Innovations." },
  { code: "innovations_pricelist", source: "innovations", label: "On an Innovations pricelist", hint: "Add the lens to a pricelist in Innovations." },
  { code: "cost_source", source: "innovations", label: "Has a cost", hint: "Add a supplier cost list entry, or a reorder cost on the option item." },
  { code: "synced", source: "cloud", label: "Synced to cvweb", hint: "The alias is not in the active cloud catalogue. Run an alias sync." },
  {
    code: "catalog_entry", source: "cloud", label: "Matching catalog entry",
    hint: "No confirmed CV lens is linked. Confirm one on the Mapping tab; lenses missing from the alias feed cannot be mapped.",
  },
  { code: "supplier", source: "cloud", label: "Has a supplier", hint: "Neither the alias nor its linked CV lens names a supplier." },
  {
    code: "classified", source: "cloud", label: "Reaches a price cell",
    hint: "The material index or lens family cannot be derived from this alias, so it cannot reach a price (classifier TIER_MAP or material rule).",
  },
  {
    code: "priced", source: "cloud", label: "Priced on a cvweb pricelist",
    hint: "No pricelist has a price for its cell. It can still be ordered at no charge and Innovations prices it, but it is not complete.",
  },
  { code: "assigned", source: "cloud", label: "Pricelist assigned to a customer", hint: "None of the pricelists that price it is assigned to a customer." },
] as const;

export type StageCode = (typeof CHAIN_STAGES)[number]["code"];

export interface ChainAlias {
  alias: string;
  style_description: string;
  color_description: string;
  mf_type: string;
  pricing_key: string;
  suppliers: string[] | null;
}

export interface ChainAllocation {
  pricelist_version_id: number | null;
  treatment_type: string;
  category: string;
  material_index: string;
  allocated_price_bbd: number | null;
}

export interface ChainInputs {
  aliases: ChainAlias[];
  /** alias -> CV lens ids with a confirmed mapping */
  confirmedLensIdsByAlias: Map<string, string[]>;
  lensById: Map<string, { is_active: boolean; supplier_id: string | null }>;
  versions: { id: number; name: string }[];
  allocations: ChainAllocation[];
  /** pricelist version id -> number of customers assigned to it */
  customersByVersion: Map<number, number>;
}

export interface AliasChain {
  alias: ChainAlias;
  stages: Record<StageCode, StageStatus>;
  /** First stage that failed, in chain order; unknown stages never count. */
  firstBroken: StageCode | null;
  /** Names of the pricelists that price this alias. */
  pricedOn: string[];
  /** Every stage the cloud can evaluate passes. */
  cloudReady: boolean;
}

export function evaluateLensChain(input: ChainInputs): AliasChain[] {
  const lookups = new Map<number, ReturnType<typeof buildPriceLookup>>();
  const byVersion = new Map<number, ChainAllocation[]>();
  for (const row of input.allocations) {
    if (row.pricelist_version_id == null) continue;
    const list = byVersion.get(row.pricelist_version_id) ?? [];
    list.push(row);
    byVersion.set(row.pricelist_version_id, list);
  }
  for (const [id, rows] of byVersion) lookups.set(id, buildPriceLookup(rows));

  return input.aliases.map((alias) => {
    const lensIds = (input.confirmedLensIdsByAlias.get(alias.alias) ?? []).filter((id) => input.lensById.get(id)?.is_active);
    const cell = cellForAlias(alias);
    const pricedVersions = cell
      ? input.versions.filter((v) => lookups.get(v.id)?.(cell) != null)
      : [];

    const stages = {
      lens_on: "unknown",
      price_group: "unknown",
      innovations_pricelist: "unknown",
      cost_source: "unknown",
      synced: "pass",
      catalog_entry: lensIds.length > 0 ? "pass" : "fail",
      supplier: (alias.suppliers?.length ?? 0) > 0 || lensIds.some((id) => input.lensById.get(id)?.supplier_id) ? "pass" : "fail",
      classified: cell ? "pass" : "fail",
      priced: pricedVersions.length > 0 ? "pass" : "fail",
      assigned: pricedVersions.length === 0
        ? "unknown"
        : pricedVersions.some((v) => (input.customersByVersion.get(v.id) ?? 0) > 0) ? "pass" : "fail",
    } satisfies Record<StageCode, StageStatus>;

    const firstBroken = CHAIN_STAGES.find((s) => stages[s.code] === "fail")?.code ?? null;
    return {
      alias,
      stages,
      firstBroken,
      pricedOn: pricedVersions.map((v) => v.name),
      cloudReady: CHAIN_STAGES.every((s) => s.source !== "cloud" || stages[s.code] === "pass"),
    };
  });
}

export interface ChainSummary {
  total: number;
  cloudReady: number;
  /** Aliases whose first failing stage is this one. */
  brokenAt: Record<StageCode, number>;
}

export function summarizeLensChain(chains: AliasChain[]): ChainSummary {
  const brokenAt = Object.fromEntries(CHAIN_STAGES.map((s) => [s.code, 0])) as Record<StageCode, number>;
  let cloudReady = 0;
  for (const c of chains) {
    if (c.cloudReady) cloudReady++;
    if (c.firstBroken) brokenAt[c.firstBroken]++;
  }
  return { total: chains.length, cloudReady, brokenAt };
}
