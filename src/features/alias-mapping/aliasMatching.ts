// Matching CV priced lenses to Innovations aliases.
//
// The two catalogues describe the same lenses at different granularity. A CV
// priced row is `material · mftype · lenstype · option`, and BOTH lenstype and
// option are header names that roll several Innovations records into one
// sellable line:
//
//   lenstype "Endless Steady"  → Innovations style codes 02262 and 02285
//                                (the D / N / I sub-designs)
//   option   "TGNS"            → TGNS Gray, Brown, Green, Amber, Amethyst,
//                                Emerald, Sapphire, Ruby
//
// An Innovations alias is fully specified (material_code + style_code +
// color_code). So one CV row legitimately maps to MANY aliases — measured
// average 8.6 — and that fan-out is the thing the mapping screen curates. A
// multi-alias result is the correct answer here, not an over-match.
//
// The colour comes from the lens's `lens_lens_options` row, never from its
// name. Every active lens has exactly one, and names disagree with it often
// enough to matter ("1.53 LBUC PROG Endless Steady SR Coated" carries the
// option "Clear").

export interface MatchableAlias {
  alias: string;
  style_code: string;
  style_description: string;
  material_description: string;
  color_code: string;
  color_description: string;
  mf_type: string;
  pricing_key: string;
}

export interface MatchableLens {
  id: string;
  name: string;
  material?: { name?: string | null } | null;
  mftype?: { name?: string | null } | null;
  lenstype?: { name?: string | null } | null;
  lens_lens_options?: Array<{
    lens_option_id?: string;
    lens_option?: { name?: string | null } | null;
  }> | null;
}

export type MatchKind = "exact" | "family" | "synonym";

export interface LensMatch {
  /** Every alias in the lens's pricing_key group, ordered by style then colour. */
  group: MatchableAlias[];
  /** The subset the rules propose enabling. Empty when nothing matched. */
  proposed: MatchableAlias[];
  kind: MatchKind | null;
  /** The CV option name the proposal was derived from. */
  optionName: string;
  optionId: string | null;
  /** Distinct Innovations style codes covered by the proposal. */
  styleCodes: string[];
  /** Human-readable justification shown next to the pre-ticked colours. */
  reason: string | null;
}

// Whitespace/case only — both sides are generated from the same source
// strings, so anything looser would be inventing equivalences.
export const normKey = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

// Colour comparison ignores punctuation and spacing: "SR Coated", "SRCoated"
// and "SR-Coated" are one value, and "XtrActive NG" must be able to reach
// "XtrActvNG Gray".
export const normColour = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Alternate prefixes tried when a CV option name doesn't literally begin an
 * Innovations colour. Seeded from the options that failed to match against the
 * live catalogue, commonest first.
 *
 * Kept as code rather than a table so changes are reviewable in git and
 * covered by tests, and because adding a table would need a migration. If
 * operators ever need to edit these without a deploy, move it to a small
 * reference table and read it here — the matching rules don't care where the
 * list comes from.
 */
export const COLOUR_SYNONYMS: Record<string, string[]> = {
  clear: ["uncoated"],
  polarized: ["polar"],
  photochromic: ["photo", "trans", "sunsync", "xtractive", "vantage"],
  xtractiveng: ["xtractvng"],
  blueblockuv420: ["blueblock", "blupro", "bluepro"],
  srcoated: ["src"],
};

export const lensGroupKey = (lens: MatchableLens) =>
  normKey(`${lens.material?.name ?? ""} | ${lens.mftype?.name ?? ""} | ${lens.lenstype?.name ?? ""}`);

export const lensOption = (lens: MatchableLens) => {
  const row = lens.lens_lens_options?.[0];
  return { name: row?.lens_option?.name ?? "", id: row?.lens_option_id ?? null };
};

const byStyleThenColour = (a: MatchableAlias, b: MatchableAlias) =>
  a.style_code.localeCompare(b.style_code) || a.color_code.localeCompare(b.color_code);

/**
 * Why a lens found no group in the SYNCED ALIAS CATALOGUE.
 *
 * The distinction matters: our mirror is not the Innovations lens database, it
 * is whatever the office export sends. Innovations carries 1.60 Index (and
 * 1.546 / 1.56 / 1.565 / 1.581 / 1.595), but no alias in the mirror mentions
 * any of them — so "absent" here means absent from the feed, and the fix is
 * usually to widen the export rather than to rename anything on our side.
 *
 * Compared on the `pricing_key` segments, NOT on material_description /
 * style_description. Those are the Innovations-side labels ("1.67 Index",
 * "Poly 1.59") while pricing_key carries the CV-side ones ("1.67 High Index",
 * "Poly"), and the group key is built from pricing_key — so diagnosing against
 * the other field reports mismatches that are only a difference in vocabulary.
 */
export type MissingReason = "style_absent" | "material_absent" | "combination_absent";

export interface AliasIndex {
  groups: Map<string, MatchableAlias[]>;
  styles: Set<string>;
  materials: Set<string>;
  materialStyle: Set<string>;
}

/** Index the alias catalogue by pricing_key ("Material | MFType | Style"). */
export const buildAliasGroups = (aliases: MatchableAlias[]) => {
  const groups = new Map<string, MatchableAlias[]>();
  for (const alias of aliases) {
    const key = normKey(alias.pricing_key);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(alias);
    else groups.set(key, [alias]);
  }
  for (const list of groups.values()) list.sort(byStyleThenColour);
  return groups;
};

/** "Material | MFType | Style" — the same three segments a lens key is built from. */
const pricingKeyParts = (alias: MatchableAlias) => {
  const [material = "", mfType = "", style = ""] = (alias.pricing_key ?? "").split("|").map((s) => normKey(s));
  return { material, mfType, style };
};

export const buildAliasIndex = (aliases: MatchableAlias[]): AliasIndex => {
  const styles = new Set<string>();
  const materials = new Set<string>();
  const materialStyle = new Set<string>();
  for (const alias of aliases) {
    const { material, style } = pricingKeyParts(alias);
    if (style) styles.add(style);
    if (material) materials.add(material);
    if (material && style) materialStyle.add(`${material} | ${style}`);
  }
  return { groups: buildAliasGroups(aliases), styles, materials, materialStyle };
};

/** Classify a lens that produced no group, so the operator gets a worklist. */
export const diagnoseMissingGroup = (lens: MatchableLens, index: AliasIndex): MissingReason => {
  if (!index.styles.has(normKey(lens.lenstype?.name))) return "style_absent";
  if (!index.materials.has(normKey(lens.material?.name))) return "material_absent";
  return "combination_absent";
};

export const MISSING_REASON_TEXT: Record<MissingReason, (lens: MatchableLens) => string> = {
  style_absent: (l) => `No synced alias uses the lens design "${l.lenstype?.name ?? "—"}".`,
  material_absent: (l) => `No synced alias uses the material "${l.material?.name ?? "—"}".`,
  combination_absent: (l) =>
    `Aliases exist for "${l.lenstype?.name ?? "—"}" and for "${l.material?.name ?? "—"}", but not together.`,
};

const describe = (kind: MatchKind, optionName: string, count: number, styleCodes: string[]) => {
  const colours = `${count} colour${count === 1 ? "" : "s"}`;
  const designs = styleCodes.length > 1 ? ` across ${styleCodes.length} sub-designs` : "";
  if (kind === "exact") return `Option "${optionName}" matches ${colours} exactly${designs}.`;
  if (kind === "synonym") return `Option "${optionName}" is our name for ${colours}${designs}.`;
  return `Option "${optionName}" is the header for ${colours}${designs}.`;
};

/**
 * Propose the aliases a lens should be linked to.
 *
 * Rules, in order — the first that yields anything wins:
 *   1. exact   — an alias colour equal to the option
 *   2. family  — alias colours the option is a prefix of ("TGNS" → TGNS Gray…)
 *   3. synonym — the same prefix test using COLOUR_SYNONYMS alternates
 *
 * Aliases spanning several style codes are all included: that is the lenstype
 * header covering its sub-designs, and the caller groups them so an operator
 * can untick a sub-design we don't sell.
 */
export const matchLens = (lens: MatchableLens, groups: Map<string, MatchableAlias[]>): LensMatch => {
  const group = groups.get(lensGroupKey(lens)) ?? [];
  const { name: optionName, id: optionId } = lensOption(lens);
  const empty: LensMatch = { group, proposed: [], kind: null, optionName, optionId, styleCodes: [], reason: null };
  if (!group.length || !optionName) return empty;

  const option = normColour(optionName);
  if (!option) return empty;

  const pick = (predicate: (colour: string) => boolean) =>
    group.filter((alias) => predicate(normColour(alias.color_description)));

  const attempts: Array<[MatchKind, MatchableAlias[]]> = [
    ["exact", pick((colour) => colour === option)],
    ["family", pick((colour) => colour.startsWith(option))],
    ["synonym", pick((colour) => (COLOUR_SYNONYMS[option] ?? []).some((alt) => colour.startsWith(alt)))],
  ];

  for (const [kind, proposed] of attempts) {
    if (!proposed.length) continue;
    const styleCodes = [...new Set(proposed.map((a) => a.style_code))].sort();
    return {
      group,
      proposed,
      kind,
      optionName,
      optionId,
      styleCodes,
      reason: describe(kind, optionName, proposed.length, styleCodes),
    };
  }

  return empty;
};

/** Split a group into its Innovations sub-designs, for the expanded row. */
export const groupByStyle = (aliases: MatchableAlias[]) => {
  const styles = new Map<string, { styleCode: string; styleDescription: string; aliases: MatchableAlias[] }>();
  for (const alias of aliases) {
    const entry = styles.get(alias.style_code);
    if (entry) entry.aliases.push(alias);
    else styles.set(alias.style_code, {
      styleCode: alias.style_code,
      styleDescription: alias.style_description,
      aliases: [alias],
    });
  }
  return [...styles.values()].sort((a, b) => a.styleCode.localeCompare(b.styleCode));
};
