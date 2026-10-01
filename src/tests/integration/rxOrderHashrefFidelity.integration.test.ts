// Fidelity of the outbound Rx order: what a dispenser types into the form vs the
// Hashref file Innovations receives.
//
// The chain under test, end to end, with every link real except the two that need
// a database:
//
//   form engine payload ─▶ persistPayload() ─▶ [rows] ─▶ SQL payload builder ─▶
//   canonicalOrderFromRxSubmission() ─▶ buildOrderHashref()
//
//   · supabase is stubbed to CAPTURE the rows persistPayload writes.
//   · build_rx_submission_payload (SQL) is mirrored by rxSubmissionFixture.
//
// A batch of seeded random orders is generated, entered through the real engine,
// and every value that should survive is compared with the file. Mismatches are
// collected per defect CLASS rather than failing on the first, so one run shows
// everything that is wrong. The seed is fixed: a failure reproduces exactly.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLOURS, DESIGNS, MATERIALS, RX_TEST_DATA, TREATMENTS, mountRxOrder, testLensPrice } from "@/tests/support/rxOrderHarness";
import { buildSubmissionPayload, type CapturedRows } from "@/tests/support/rxSubmissionFixture";
import { persistPayload } from "@/features/rx-order/embed/rx-order-adapter";
import {
  buildOrderHashref,
  canonicalOrderFromRxSubmission,
} from "../../../supabase/functions/_shared/orders/hashref";

const captured = vi.hoisted(() => ({ rows: { quote_lines: [], rx_details: [], quote_frame_details: [], quotes: [] } as any }));

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    let pendingRows: any[] | null = null;
    const c: any = {};
    for (const m of ["select", "eq", "order", "not", "limit"]) c[m] = () => c;
    c.delete = () => { if (table === "quote_lines") captured.rows.quote_lines = []; return c; };
    c.update = (row: any) => { (captured.rows[table] ??= []).push(row); return c; };
    c.insert = (row: any) => {
      const list = Array.isArray(row) ? row : [row];
      pendingRows = list.map((r, i) => (table === "quote_lines" ? { ...r, id: `line-${captured.rows.quote_lines.length + i + 1}` } : r));
      (captured.rows[table] ??= []).push(...pendingRows);
      return c;
    };
    c.maybeSingle = async () => ({ data: null, error: null });
    c.then = (ok: any, err: any) =>
      Promise.resolve({ data: pendingRows ?? [], error: null }).then(ok, err);
    return c;
  };
  // persistPayload saves through the save_rx_order RPC; the mirror reproduces
  // its row effects into the same captured rows the table stubs fill.
  const rpc = async (name: string, args: any) => {
    if (name !== "save_rx_order") return { data: null, error: { message: `unexpected rpc ${name}` } };
    const { saveRxOrderMirror } = await import("@/tests/support/rxSubmissionFixture");
    try {
      return { data: saveRxOrderMirror(args.p_quote_id, args.p_payload, captured.rows), error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  };
  return { supabase: { from: (t: string) => builder(t), rpc } };
});

// ── seeded generator ────────────────────────────────────────────────────────
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SEED = 20260929;
const BATCH = 25;
const rng = mulberry32(SEED);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const between = (lo: number, hi: number, step: number) => {
  const n = Math.floor((hi - lo) / step);
  return lo + Math.floor(rng() * (n + 1)) * step;
};
const fmt = (n: number) => n.toFixed(2);

type Side = { sph: string; cyl: string; axis: string; add?: string; pd: string; ht: string; prism?: string; base?: string };
interface Spec {
  n: number;
  eyes: "pair" | "od" | "os";
  vision: "sv" | "mf";
  split: boolean;
  lens: { m: string; d: string; c: string };
  lensOs?: { m: string; d: string; c: string };
  rx: { od?: Side; os?: Side };
  frame: { name: string; mount: string; a: string; b: string; dbl: string };
  patient: { first: string; last: string };
  treatments: string[];
}

const NAMES = ["Alder", "Bishop", "Clarke", "Deane", "Ellis", "Forde", "Gill", "Holder", "Inniss", "Jones"];

const makeSide = (progressive: boolean): Side => {
  const hasCyl = rng() < 0.7;
  const side: Side = {
    sph: fmt(between(-6, 4, 0.25)),
    cyl: hasCyl ? fmt(-between(0.25, 2.5, 0.25)) : "",
    axis: hasCyl ? String(between(1, 180, 1)) : "",
    pd: String(between(26, 36, 0.5)),
    ht: String(between(16, 28, 1)),
  };
  if (progressive) side.add = fmt(between(0.75, 3, 0.25));
  if (rng() < 0.25) {
    side.prism = fmt(between(0.5, 3, 0.5));
    side.base = pick(["IN", "OUT", "UP", "DOWN"] as const);
  }
  return side;
};

const makeSpec = (n: number): Spec => {
  const eyes = pick(["pair", "pair", "pair", "od", "os"] as const);
  const vision = rng() < 0.3 ? "mf" : "sv";
  const design = vision === "mf" ? DESIGNS.prog : DESIGNS.sv;
  const material = pick([MATERIALS.plastic, MATERIALS.poly, MATERIALS.hi167]);
  const lens = { m: material, d: design, c: COLOURS.clear };
  const split = eyes === "pair" && vision === "sv" && rng() < 0.3;
  const lensOs = split ? { m: pick([MATERIALS.plastic, MATERIALS.poly]), d: DESIGNS.sv, c: COLOURS.clear } : undefined;
  const prog = vision === "mf";
  return {
    n, eyes, vision, split, lens, lensOs,
    rx: {
      ...(eyes !== "os" ? { od: makeSide(prog) } : {}),
      ...(eyes !== "od" ? { os: makeSide(prog) } : {}),
    },
    frame: {
      name: `Frame ${pick(NAMES)} ${between(100, 999, 1)}`,
      mount: pick(["plastic", "metal", "grooved", "rimless"] as const),
      a: String(between(46, 58, 1)), b: String(between(32, 44, 1)), dbl: String(between(14, 22, 1)),
    },
    patient: { first: pick(NAMES), last: pick(NAMES) },
    treatments: pick([[], [], [TREATMENTS.superAr], [TREATMENTS.hardCoat], [TREATMENTS.superAr, TREATMENTS.tintSolid]]),
  };
};

// ── driving the real engine ─────────────────────────────────────────────────
const enterOrder = async (spec: Spec) => {
  const onSubmittedDirect = vi.fn().mockResolvedValue(undefined);
  const h = mountRxOrder({ canSubmitDirect: true, onSubmittedDirect, onSubmitted: vi.fn(), lensPrice: testLensPrice });
  h.segment("eyeSeg", "eyes", spec.eyes);
  h.segment("visionSeg", "vision", spec.vision);
  if (spec.split) h.setSplit(true);
  h.fillValidOrder({
    eyes: undefined, vision: undefined,
    patient: spec.patient,
    frame: { ...spec.frame, ed: undefined },
    lens: spec.lens,
    rx: Object.fromEntries(Object.entries(spec.rx).map(([eye, s]) => [eye, s])) as any,
  });
  if (spec.lensOs) h.selectLensOs(spec.lensOs);
  for (const t of spec.treatments) h.toggleTreatment(t);

  if (!h.submitEnabled()) {
    const why = [...h.rxErrors(), ...h.checklist().filter((c) => !c.ok).map((c) => c.label)].join("; ");
    h.destroy();
    return { rejected: why || "submit disabled" as string };
  }
  h.field<HTMLButtonElement>("#submitBtn")?.click();
  await vi.waitFor(() => expect(onSubmittedDirect).toHaveBeenCalledTimes(1));
  const payload = (onSubmittedDirect as any).mock.calls[0][0];
  h.destroy();
  return { payload };
};

const persist = async (payload: any, n: number) => {
  captured.rows = { quote_lines: [], rx_details: [], quote_frame_details: [], quotes: [] };
  const alias = (m: string, d: string, c: string) => ({ alias: `ALIAS|${m}|${d}|${c}`, label: `${m} ${d} ${c}` });
  const addons = RX_TEST_DATA.treatments.map((t) => ({
    id: t.id, name: t.n, sku: `SKU-${t.id}`, price: t.p, cost: 1, category: t.c,
  })) as any;
  await persistPayload(`quote-${n}`, payload, {
    lensIndex: new Map(),
    addons,
    lensPriceBBD: testLensPrice,
    resolveAlias: alias,
  });
  const rows = captured.rows as CapturedRows;
  const submission = buildSubmissionPayload(rows, {
    quoteId: `quote-${n}`, quoteNumber: `Q-${1000 + n}`, accountId: 776,
    codesFor: (a) => {
      const [, m, d, c] = a.split("|");
      return {
        material_code: `M-${m}`, material_description: m,
        style_code: `S-${d}`, style_description: d,
        color_code: `C-${c}`, color_description: c, mf_type: "SV",
      };
    },
  });
  return { rows, submission };
};

const parse = (file: string) => {
  const map = new Map<string, string>();
  const items: Record<string, string>[] = [];
  let cur: Record<string, string> | null = null;
  for (const raw of file.split("\r\n")) {
    if (raw === "item_start") { cur = {}; continue; }
    if (raw === "item_end") { if (cur) items.push(cur); cur = null; continue; }
    const i = raw.indexOf(":");
    if (i < 0) continue;
    const k = raw.slice(0, i), v = raw.slice(i + 1);
    if (cur) cur[k] = v; else if (!map.has(k)) map.set(k, v);
  }
  return { map, items };
};

// ── the batch ───────────────────────────────────────────────────────────────
describe(`Rx order → Hashref fidelity (seed ${SEED}, ${BATCH} orders)`, () => {
  beforeEach(() => { document.body.innerHTML = ""; localStorage.clear(); });

  // Decisions behind what "unchanged" means here: prism is sent only when
  // prescribed (Innovations prices it; no price lines go with the file); a
  // single-eye order omits the other eye; one height per eye travels as the
  // seg-height field whatever the lens type.
  it("every value entered reaches Innovations unchanged", async () => {
    const defects = new Map<string, string[]>();
    const flag = (cls: string, detail: string) => defects.set(cls, [...(defects.get(cls) ?? []), detail]);
    const rejected: string[] = [];
    let built = 0;

    for (let n = 1; n <= BATCH; n++) {
      const spec = makeSpec(n);
      const tag = `#${n} ${spec.eyes}/${spec.vision}${spec.split ? "/split" : ""}`;
      const entered = await enterOrder(spec);
      if ("rejected" in entered) { rejected.push(`${tag}: ${entered.rejected}`); continue; }

      const { rows, submission } = await persist(entered.payload, n);

      // The saved total is the sum of the saved lines (the server sums them),
      // and must equal what the form quoted — within the cent rounding of
      // splitting an amount across lines.
      const quotedTotal = Number(entered.payload.quote?.total ?? 0);
      const savedTotal = Number(rows.quotes[0]?.grand_total ?? 0);
      if (Math.abs(savedTotal - quotedTotal) > 0.05 * Math.max(1, rows.quote_lines.length)) {
        flag("TOTAL_MISMATCH", `${tag}: form quoted ${quotedTotal}, saved lines sum to ${savedTotal}`);
      }
      let file: string;
      try {
        const order = canonicalOrderFromRxSubmission({ id: `sub-${n}`, gatekeeper_order_id: 100000 + n, payload: submission as any });
        file = buildOrderHashref(order, { labNum: "001", custNum: "CV" });
      } catch (e: any) {
        flag("BUILD_FAILS", `${tag}: ${e.message}`);
        continue;
      }
      built++;
      const { map, items } = parse(file);

      // patient
      if (map.get("patient_name")?.toUpperCase() !== `${spec.patient.first} ${spec.patient.last}`.toUpperCase()) {
        flag("PATIENT_NAME", `${tag}: sent "${map.get("patient_name")}"`);
      }

      for (const eye of ["od", "os"] as const) {
        const want = spec.rx[eye];
        if (!want) continue;
        const sent = (k: string) => map.get(`rx_${eye}_${k}`);
        if (Number(sent("sphere")) !== Number(want.sph)) flag("SPHERE", `${tag} ${eye}: entered ${want.sph}, sent ${sent("sphere")}`);
        if (Number(sent("cylinder")) !== Number(want.cyl || 0)) flag("CYLINDER", `${tag} ${eye}: entered ${want.cyl || 0}, sent ${sent("cylinder")}`);
        if (Number(sent("axis")) !== Number(want.axis || 0)) flag("AXIS", `${tag} ${eye}: entered ${want.axis || 0}, sent ${sent("axis")}`);
        if (Number(sent("far")) !== Number(want.pd)) flag("PD", `${tag} ${eye}: entered ${want.pd}, sent ${sent("far")}`);

        if (want.prism) {
          if (Number(sent("prism")) !== Number(want.prism) || sent("prism_dir") !== want.base) {
            flag("PRISM_DROPPED", `${tag} ${eye}: entered ${want.prism} ${want.base}, sent ${sent("prism")} ${sent("prism_dir")}`);
          }
        }
        if (want.add) {
          if (Number(sent("add")) !== Number(want.add)) flag("ADD", `${tag} ${eye}: entered ${want.add}, sent ${sent("add")}`);
          if (Number(sent("seg_height")) !== Number(want.ht)) {
            flag("SEG_HEIGHT_PER_EYE", `${tag} ${eye}: entered ${want.ht}, sent ${sent("seg_height")}`);
          }
        }
      }

      // an eye that was not ordered must not be invented
      if (spec.eyes === "od" && map.has("rx_os_sphere") && Number(map.get("rx_os_sphere")) !== 0) flag("PHANTOM_EYE", `${tag}: OS sent`);
      if (spec.eyes === "os" && map.has("rx_od_sphere") && Number(map.get("rx_od_sphere")) !== 0) flag("PHANTOM_EYE", `${tag}: OD sent`);

      // lens per eye
      if (spec.split && spec.lensOs) {
        const wantOs = `M-${spec.lensOs.m}`;
        if (map.get("x_lens_os_material_code") !== wantOs) {
          flag("SPLIT_LENS_LOST", `${tag}: OS lens entered ${spec.lensOs.m}, sent ${map.get("x_lens_os_material_code")}`);
        }
      }

      // frame
      if (map.get("frame_model") === spec.frame.mount) flag("FRAME_MODEL_IS_MOUNT_TYPE", `${tag}: frame_model "${map.get("frame_model")}" is the mount type`);
      if (map.get("frame_vendor")?.toUpperCase() !== spec.frame.name.toUpperCase()) flag("FRAME_VENDOR", `${tag}: entered "${spec.frame.name}", sent "${map.get("frame_vendor")}"`);
      // The form defaults to "uncut Rx lenses", where A/B/DBL are deliberately not sent.

      // coatings & tints
      if (items.length !== spec.treatments.length) flag("ITEMS_MISSING", `${tag}: entered ${spec.treatments.length}, sent ${items.length}`);
    }

    const summary = [...defects.entries()].map(([cls, list]) => `${cls} ×${list.length} — e.g. ${list[0]}`).join("\n");
    // eslint-disable-next-line no-console
    console.log(`Rx→Hashref fidelity: ${built} files built, ${rejected.length} orders refused by the form.\n${summary || "no defects"}`);
    expect(built, `form refused too many generated orders:\n${rejected.join("\n")}`).toBeGreaterThan(BATCH / 2);
    expect(summary, summary).toBe("");
  }, 60_000);
});
