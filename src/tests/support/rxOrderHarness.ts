// Shared jsdom harness for the ported Rx order engine.
//
// Every Rx test previously stood up its own copy of "make a div, paste the
// markup, call createRxOrderEngine" plus its own ad-hoc catalogue. That made
// each new assertion cost thirty lines of setup and let the fixtures drift
// apart, so a rule proved in one file said nothing about the other. This is
// the one mount path: a realistic catalogue, typed helpers that drive the form
// the way a person does (set the value, fire the event the engine listens for),
// and readers for the surfaces the engine renders its verdicts into.
import markup from "@/features/rx-order/embed/rx-order-markup.html?raw";
import { createRxOrderEngine } from "@/features/rx-order/embed/rx-order-engine.js";

export type Eye = "od" | "os";
export type RxField = "sph" | "cyl" | "axis" | "add" | "pd" | "npd" | "ht" | "prism" | "base";

// ── Catalogue ──
// Deliberately more than one row per axis: a single-combination fixture cannot
// catch the narrowing logic (options()/repair()) that the real pricelist scope
// exercises constantly. Ids mirror the live shape — material name, and the
// "mftype|lenstype" composite the adapter builds for designs.
export const MATERIALS = {
  plastic: "plastic 1.50",
  poly: "polycarbonate",
  hi167: "hi-index 1.67",
} as const;

export const DESIGNS = {
  sv: "single vision|regular",
  prog: "progressive|digital",
} as const;

export const COLOURS = {
  clear: "uncoated",
  photo: "photochromic grey",
  amber: "tgns amber",
} as const;

const COMBOS = [
  { m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.clear },
  { m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.photo },
  { m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.amber },
  { m: MATERIALS.plastic, d: DESIGNS.prog, c: COLOURS.clear },
  { m: MATERIALS.poly, d: DESIGNS.sv, c: COLOURS.clear },
  { m: MATERIALS.poly, d: DESIGNS.prog, c: COLOURS.clear },
  { m: MATERIALS.poly, d: DESIGNS.prog, c: COLOURS.photo },
  { m: MATERIALS.hi167, d: DESIGNS.sv, c: COLOURS.clear },
  { m: MATERIALS.hi167, d: DESIGNS.prog, c: COLOURS.clear },
];

const matrixOf = (combos: typeof COMBOS) => {
  const out: Record<string, { d: string[]; c: string[] }> = {};
  for (const { m, d, c } of combos) {
    (out[m] ??= { d: [], c: [] });
    if (!out[m].d.includes(d)) out[m].d.push(d);
    if (!out[m].c.includes(c)) out[m].c.push(c);
  }
  return out;
};

export const TREATMENTS = {
  superAr: "ar-super",
  blueAr: "ar-blue",
  hardCoat: "hc-standard",
  tintSolid: "tn-solid",
  mirror: "mr-silver",
} as const;

export const RX_TEST_DATA = {
  branches: [
    { id: "1", code: "CV", name: "Test Optical", info: "Account #1001", cur: "BBD", prices: true },
    { id: "2", code: "BR", name: "Bridgetown Branch", info: "Account #1002", cur: "BBD", prices: true },
  ],
  materials: [
    { id: MATERIALS.plastic, n: "Plastic 1.50", up: 0 },
    { id: MATERIALS.poly, n: "Polycarbonate", up: 0 },
    { id: MATERIALS.hi167, n: "Hi-Index 1.67", up: 0 },
  ],
  designs: [
    { id: DESIGNS.sv, n: "Single Vision · Regular", v: "sv", base: 0, prog: false },
    { id: DESIGNS.prog, n: "Progressive · Digital", v: "mf", base: 0, prog: true, needsAdd: true },
  ],
  colours: [
    { id: COLOURS.clear, n: "UNCoated", up: 0 },
    { id: COLOURS.photo, n: "Photochromic Grey", up: 0 },
    { id: COLOURS.amber, n: "TGNS Amber", up: 0 },
  ],
  matrix: matrixOf(COMBOS),
  combos: COMBOS,
  treatments: [
    { id: TREATMENTS.superAr, c: "Anti-reflective", n: "Super AR", d: "Premium anti-reflective", p: 48, grp: "ar", pop: true },
    { id: TREATMENTS.blueAr, c: "Anti-reflective", n: "Blue Defence", d: "Blue-light filtering AR", p: 62, grp: "ar", pop: true },
    { id: TREATMENTS.hardCoat, c: "Hard coats", n: "Hard Coat", d: "Scratch-resistant coat", p: 15, grp: "hc" },
    { id: TREATMENTS.tintSolid, c: "Tints", n: "Solid Tint", d: "Single-density tint", p: 22, grp: "tn" },
    { id: TREATMENTS.mirror, c: "Mirror finishes", n: "Silver Mirror", d: "Mirror finish", p: 55, grp: "mr" },
  ],
  // Same-group AR pair replaces; mirror over a tint genuinely clashes.
  clashes: [[TREATMENTS.mirror, TREATMENTS.tintSolid, "A mirror finish cannot go over a solid tint"]] as [string, string, string][],
};

// Priced everywhere except TGNS Amber — the live shape of an unpriced cell.
export const testLensPrice = (_m: string, _d: string, c: string): number | null =>
  c === COLOURS.amber ? null : 278.25;

export interface MountOptions {
  data?: unknown;
  lockedBranchId?: string;
  lensPrice?: (m: string, d: string, c: string) => number | null;
  [key: string]: unknown;
}

export interface FillOverrides {
  patient?: { first?: string; last?: string; ref?: string };
  frame?: { name?: string; mount?: string; a?: string; b?: string; ed?: string; dbl?: string };
  lens?: { m?: string; d?: string; c?: string };
  rx?: Partial<Record<Eye, Partial<Record<RxField, string | number>>>>;
  eyes?: "pair" | "od" | "os";
  vision?: "sv" | "mf";
}

export interface RxHarness {
  host: HTMLElement;
  engine: any;
  /** Engine state object (`S`) — read-only in tests unless you mean to poke it. */
  state: any;
  field: <T extends HTMLElement = HTMLInputElement>(selector: string) => T | null;
  rxCell: (eye: Eye, f: RxField) => HTMLInputElement | HTMLSelectElement | null;
  /** Set a value and fire the events the engine actually listens for. */
  set: (selector: string, value: string) => void;
  setRx: (eye: Eye, values: Partial<Record<RxField, string | number>>) => void;
  /** Click a segmented-control option, e.g. segment("eyeSeg", "eyes", "od"). */
  segment: (segId: string, attr: string, value: string) => void;
  selectLens: (combo: { m: string; d: string; c: string }) => void;
  /** Turn the per-eye lens split on/off the way the checkbox does. */
  setSplit: (on: boolean) => void;
  /** Choose the left eye's own lens (split mode only). */
  selectLensOs: (combo: { m: string; d: string; c: string }) => void;
  toggleTreatment: (id: string) => void;
  /** The "Before you can submit" checklist, as rendered. */
  checklist: () => { label: string; ok: boolean }[];
  submitEnabled: () => boolean;
  /** Blocking Rx errors currently rendered above the prescription table. */
  rxErrors: () => string[];
  /** Dismissible Rx warnings currently rendered. */
  rxWarnings: () => string[];
  quoteText: () => string;
  assistFlags: () => string[];
  /** Fill everything a valid order needs; returns the harness for chaining. */
  fillValidOrder: (overrides?: FillOverrides) => RxHarness;
  destroy: () => void;
}

// Filling the form field-by-field used to cost one full engine render per
// keystroke — ~30 renders for a single valid order, and seconds per test. The
// engine's own re-render is wired to *document-level* input/change listeners,
// while per-field behaviour (name upper-casing, the ED "touched" flag, the
// combo inputs) is wired to listeners on the elements themselves. A
// non-bubbling event therefore runs the field's own handlers and skips the
// expensive global render — so a batch can set everything, then flush once.
let batching = false;
const fire = (el: HTMLElement, type: string) => el.dispatchEvent(new Event(type, { bubbles: !batching }));

export const mountRxOrder = (options: MountOptions = {}): RxHarness => {
  const host = document.createElement("div");
  host.className = "cv-rx-embed";
  host.innerHTML = markup;
  document.body.appendChild(host);

  const engine = createRxOrderEngine(host, {
    data: RX_TEST_DATA,
    lockedBranchId: "1",
    orderNo: () => "Q-1001",
    lensPrice: testLensPrice,
    ...options,
  });

  const field = <T extends HTMLElement = HTMLInputElement>(selector: string) => host.querySelector<T>(selector);
  const rxCell = (eye: Eye, f: RxField) =>
    host.querySelector<HTMLInputElement | HTMLSelectElement>(`tr[data-eye="${eye}"] [data-f="${f}"]`);

  const set = (selector: string, value: string) => {
    const el = field<HTMLInputElement | HTMLSelectElement>(selector);
    if (!el) throw new Error(`rxOrderHarness: no element matches ${selector}`);
    el.value = value;
    fire(el, "input");
    fire(el, "change");
  };

  const setRx: RxHarness["setRx"] = (eye, values) => {
    for (const [f, value] of Object.entries(values)) {
      const el = rxCell(eye, f as RxField);
      if (!el) throw new Error(`rxOrderHarness: no ${eye} cell for ${f}`);
      el.value = String(value);
      fire(el, "input");
      fire(el, "change");
    }
  };

  const segment: RxHarness["segment"] = (segId, attr, value) => {
    const btn = field<HTMLButtonElement>(`#${segId} button[data-${attr}="${value}"]`);
    if (!btn) throw new Error(`rxOrderHarness: no ${segId} option ${value}`);
    btn.click();
  };

  // Direct state assignment mirrors what pickCombo() does once a person has
  // chosen from the dropdown, without simulating focus/keyboard/portal.
  const selectLens: RxHarness["selectLens"] = ({ m, d, c }) => {
    engine.state.m = m;
    engine.state.d = d;
    engine.state.c = c;
    engine.refreshData();
  };

  const setSplit: RxHarness["setSplit"] = (on) => {
    const box = field<HTMLInputElement>("#splitOn");
    if (!box) throw new Error("rxOrderHarness: no #splitOn toggle");
    if (box.checked === on) return;
    box.checked = on;
    box.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const selectLensOs: RxHarness["selectLensOs"] = ({ m, d, c }) => {
    engine.state.m2 = m;
    engine.state.d2 = d;
    engine.state.c2 = c;
    engine.refreshData();
  };

  const toggleTreatment: RxHarness["toggleTreatment"] = (id) => {
    const opt = field<HTMLElement>(`#popOpts [data-tid="${id}"]`) ?? field<HTMLElement>(`[data-tid="${id}"]`);
    if (!opt) throw new Error(`rxOrderHarness: no treatment control for ${id}`);
    opt.click();
  };

  const checklist: RxHarness["checklist"] = () =>
    Array.from(host.querySelectorAll("#vList li")).map((li) => ({
      label: li.querySelector(".vt")?.textContent?.trim() ?? "",
      ok: li.classList.contains("ok"),
    }));

  const submitEnabled = () => !field<HTMLButtonElement>("#submitBtn")?.disabled;

  const rxErrors = () =>
    Array.from(host.querySelectorAll("#rxErrors .callout.gold div")).map((d) => d.textContent?.trim() ?? "");
  const rxWarnings = () =>
    Array.from(host.querySelectorAll("#rxErrors .callout:not(.gold)")).map(
      (c) => c.querySelectorAll("span")[1]?.textContent?.trim() ?? "",
    );

  const quoteText = () => field("#qLines")?.textContent ?? "";
  const assistFlags = () =>
    Array.from(host.querySelectorAll("#assistTags .atag")).map(
      (t) => t.textContent?.replace(/^⚑\s*/, "").replace(/✕$/, "").trim() ?? "",
    );

  const harness: RxHarness = {
    host, engine, state: engine.state,
    field, rxCell, set, setRx, segment, selectLens, setSplit, selectLensOs, toggleTreatment,
    checklist, submitEnabled, rxErrors, rxWarnings, quoteText, assistFlags,
    fillValidOrder: (o) => fillValidOrder(harness, o),
    // The host has to leave the document, not just stop being driven. The
    // markup carries element ids, and jsdom resolves an id selector through a
    // document-wide map before checking ancestry — so a second mount alongside
    // an abandoned first host cannot find its OWN #materialList, and the
    // engine dies on init. Two mounts in one test is normal (before/after a
    // setting), so cleanup is the harness's job, not each test's.
    destroy: () => {
      engine.destroy();
      host.remove();
    },
  };
  return harness;
};

// A complete, submittable single-vision distance pair. Every value here is
// inside the engine's own producible ranges — a test that wants a failure
// overrides one field rather than rebuilding the whole order.
//
// The whole fill runs inside one batch: fields are set with their own handlers
// running but the global render suppressed, and selectLens' refreshData() at
// the end is the single render that settles the form.
export const fillValidOrder = (h: RxHarness, o: FillOverrides = {}): RxHarness => {
  if (o.eyes) h.segment("eyeSeg", "eyes", o.eyes);
  if (o.vision) h.segment("visionSeg", "vision", o.vision);

  batching = true;
  try {
    h.set("#pfirst", o.patient?.first ?? "Marcus");
    h.set("#plast", o.patient?.last ?? "Grant");
    if (o.patient?.ref) h.set("#ref", o.patient.ref);

    h.set("#fname", o.frame?.name ?? "Ray-Ban RB5154");
    h.set("#mount", o.frame?.mount ?? "full");
    h.set("#fa", o.frame?.a ?? "52");
    h.set("#fb", o.frame?.b ?? "38");
    h.set("#fdbl", o.frame?.dbl ?? "18");
    if (o.frame?.ed) h.set("#fed", o.frame.ed);

    const base = { sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32", ht: "22" };
    const eyes: Eye[] = h.state.eyes === "pair" ? ["od", "os"] : [h.state.eyes as Eye];
    for (const eye of eyes) h.setRx(eye, { ...base, ...(o.rx?.[eye] ?? {}) });
  } finally {
    batching = false;
  }

  h.selectLens({
    m: o.lens?.m ?? MATERIALS.plastic,
    d: o.lens?.d ?? DESIGNS.sv,
    c: o.lens?.c ?? COLOURS.clear,
  });

  return h;
};
