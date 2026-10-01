// The Rx form's brain, as pure functions: from what the person has typed and
// picked (RxFormValues) and the account's catalogue, derive everything the UI
// shows — validation, section completeness, the live quote, the submit gate —
// and everything a save needs (the cv.rxorder/2 order). No React, no network.
//
// It composes the Phase 1a domain modules; it adds only the glue the engine kept
// in its DOM code (progressive disclosure inputs, coating clashes, the ED and
// blank-diameter estimates, delivery defaults).
import {
  comboOptions, repairTriple, splitLensesDuplicate, tripleComplete, type ComboOptions, type Triple,
} from "../domain/catalog";
import { clipIssues, normaliseSavedClip, notesWithChemistrie, stripChemNotes } from "../domain/chemistrie";
import { parseNum, SHORTHAND_FIELDS } from "../domain/parse";
import { hasOutline, shapeFromPayload, shapeGeometry, shapeToPayload, type ShapeGeometry } from "../domain/shape";
import { STD_SHAPES } from "../domain/standardShapes";
import { priceOrder, type PriceInput, type PriceResult, type PriceSide } from "../domain/price";
import { RX_ORDER_SCHEMA_V2, upgradeV1, type RxOrderSource, type RxOrderV2 } from "../domain/schema";
import {
  frameLimitErrors, rxErrors, rxPrompts, rxRules, rxSectionComplete, rxWarnings,
  type Eye, type FrameIssue, type RxEyeValues, type RxIssue, type RxRules, type RxWarning,
} from "../domain/validate";
import {
  EXPORT_DELIVERY, DEFAULT_DELIVERY, defaultValues, emptyEye, emptyShape,
  type CatalogItem, type CatalogTreatment, type RxCatalog, type RxEyeText, type RxFormValues,
} from "./types";

export const AR_LEAD = "9–14 working days";
export const PLAIN_LEAD = "5–7 working days";
export const UNPRICED_ASSIST = "Lens not priced on this account — quote requested";
export const BLANK_SIZES = [60, 65, 70, 75, 80] as const;

export type SectionId = "patient" | "frame" | "lens" | "rx" | "treat" | "notes";
export const SECTION_ORDER: SectionId[] = ["patient", "frame", "lens", "rx", "treat", "notes"];

const find = (xs: CatalogItem[], id: string) => xs.find((x) => x.id === id);

// ── numbers out of text ──────────────────────────────────────────────────────

export const eyeValues = (t: RxEyeText): RxEyeValues => ({
  sph: parseNum(t.sph, SHORTHAND_FIELDS.includes("sph")),
  cyl: parseNum(t.cyl, true),
  axis: parseNum(t.axis),
  add: parseNum(t.add, true),
  prism: parseNum(t.prism),
  base: t.base,
  pd: parseNum(t.pd),
  npd: parseNum(t.npd),
  ht: parseNum(t.ht),
});

export const activeEyesOf = (eyes: RxFormValues["job"]["eyes"]): Eye[] => (eyes === "pair" ? ["od", "os"] : [eyes]);
export const splitOn = (v: RxFormValues) => v.lens.split && v.job.eyes === "pair";

// ── frame maths ──────────────────────────────────────────────────────────────

/** ED estimated from the box: √(A²+B²), rounded up to 0.1. */
export const estimateED = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? null : Math.ceil(Math.sqrt(a * a + b * b) * 10) / 10;

// ── coatings ─────────────────────────────────────────────────────────────────

const isPhotochromic = (name: string) => /photochromic|transition|photo/i.test(name);
const isTint = (t: CatalogTreatment) => t.grp === "tn";
const isGradientTint = (t: CatalogTreatment) => /grad/i.test(t.n);

/**
 * Why a coating cannot be added right now, or "Replaces X" when it would swap
 * out another coating in its group. Null when it is free to add. Tint and
 * photochromic are recognised by category and name — the prototype's hard-coded
 * ids ("tn-solid") never match live data.
 */
export function clashOf(id: string, selected: readonly string[], catalog: RxCatalog, sideColours: string[]): string | null {
  const t = catalog.treatments.find((x) => x.id === id);
  if (!t) return null;
  if (t.grp) {
    const other = catalog.treatments.find((x) => x.grp === t.grp && x.id !== id && selected.includes(x.id));
    if (other) return `Replaces ${other.n}`;
  }
  for (const [a, b, why] of catalog.clashes) {
    if ((a === id && selected.includes(b)) || (b === id && selected.includes(a))) return why;
  }
  if (isTint(t) && sideColours.some(isPhotochromic)) return "Cannot tint a photochromic lens";
  return null;
}

/** The coating list after toggling `id`, or why it was refused. */
export function toggleTreatment(
  selected: readonly string[], id: string, catalog: RxCatalog, sideColours: string[],
): { treatments: string[] } | { blocked: string } {
  const t = catalog.treatments.find((x) => x.id === id);
  if (!t) return { treatments: [...selected] };
  if (selected.includes(id)) return { treatments: selected.filter((x) => x !== id) };
  let next = [...selected];
  if (t.grp) next = next.filter((x) => catalog.treatments.find((y) => y.id === x)?.grp !== t.grp);
  const bad = clashOf(id, next, catalog, sideColours);
  if (bad && !bad.startsWith("Replaces")) return { blocked: bad };
  return { treatments: [...next, id] };
}

export interface AddonIssue {
  id: string;
  kind: "withdrawn" | "unpriced" | "clash";
  text: string;
}

/**
 * Problems with the selected coatings that block submit: one no longer offered
 * on this account, one with no price here (never quoted as free), or an
 * incompatible pair that arrived from a restored draft. Each carries a "Remove".
 */
export function addonIssues(selected: readonly string[], catalog: RxCatalog): AddonIssue[] {
  const out: AddonIssue[] = [];
  selected.forEach((id, i) => {
    const t = catalog.treatments.find((x) => x.id === id);
    if (!t) {
      out.push({ id, kind: "withdrawn", text: "A coating on this order is no longer available on this account and cannot be quoted." });
      return;
    }
    if (t.unpriced) out.push({ id, kind: "unpriced", text: `${t.n} has no price on this account — it cannot be added at no charge.` });
    for (const [a, b, why] of catalog.clashes) {
      const other = a === id ? b : b === id ? a : null;
      if (!other || !selected.includes(other)) continue;
      if (selected.indexOf(other) > i) continue; // the earlier one reports it
      const o = catalog.treatments.find((x) => x.id === other);
      out.push({ id, kind: "clash", text: `${t.n} and ${o ? o.n : "another coating"} cannot go on the same lens — ${why}.` });
    }
  });
  return out;
}

// ── derivation ───────────────────────────────────────────────────────────────

export interface ChecklistItem { id: SectionId; label: string; ok: boolean }

export interface Derived {
  eyes: Eye[];
  rows: Partial<Record<Eye, RxEyeValues>>;
  rules: RxRules;
  rx: { errors: RxIssue[]; warnings: RxWarning[]; prompts: { eye: Eye; text: string }[] };
  frame: {
    a: number | null; b: number | null; dbl: number | null;
    /** The ED in force: the person's own, or the √(A²+B²) estimate. */
    ed: number | null;
    edIsEstimate: boolean;
    /** The ED is read off the outline and cannot be typed over. */
    edLocked: boolean;
    /** The outline rescaled to the A × B typed (null when no shape). */
    geometry: ShapeGeometry | null;
    /** All four box measurements are in — the shape can be confirmed against them. */
    boxComplete: boolean;
    /** Problems with the shape / trace requirement (remote edge needs a trace). */
    shapeIssues: string[];
    issues: FrameIssue[];
  };
  diameter: { suggested: number | null; pick: number | null; effective: number };
  lens: {
    /** [right/shared, left] — the left is only meaningful when split. */
    sides: Triple[];
    complete: boolean;
    duplicate: boolean;
    names: (string | null)[];
    options: ComboOptions[];
    /** Per side: what narrowing the catalogue would clear, if anything. */
    repairs: ({ cleared: string } | null)[];
    isProg: boolean;
  };
  treat: {
    issues: AddonIssue[];
    /** Chemistrie clips that are incomplete or duplicated (block submit). */
    chemIssues: string[];
    tintId: string | null;
    arSelected: boolean;
    serviceLead: string;
  };
  price: PriceResult;
  sections: Record<SectionId, boolean>;
  checklist: ChecklistItem[];
  assistance: string[];
  /** Submit is possible (an unpriced lens may still block, see `blockedReason`). */
  canSubmit: boolean;
  blockedReason: string | null;
}

export function derive(v: RxFormValues, catalog: RxCatalog): Derived {
  const eyes = activeEyesOf(v.job.eyes);
  const split = splitOn(v);
  const sidesTriples: Triple[] = split ? [v.lens.od, v.lens.os] : [v.lens.od];
  const designA = find(catalog.designs, v.lens.od.d);

  // prescription
  const rows: Partial<Record<Eye, RxEyeValues>> = {};
  for (const e of eyes) rows[e] = eyeValues(v.rx[e]);
  const isProg = sidesTriples.some((t) => !!find(catalog.designs, t.d)?.prog);
  const a = parseNum(v.frame.a), b = parseNum(v.frame.b), dbl = parseNum(v.frame.dbl);
  const estimate = estimateED(a, b);
  const typedEd = parseNum(v.frame.ed);
  // A real outline makes ED a measurement, not an opinion: it locks the field.
  const geometry = hasOutline(v.shape.data) ? shapeGeometry(v.shape.data, { a, b, dbl }) : null;
  const ed = geometry ? geometry.metrics.ed : v.frame.edTouched ? typedEd : estimate;
  const rules = rxRules({
    eyes: v.job.eyes, vision: v.job.vision, purpose: v.job.purpose,
    designNeedsAdd: !!designA?.needsAdd, isProg, frameB: b,
  });
  const rx = {
    errors: rxErrors(rows, rules),
    warnings: rxWarnings(rows, rules, new Set(v.dismissedWarnings)),
    prompts: rxPrompts(rows, rules),
  };
  const frameIssues = frameLimitErrors({ a, b, ed, dbl });

  // blank diameter
  const pds = eyes.map((e) => rows[e]?.pd ?? null).filter((x): x is number => x !== null);
  let suggested: number | null = null;
  if (a !== null && dbl !== null && ed !== null && pds.length) {
    const decentration = Math.abs((a + dbl) / 2 - Math.min(...pds));
    suggested = Math.ceil(ed + 2 * decentration + 2);
  }
  const pick = suggested ? BLANK_SIZES.find((x) => x >= suggested!) ?? 80 : null;
  const effective = v.lens.diameter === "auto" ? pick ?? 70 : parseInt(v.lens.diameter, 10) || 70;

  // lens
  const options = sidesTriples.map((t) => comboOptions(catalog, v.job.vision, t));
  const repairs = sidesTriples.map((t) => {
    const r = repairTriple(catalog, v.job.vision, t);
    return r.cleared ? { cleared: r.cleared } : null;
  });
  const sideComplete = (t: Triple) => tripleComplete(t)
    && !!find(catalog.materials, t.m) && !!find(catalog.designs, t.d) && !!find(catalog.colours, t.c);
  const names = sidesTriples.map((t) => {
    const m = find(catalog.materials, t.m), d = find(catalog.designs, t.d), c = find(catalog.colours, t.c);
    return m && d && c ? `${m.n} · ${d.n} · ${c.n}` : null;
  });
  const lensComplete = sidesTriples.every(sideComplete);
  const duplicate = split && splitLensesDuplicate(v.lens.od, v.lens.os);

  // coatings
  const colourNames = sidesTriples.map((t) => find(catalog.colours, t.c)?.n ?? "");
  const issues = addonIssues(v.treatments, catalog);
  const chemIssues = clipIssues(v.chemClips);
  const selectedTreatments = v.treatments
    .map((id) => catalog.treatments.find((t) => t.id === id))
    .filter((t): t is CatalogTreatment => !!t);
  const tint = selectedTreatments.find(isTint) ?? null;
  const arSelected = selectedTreatments.some((t) => t.grp === "ar");

  // price
  const priceSide = (t: Triple): PriceSide => {
    const m = find(catalog.materials, t.m), d = find(catalog.designs, t.d), c = find(catalog.colours, t.c);
    return {
      complete: sideComplete(t),
      materialName: m?.n ?? "", designName: d?.n ?? "", colourName: c?.n ?? "",
      materialUp: m?.up ?? 0, designBase: d?.base ?? 0, colourUp: c?.up ?? 0,
      quoted: catalog.lensPrice(t.m, t.d, t.c),
      hasPriceSource: catalog.hasPriceSource,
    };
  };
  const priceInput: PriceInput = {
    eyes: v.job.eyes,
    split,
    sides: { a: priceSide(v.lens.od), ...(split ? { b: priceSide(v.lens.os) } : {}) },
    treatments: selectedTreatments.map((t) => ({
      id: t.id, name: t.n, category: t.c, price: t.p, isTint: isTint(t), isGradientTint: isGradientTint(t),
    })),
    tint: tint ? {
      colour: v.tint.colour, density: Number(v.tint.density) || 0,
      gradTop: Number(v.tint.gradTop) || 0, gradBottom: Number(v.tint.gradBottom) || 0, match: v.tint.match,
    } : null,
    rx: Object.fromEntries(eyes.map((e) => [e, { sph: rows[e]?.sph ?? null, prism: rows[e]?.prism ?? null }])),
    diameter: effective,
    scope: v.job.scope,
    mount: v.frame.mount,
    service: v.delivery.service,
    rules: catalog.surchargeRules,
  };
  const price = priceOrder(priceInput);

  // sections
  const patient = !!v.patient.first.trim() && !!v.patient.last.trim();
  const boxComplete = a !== null && b !== null && ed !== null && dbl !== null;
  const remote = v.job.scope === "remote";
  const shapeIssues: string[] = [];
  // Remote edge cuts to the trace: a file is required, and its outline has to be
  // confirmed against the frame. (A standard shape alone is not a trace.)
  if (remote) {
    if (v.shape.fileName && !v.shape.data) shapeIssues.push("No trace points could be read from that file — upload it again, or re-export the trace.");
    else if (v.shape.source !== "trace") shapeIssues.push("Remote edge needs your frame trace file (.oma, .tr or .vca).");
    else if (!(v.shape.confirmed && boxComplete)) shapeIssues.push("Confirm the shape is correct for the frame in hand.");
  }
  const frame = !!v.frame.name.trim() && !!v.frame.mount && boxComplete
    && frameIssues.length === 0 && shapeIssues.length === 0;
  const sections: Record<SectionId, boolean> = {
    patient,
    frame,
    lens: lensComplete && !duplicate,
    rx: rxSectionComplete(rows, rules),
    treat: issues.length === 0 && chemIssues.length === 0,
    notes: true,
  };
  const checklist: ChecklistItem[] = [
    { id: "patient", label: "Patient name", ok: sections.patient },
    { id: "frame", label: "Job type & frame measurements", ok: sections.frame },
    { id: "lens", label: "Material, design & colour", ok: sections.lens },
    { id: "rx", label: "Prescription complete & valid", ok: sections.rx },
  ];
  // Only appears once something is wrong with the coatings — a permanently
  // green fifth row would be noise on every other order.
  if (!sections.treat) checklist.push({ id: "treat", label: "Coatings & treatments", ok: false });

  const assistance = [...new Set([...v.assistance.filter((x) => x !== UNPRICED_ASSIST), ...(price.unpriced ? [UNPRICED_ASSIST] : [])])];
  const allValid = checklist.every((c) => c.ok);
  const blocked = price.unpriced && catalog.blockUnpricedOrders;
  return {
    eyes, rows, rules, rx,
    frame: {
      a, b, dbl, ed, edIsEstimate: !geometry && !v.frame.edTouched && estimate !== null,
      edLocked: !!geometry, geometry, boxComplete, shapeIssues, issues: frameIssues,
    },
    diameter: { suggested, pick, effective },
    lens: { sides: sidesTriples, complete: lensComplete, duplicate, names, options, repairs, isProg },
    treat: { issues, chemIssues, tintId: tint?.id ?? null, arSelected, serviceLead: arSelected ? AR_LEAD : PLAIN_LEAD },
    price, sections, checklist, assistance,
    canSubmit: allValid && !blocked,
    blockedReason: !price.unpriced ? null : blocked
      ? "This lens is not priced on your account — save it as a draft and we will quote it."
      : "This lens is not on your pricelist — it will be priced when your order is processed.",
  };
}

/** The first section that is not yet valid — the form discloses up to and including it. */
export const firstIncomplete = (sections: Record<SectionId, boolean>): SectionId | null =>
  SECTION_ORDER.find((id) => !sections[id]) ?? null;

/** A one-line summary for a completed, folded card. */
export function sectionSummary(id: SectionId, v: RxFormValues, d: Derived, catalog: RxCatalog): string {
  switch (id) {
    case "patient":
      return [`${v.patient.first.trim()} ${v.patient.last.trim()}`.trim(), v.reference.trim() && `Ref ${v.reference.trim()}`].filter(Boolean).join(" · ");
    case "frame": {
      const scope = { uncut: "Uncut lenses", remote: "Remote edge", glaze: "Full glaze" }[v.job.scope];
      const shape = v.shape.source === "standard" ? STD_SHAPES.find((s) => s.id === v.shape.standardId)?.n : v.shape.source === "trace" ? v.shape.fileName : null;
      return [scope, v.frame.name.trim(), v.frame.mount, shape && `Shape: ${shape}`,
        d.frame.a !== null && `A ${d.frame.a} · B ${d.frame.b} · ED ${d.frame.ed !== null ? +d.frame.ed.toFixed(2) : "—"} · DBL ${d.frame.dbl}`]
        .filter(Boolean).join(" · ");
    }
    case "lens":
      return d.lens.names.filter(Boolean).join("  |  ");
    case "rx":
      return d.eyes.map((e) => {
        const r = d.rows[e]!;
        const sg = (n: number | null) => (n === null ? "—" : `${n < 0 ? "-" : "+"}${Math.abs(n).toFixed(2)}`);
        return `${e.toUpperCase()} ${sg(r.sph)} / ${sg(r.cyl)} × ${r.axis ?? "—"}`;
      }).join("  ·  ");
    case "treat": {
      const names = v.treatments.map((id) => catalog.treatments.find((t) => t.id === id)?.n).filter(Boolean);
      return names.length ? names.join(", ") : "No coatings";
    }
    case "notes":
      return [v.delivery.service === "pri" ? "Priority" : "Standard", v.delivery.method].join(" · ");
  }
}

// ── delivery default ─────────────────────────────────────────────────────────

/** Barbados is the only domestic destination; everywhere else ships out. */
export const accountIsExport = (country: string | null): boolean => {
  const c = (country ?? "").trim().toUpperCase();
  return !!c && c !== "BB" && !/^BARBADOS$/i.test(c);
};

/** The delivery method the account defaults to, until the person chooses. */
export const defaultDelivery = (country: string | null): string => (accountIsExport(country) ? EXPORT_DELIVERY : DEFAULT_DELIVERY);

// ── the order, and back ──────────────────────────────────────────────────────

/** Form triple (m/d/c) → the schema's named lens. */
const lensOf = (t: Triple) => ({ material: t.m, design: t.d, colour: t.c });

/** The cv.rxorder/2 order for these values. */
export function buildOrder(
  v: RxFormValues, d: Derived, catalog: RxCatalog,
  ctx: { orderNo: string | null; account: { id: number; name: string } | null; source: RxOrderSource; createdAt?: string; rebuiltFrom?: string | null },
): RxOrderV2 {
  const eyeRow = (e: Eye) => {
    const r = d.rows[e]!;
    return { sph: r.sph, cyl: r.cyl, axis: r.axis, add: r.add, prism: r.prism, base: (r.base || "") as "IN" | "OUT" | "UP" | "DOWN" | "", pd: r.pd, npd: r.npd, height: r.ht };
  };
  const split = splitOn(v);
  const quote = catalog.pricesVisible
    ? {
        currency: "BBD", symbol: "BBD $", rate: 1,
        lines: d.price.lines.map((l) => ({
          label: l.n, detail: l.i, amount: +l.v.toFixed(2),
          ...(l.eye ? { eye: l.eye } : {}), ...(l.lens ? { lens: true } : {}),
        })),
        total: +d.price.sub.toFixed(2),
        lockedAt: new Date().toISOString(),
      }
    : { currency: "BBD", hidden: true, reason: "pricing not enabled on account" };
  return {
    schema: RX_ORDER_SCHEMA_V2,
    orderNo: ctx.orderNo,
    source: ctx.source,
    rebuiltFrom: ctx.rebuiltFrom ?? null,
    createdAt: ctx.createdAt ?? new Date().toISOString(),
    account: ctx.account ? { id: String(ctx.account.id), name: ctx.account.name, currency: "BBD", pricesVisible: catalog.pricesVisible } : null,
    reference: v.reference.trim() || null,
    patient: { first: v.patient.first, last: v.patient.last },
    job: { ...v.job },
    frame: { name: v.frame.name, mount: v.frame.mount, source: v.frame.source, a: d.frame.a, b: d.frame.b, ed: d.frame.ed, dbl: d.frame.dbl },
    shape: d.frame.geometry && v.shape.data && v.shape.source
      ? (shapeToPayload(v.shape.data, d.frame.geometry, {
          source: v.shape.source, standardId: v.shape.standardId, fileName: v.shape.fileName, confirmed: v.shape.confirmed,
        }) as unknown as Record<string, unknown>)
      : null,
    lens: {
      od: v.job.eyes === "os" ? null : lensOf(v.lens.od),
      os: v.job.eyes === "od" ? null : lensOf(split ? v.lens.os : v.lens.od),
      advanced: { diameter: d.diameter.effective, corridor: v.lens.corridor, baseCurve: v.lens.baseCurve },
    },
    rx: {
      ...(d.rows.od ? { od: eyeRow("od") } : {}),
      ...(d.rows.os ? { os: eyeRow("os") } : {}),
    },
    treatments: [...v.treatments],
    tintConfig: d.treat.tintId ? {
      treatment: d.treat.tintId, colour: v.tint.colour, density: Number(v.tint.density) || 0,
      gradTop: Number(v.tint.gradTop) || 0, gradBottom: Number(v.tint.gradBottom) || 0,
      finish: v.tint.finish, match: v.tint.match,
    } : null,
    chemistrie: v.chemClips.length ? v.chemClips.map((c) => ({ ...c })) : null,
    ownerReview: v.tint.match && !!d.treat.tintId,
    assistance: d.assistance,
    // the Chemistrie specification rides in the lab notes, after the person's own
    delivery: { service: v.delivery.service, method: v.delivery.method, notes: notesWithChemistrie(v.delivery.notes, v.chemClips) },
    quote,
    flags: v.flags,
  };
}

const textOf = (n: number | null, dp?: number): string => (n === null ? "" : dp === undefined ? String(n) : n.toFixed(dp));

/** Form values from a saved order (v1 or v2), so a saved quote reopens. */
export function valuesFromOrder(input: unknown, catalog: RxCatalog): RxFormValues {
  const o = upgradeV1(input);
  const base = defaultValues(o.account ? Number(o.account.id) || null : null);
  const eyeText = (r: NonNullable<RxOrderV2["rx"]["od"]> | undefined): RxEyeText => !r ? emptyEye() : ({
    sph: r.sph === null ? "" : `${r.sph < 0 ? "-" : "+"}${Math.abs(r.sph).toFixed(2)}`,
    cyl: r.cyl === null ? "" : `${r.cyl < 0 ? "-" : "+"}${Math.abs(r.cyl).toFixed(2)}`,
    axis: textOf(r.axis),
    add: r.add === null ? "" : `+${Math.abs(r.add).toFixed(2)}`,
    pd: textOf(r.pd, 1), npd: textOf(r.npd, 1), ht: textOf(r.height, 1),
    prism: r.prism === null ? "" : Math.abs(r.prism).toFixed(2), base: r.base,
  });
  const od = o.lens.od ?? o.lens.os ?? { material: "", design: "", colour: "" };
  const os = o.lens.os ?? od;
  const split = !!(o.lens.od && o.lens.os && (o.lens.od.material !== o.lens.os.material || o.lens.od.design !== o.lens.os.design || o.lens.od.colour !== o.lens.os.colour));
  const tint = (o.tintConfig ?? {}) as Record<string, any>;
  return {
    ...base,
    patient: { ...o.patient },
    reference: o.reference ?? "",
    job: { ...o.job },
    frame: {
      name: o.frame.name, mount: o.frame.mount, source: o.frame.source || base.frame.source,
      a: textOf(o.frame.a), b: textOf(o.frame.b), ed: textOf(o.frame.ed), dbl: textOf(o.frame.dbl),
      // A saved ED that differs from the box estimate was the person's own
      // (unless the outline set it, in which case the field is locked anyway).
      edTouched: o.frame.ed !== null && o.frame.ed !== estimateED(o.frame.a, o.frame.b),
    },
    shape: (() => {
      const s = shapeFromPayload(o.shape);
      return s
        ? { source: s.source, standardId: s.standardId, fileName: s.fileName, fileSize: null, data: s.shape, confirmed: s.confirmed }
        : emptyShape();
    })(),
    lens: {
      od: { m: od.material, d: od.design, c: od.colour },
      os: { m: os.material, d: os.design, c: os.colour },
      split,
      diameter: o.lens.advanced.diameter != null && BLANK_SIZES.includes(o.lens.advanced.diameter as any) ? String(o.lens.advanced.diameter) : "auto",
      corridor: o.lens.advanced.corridor || base.lens.corridor,
      baseCurve: o.lens.advanced.baseCurve || base.lens.baseCurve,
    },
    rx: { od: eyeText(o.rx.od), os: eyeText(o.rx.os) },
    treatments: o.treatments.filter((id) => typeof id === "string"),
    chemClips: (o.chemistrie ?? []).map(normaliseSavedClip),
    tint: {
      colour: tint.colour ?? base.tint.colour, density: String(tint.density ?? base.tint.density),
      gradTop: String(tint.gradTop ?? base.tint.gradTop), gradBottom: String(tint.gradBottom ?? base.tint.gradBottom),
      finish: tint.finish ?? base.tint.finish, match: !!tint.match,
    },
    delivery: { service: o.delivery.service || "std", method: o.delivery.method || defaultDelivery(catalog.accountCountry), methodTouched: !!o.delivery.method, notes: stripChemNotes(o.delivery.notes) },
    assistance: o.assistance.filter((a) => a !== UNPRICED_ASSIST),
    flags: o.flags,
  };
}
