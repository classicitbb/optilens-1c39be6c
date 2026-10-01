// Lens advice: non-blocking tips on the lens card that follow the prescription and
// the frame. The lens pickers show everything on the pricelist; the Rx and frame
// never hide or forbid a choice (domain/catalog.ts). What they can do is suggest —
// "a higher index will be thinner", "rimless wants polycarbonate" — with a one-tap
// switch, and the person can dismiss any tip. A tip never blocks submit.
//
// Thresholds live in rx_lens_advice_rules (admin-editable); DEFAULT_ADVICE_RULES
// are the seeded values, used until the table has loaded and in the dev bench.
// Pure: no DOM, no network.
import type { Combo, Triple } from "./catalog";
import type { Eye, RxEyeValues } from "./validate";

export interface AdviceRule {
  code: string;
  active: boolean;
  params: Record<string, unknown>;
}

/** The values seeded into rx_lens_advice_rules (migration 20261001170000). */
export const DEFAULT_ADVICE_RULES: readonly AdviceRule[] = [
  { code: "high_power_index", active: true, params: { min_sph: 6, min_cyl: 4, min_index: 1.6 } },
  { code: "rimless_impact", active: true, params: { mounts: ["rimless", "grooved"], safe_materials: "polycarbonate|poly|trivex|1\\.5[3-9]" } },
  { code: "large_ed_thickness", active: true, params: { min_ed: 65, min_sph: 4 } },
  { code: "thinning_addon", active: true, params: { min_sph: 6, min_cyl: 4, treatment_match: "thinning" } },
];

export type AdviceAction =
  | { kind: "material"; id: string; label: string }
  | { kind: "treatment"; id: string; label: string };

export interface Advice {
  /** The rule's code — also what a dismissal remembers. */
  id: string;
  text: string;
  action?: AdviceAction;
}

interface Item { id: string; n: string }

export interface AdviceInput {
  eyes: readonly Eye[];
  rows: Partial<Record<Eye, RxEyeValues>>;
  mount: string;
  /** The ED in force (typed, estimated or read off an outline). */
  ed: number | null;
  /** The lens picks, right/shared first. */
  sides: readonly Triple[];
  materials: readonly Item[];
  combos: readonly Combo[];
  treatments: readonly Item[];
  selectedTreatments: readonly string[];
}

/** A material's refractive index from its name; null when the name does not say. */
export function materialIndex(name: string): number | null {
  const m = /\b1\.(\d{2})\b/.exec(name);
  if (m) return Number(`1.${m[1]}`);
  if (/trivex/i.test(name)) return 1.53;
  if (/polycarbonate|\bpoly\b/i.test(name)) return 1.59;
  if (/plastic|cr[- ]?39|\bcr\b|standard/i.test(name)) return 1.5;
  return null;
}

const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** The largest |sphere| and |cylinder| across the eyes being supplied. */
function reach(input: AdviceInput): { sph: number; cyl: number } {
  let sph = 0;
  let cyl = 0;
  for (const e of input.eyes) {
    const r = input.rows[e];
    if (!r) continue;
    sph = Math.max(sph, Math.abs(r.sph ?? 0));
    cyl = Math.max(cyl, Math.abs(r.cyl ?? 0));
  }
  return { sph, cyl };
}

const fmt = (n: number) => n.toFixed(2);

export function lensAdvice(input: AdviceInput, rules: readonly AdviceRule[] = DEFAULT_ADVICE_RULES): Advice[] {
  const job = input.sides[0];
  // Tips are about a lens that has been chosen.
  if (!job?.m) return [];
  const current = input.materials.find((x) => x.id === job.m);
  const currentIndex = current ? materialIndex(current.n) : null;
  const power = reach(input);
  const out: Advice[] = [];
  const active = (code: string) => rules.find((r) => r.code === code && r.active)?.params;

  /** Materials this design is made in, other than the current one. */
  const alternatives = () => input.materials.filter((x) => x.id !== job.m && input.combos.some((c) => c.m === x.id && (!job.d || c.d === job.d)));

  const high = active("high_power_index");
  if (high && currentIndex !== null && (power.sph >= num(high.min_sph, 6) || power.cyl >= num(high.min_cyl, 4))) {
    const minIndex = num(high.min_index, 1.6);
    if (currentIndex < minIndex) {
      // the lowest index that clears the bar: thin enough without paying for more than needed
      const next = alternatives()
        .map((x) => ({ x, i: materialIndex(x.n) }))
        .filter((c): c is { x: Item; i: number } => c.i !== null && c.i >= minIndex)
        .sort((a, b) => a.i - b.i)[0];
      if (next) {
        out.push({
          id: "high_power_index",
          text: `Power reaches ${fmt(power.sph >= num(high.min_sph, 6) ? power.sph : power.cyl)} — a higher index lens (${next.x.n}) will be thinner and lighter.`,
          action: { kind: "material", id: next.x.id, label: `Switch to ${next.x.n}` },
        });
      }
    }
  }

  const rimless = active("rimless_impact");
  const mounts = Array.isArray(rimless?.mounts) ? (rimless.mounts as unknown[]).map(String) : [];
  if (rimless && mounts.includes(input.mount) && current) {
    const safe = new RegExp(String(rimless.safe_materials ?? "polycarbonate|trivex"), "i");
    if (!safe.test(current.n) && (currentIndex === null || currentIndex < 1.53)) {
      const alt = alternatives().find((x) => /polycarbonate|\bpoly\b|trivex/i.test(x.n));
      out.push({
        id: "rimless_impact",
        text: `${input.mount === "rimless" ? "Rimless" : "Grooved"} frames are drilled or cut into the lens — polycarbonate or Trivex resists cracking better than standard plastic.`,
        action: alt ? { kind: "material", id: alt.id, label: `Switch to ${alt.n}` } : undefined,
      });
    }
  }

  const large = active("large_ed_thickness");
  if (large && input.ed !== null && input.ed >= num(large.min_ed, 65) && power.sph >= num(large.min_sph, 4)) {
    out.push({
      id: "large_ed_thickness",
      text: `A ${input.ed.toFixed(1)} mm ED with this power makes a thick edge — a higher index lens or a smaller frame will help.`,
    });
  }

  const thin = active("thinning_addon");
  if (thin && (power.sph >= num(thin.min_sph, 6) || power.cyl >= num(thin.min_cyl, 4))) {
    const match = new RegExp(String(thin.treatment_match ?? "thinning"), "i");
    const t = input.treatments.find((x) => match.test(x.n));
    if (t && !input.selectedTreatments.includes(t.id)) {
      out.push({
        id: "thinning_addon",
        text: `Power reaches ${fmt(Math.max(power.sph, power.cyl))} — ${t.n} keeps the edge wearable.`,
        action: { kind: "treatment", id: t.id, label: `Add ${t.n}` },
      });
    }
  }

  return out;
}
