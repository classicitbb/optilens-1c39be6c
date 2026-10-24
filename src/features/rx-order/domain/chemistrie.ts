// Chemistrie magnetic clip-on layers — ported from the engine's configurator
// (rx-order-engine.js, "Chemistrie configurator"). Pure: lists, rules and the
// text that goes to the lab.
//
// Chemistrie is LAB INSTRUCTIONS ONLY until a priced catalogue item and a
// fulfilment contract exist: a clip never creates a quote line, a SKU or a
// charge. Its full specification travels in the order notes, between markers,
// and the structured clips ride on the order payload (`chemistrie`).
//
// Up to three clips per order, each cut to the same shape as the main order.
import { parseNum, signed } from "./parse";

export const CHEM_MAX_CLIPS = 3;

export type ChemType = "sun" | "blue" | "readers" | "drive";

export interface ChemSwatch { id: string; n: string; hex: string }

export const CHEM_TYPES: readonly { id: ChemType; n: string; d: string }[] = [
  { id: "sun", n: "Chemistrie Sun", d: "Magnetic sunlens overlay" },
  { id: "blue", n: "Chemistrie Blue", d: "Blue-light filtering overlay" },
  { id: "readers", n: "Chemistrie Readers", d: "Magnetic near-add overlay" },
  { id: "drive", n: "Chemistrie Drive", d: "Contrast-boosting driving overlay" },
];

export const CHEM_COLOURS: readonly ChemSwatch[] = [
  { id: "Grey", n: "Grey", hex: "#6B7280" }, { id: "Brown", n: "Brown", hex: "#92400E" },
  { id: "G-15", n: "G-15", hex: "#4B5320" }, { id: "Blue", n: "Blue", hex: "#1E40AF" },
  { id: "Copper", n: "Copper", hex: "#B45309" }, { id: "Amber", n: "Amber", hex: "#D97706" },
  { id: "Pink", n: "Pink", hex: "#DB2777" }, { id: "Purple", n: "Purple", hex: "#7C3AED" },
];
export const CHEM_MIRRORS: readonly ChemSwatch[] = [
  { id: "silver", n: "Silver Mirror", hex: "#C0C0C0" }, { id: "gold", n: "Gold Mirror", hex: "#D4AF37" },
  { id: "blue", n: "Blue Mirror", hex: "#3B82F6" }, { id: "green", n: "Green Mirror", hex: "#16A34A" },
  { id: "rosegold", n: "Rose Gold Mirror", hex: "#C7849C" }, { id: "red", n: "Red Mirror", hex: "#DC2626" },
  { id: "orange", n: "Orange Mirror", hex: "#EA580C" }, { id: "purple", n: "Purple Mirror", hex: "#9333EA" },
];
export const CHEM_GRADIENTS: readonly ChemSwatch[] = [
  { id: "Amber", n: "Amber", hex: "#D97706" }, { id: "Violet Rose", n: "Violet Rose", hex: "#A855A2" },
  { id: "Dark Brown", n: "Dark Brown", hex: "#5C3426" }, { id: "Rouge", n: "Rouge", hex: "#A33349" },
  { id: "Dark Grey", n: "Dark Grey", hex: "#4B5563" }, { id: "Violet Grey", n: "Violet Grey", hex: "#77718B" },
  { id: "Crimson Grey", n: "Crimson Grey", hex: "#805768" }, { id: "Medium Brown", n: "Medium Brown", hex: "#8B5E3C" },
];
export const CHEM_MAGNETS: readonly ChemSwatch[] = [
  { id: "Silver", n: "Silver", hex: "#A8A9AD" }, { id: "Gold", n: "Gold", hex: "#D4AF37" }, { id: "Gunmetal", n: "Gunmetal", hex: "#2C3E50" },
];
export const CHEM_BRIDGES: readonly ChemSwatch[] = [
  { id: "Bronze", n: "Bronze", hex: "#CD7F32" }, { id: "Gunmetal", n: "Gunmetal", hex: "#2C3E50" },
  { id: "Gold", n: "Gold", hex: "#D4AF37" }, { id: "Silver", n: "Silver", hex: "#A8A9AD" }, { id: "Black", n: "Black", hex: "#1A1A1A" },
];
export const CHEM_CRYSTALS: readonly ChemSwatch[] = [
  { id: "hematite", n: "Hematite Crystals", hex: "#55565A" }, { id: "hyacinth", n: "Hyacinth Crystals", hex: "#D22630" },
  { id: "crystal-gold", n: "Crystal Gold Crystals", hex: "#D4AF37" }, { id: "cobalt", n: "Cobalt Crystals", hex: "#2453B3" },
  { id: "aquamarine", n: "Aquamarine Crystals", hex: "#35B7E7" }, { id: "emerald", n: "Emerald Crystals", hex: "#009B77" },
  { id: "olivine", n: "Olivine Crystals", hex: "#6B8E23" }, { id: "amethyst", n: "Amethyst Crystals", hex: "#8E55B7" },
  { id: "fireopal", n: "Fireopal Crystals", hex: "#F36C21" }, { id: "rose", n: "Rose Crystals", hex: "#EFA0B5" },
  { id: "topaz", n: "Topaz Crystals", hex: "#D99A27" }, { id: "diamond", n: "Diamond Crystals", hex: "#F5F7FA" },
];

/** Reader powers +0.50…+2.50; blue-light powers plano…+2.00, in quarter steps. */
export const CHEM_READER_POWERS: readonly string[] = Array.from({ length: 9 }, (_, i) => (0.5 + i * 0.25).toFixed(2));
export const CHEM_BLUE_POWERS: readonly string[] = Array.from({ length: 9 }, (_, i) => (i * 0.25).toFixed(2));

export interface ChemClip {
  id: string;
  type: ChemType;
  /** Sun only: exactly one of colour / mirror / gradient. */
  colour: string;
  mirror: string;
  gradient: string;
  polarised: boolean;
  /** Reader / blue-light power, as text ("0.50"). */
  add: string;
  magnet: string;
  bridge: string;
  /** "none" or a crystal id. */
  crystal: string;
}

let seq = 0;
const nextId = () => `clip${++seq}`;

/** A fresh clip, defaulting to a layer type this order does not already use. */
export function newClip(existing: readonly ChemClip[]): ChemClip {
  const used = new Set(existing.map((c) => c.type));
  const type = (CHEM_TYPES.find((t) => !used.has(t.id)) ?? CHEM_TYPES[0]).id;
  return {
    id: nextId(), type, colour: "", mirror: "", gradient: "", polarised: type === "sun",
    add: "", magnet: "Silver", bridge: "Black", crystal: "none",
  };
}

/** Whether a clip has everything it needs. */
export function clipComplete(c: ChemClip | null | undefined): boolean {
  if (!c || !c.type) return false;
  if (c.type === "readers") return CHEM_READER_POWERS.includes(c.add);
  if (c.type === "blue") return CHEM_BLUE_POWERS.includes(c.add);
  if (c.type === "drive") return true;
  // sun: exactly one of solid / mirror / gradient
  return Number(!!c.colour) + Number(!!c.mirror) + Number(!!c.gradient) === 1;
}

const clipKey = (c: ChemClip) => [c.type, c.colour, c.mirror, c.gradient, c.polarised, c.add, c.magnet, c.bridge, c.crystal].join("|");

/** Ids of clips identical to another clip on the order. */
export function duplicateClipIds(clips: readonly ChemClip[]): Set<string> {
  const seen = new Map<string, string>();
  const dupes = new Set<string>();
  for (const c of clips) {
    const k = clipKey(c);
    const earlier = seen.get(k);
    if (earlier) { dupes.add(c.id); dupes.add(earlier); } else seen.set(k, c.id);
  }
  return dupes;
}

/** Everything wrong with the clips on an order (empty when fine). */
export function clipIssues(clips: readonly ChemClip[]): string[] {
  const out: string[] = [];
  clips.forEach((c, i) => { if (!clipComplete(c)) out.push(`Chemistrie clip ${i + 1} is not complete.`); });
  if (duplicateClipIds(clips).size) out.push("Two Chemistrie clips are identical — change one or remove it.");
  return out;
}

/** Change one option of a clip, keeping solid / mirror / gradient mutually exclusive. */
export function setClipField(c: ChemClip, field: "colour" | "mirror" | "gradient" | "add" | "magnet" | "bridge" | "crystal", value: string): ChemClip {
  const next: ChemClip = { ...c, [field]: value };
  if (field === "colour" && value) { next.mirror = ""; next.gradient = ""; }
  if (field === "mirror" && value) { next.colour = ""; next.gradient = ""; }
  if (field === "gradient" && value) { next.colour = ""; next.mirror = ""; }
  if (next.type === "sun") next.polarised = true;
  return next;
}

/** Change a clip's layer type: its type-specific options start again. */
export const setClipType = (c: ChemClip, type: ChemType): ChemClip =>
  c.type === type ? c : { ...c, type, colour: "", mirror: "", gradient: "", add: "", polarised: type === "sun" };

const nameOf = (items: readonly ChemSwatch[], id: string, fallback: string) => items.find((x) => x.id === id)?.n || fallback;

/** The specification parts of one clip, as the lab reads them. */
export function clipParts(c: ChemClip): string[] {
  const type = CHEM_TYPES.find((x) => x.id === c.type) ?? CHEM_TYPES[0];
  const parts: string[] = [type.n];
  if (type.id === "readers" || type.id === "blue") {
    const power = parseNum(c.add, true);
    parts.push((type.id === "blue" ? "Blue light power: " : "Reader power: ") + (power === null ? "—" : power === 0 ? "Plano" : signed(power)));
  } else if (type.id === "sun") {
    if (c.colour) parts.push("Solid polarised: " + nameOf(CHEM_COLOURS, c.colour, c.colour));
    if (c.mirror) parts.push("Mirror polarised: " + nameOf(CHEM_MIRRORS, c.mirror, c.mirror));
    if (c.gradient) parts.push("Gradient polarised: " + nameOf(CHEM_GRADIENTS, c.gradient, c.gradient));
  }
  if (type.id === "drive") parts.push("Fixed rose tint · non-polarised");
  if (type.id === "sun") parts.push("Polarised: Yes");
  parts.push("Magnet: " + nameOf(CHEM_MAGNETS, c.magnet, "Silver"));
  parts.push("Bridge: " + nameOf(CHEM_BRIDGES, c.bridge, "Black"));
  parts.push("Crystal: " + nameOf(CHEM_CRYSTALS, c.crystal, "None"));
  return parts;
}

export const clipSummary = (c: ChemClip, index: number) => `Chemistrie clip ${index + 1} — ${clipParts(c).join(" · ")}`;

export const CHEM_NOTES_START = "[Chemistrie specifications]";
export const CHEM_NOTES_END = "[/Chemistrie specifications]";

/** The marked block that carries every clip's specification in the lab notes. */
export const labNotes = (clips: readonly ChemClip[]): string =>
  clips.length ? `${CHEM_NOTES_START}\n${clips.map(clipSummary).join("\n")}\n${CHEM_NOTES_END}` : "";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Remove any Chemistrie block from notes (so it is regenerated, never duplicated). */
export const stripChemNotes = (value: string | null | undefined): string =>
  String(value ?? "").replace(new RegExp(`\\s*${escapeRe(CHEM_NOTES_START)}[\\s\\S]*?${escapeRe(CHEM_NOTES_END)}\\s*`, "g"), "\n").trim();

/** The person's own notes followed by the generated Chemistrie block. */
export const notesWithChemistrie = (manualNotes: string, clips: readonly ChemClip[]): string =>
  [stripChemNotes(manualNotes), labNotes(clips)].filter(Boolean).join("\n\n");

/**
 * A clip from a saved order, tidied: type-specific fields only where they apply,
 * the old "Black" magnet mapped to Silver, powers normalised to two decimals.
 */
export function normaliseSavedClip(raw: unknown): ChemClip {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const type: ChemType = CHEM_TYPES.some((t) => t.id === c.type) ? c.type : "sun";
  const sun = type === "sun";
  return {
    id: typeof c.id === "string" && c.id ? c.id : nextId(),
    type,
    colour: sun ? c.colour || "" : "",
    mirror: sun && c.mirror !== "none" ? c.mirror || "" : "",
    gradient: sun ? c.gradient || "" : "",
    polarised: sun,
    add: (type === "blue" || type === "readers") && c.add !== "" && c.add != null && Number.isFinite(Number(c.add)) ? Number(c.add).toFixed(2) : "",
    magnet: c.magnet === "Black" ? "Silver" : c.magnet || "Silver",
    bridge: c.bridge || "Black",
    crystal: c.crystal || "none",
  };
}
