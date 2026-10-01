// Photo / document capture: what the model is asked to read, and how what it read
// becomes a draft Rx order. Ported from optilens-local lib/rx-capture (the prompt
// is tested on real order sheets) minus voice. Pure: no Deno, no network, so the
// app's unit tests import it directly.
//
// The model returns every value as text, "" when absent (no nullable unions, which
// the gateway's models handle unevenly). The mapper turns that into a
// cv.rxorder/1 payload with `flags` — fields the model marked uncertain, plus
// anything it returned that does not parse. Nothing is guessed: a blank stays
// blank and the form's own validation keeps the order from being submitted.

const EYE_FIELDS = ["sphere", "cylinder", "axis", "add", "prism", "base"] as const;

export const OPTICAL_FIELDS = [
  "patient.name", "patient.reference",
  ...(["od", "os"] as const).flatMap((e) => EYE_FIELDS.map((f) => `prescription.${e}.${f}`)),
  "pd.binocular", "pd.od", "pd.os", "pd.nearOd", "pd.nearOs",
  "frame.status", "frame.mounting", "frame.model", "frame.color", "frame.a", "frame.b", "frame.dbl", "frame.ed",
  "frame.segHeightOd", "frame.segHeightOs",
  "lensRequest.lensType", "lensRequest.design", "lensRequest.material", "lensRequest.option", "lensRequest.coating",
  "instructions",
] as const;

export const EXTRACTION_INSTRUCTIONS = [
  "Extract only optical prescription and order information visibly present in the supplied images or documents.",
  "Every value is returned as text. Use an empty string for anything absent.",
  "Never guess, calculate, transpose, or infer missing prescription powers.",
  "Preserve plus and minus signs and return cylinder exactly as written. Do not convert cylinder notation.",
  "Distinguish OD (right) from OS (left) carefully. Axis must be a whole number from 1 through 180 when present.",
  "Do not invent PD, ADD, lens type, frame information, or patient identity.",
  "Printed labels and column headings are not values. A visible ADD, Prism, or Base heading with a blank cell means the value is absent, not unreadable.",
  "ADD is optional for single-vision prescriptions. If the document says single vision, or the ADD cells are clearly blank, return an empty string and do not add ADD paths to uncertainFields.",
  "Prism and base are optional. When their cells are clearly blank, return an empty string and do not add them to uncertainFields.",
  "For frame.status use TO_BE_TRACED when a physical frame will be supplied or traced later, MEASURED only when actual frame measurements are visible, and UNCUT only when explicitly stated; otherwise an empty string.",
  "frame.mounting is 1 for a metal frame, 2 for plastic, 3 for rimless or grooved, only when stated; otherwise an empty string.",
  "Copy the frame model and frame color exactly when they are written or printed (for example on an order sheet, envelope, or frame label). Otherwise return an empty string.",
  "Never invent frame model, color, A, B, DBL, ED, or segment heights.",
  "If the documents say the lenses are supplied by the customer or patient (for example 'own lenses', 'pt supplied', 'cut only'), include that wording in lensRequest.design.",
  "Extract any visible lens type, design, material, option, and coating text exactly as written.",
  "Put anything else the sheet asks the lab to do (delivery, handling, special requests) in instructions.",
  "If a mark or value appears to be present but cannot be read reliably, return your best reading and add that exact field path to uncertainFields.",
  "Return only the requested structured result.",
].join("\n");

const str = { type: "string" } as const;
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties) });
const eye = obj(Object.fromEntries(EYE_FIELDS.map((f) => [f, str])));

/** JSON Schema for the forced tool call. */
export const extractionToolParameters = () => obj({
  patient: obj({ name: str, reference: str }),
  prescription: obj({ od: eye, os: eye }),
  pd: obj({ binocular: str, od: str, os: str, nearOd: str, nearOs: str }),
  frame: obj({ status: str, mounting: str, model: str, color: str, a: str, b: str, dbl: str, ed: str, segHeightOd: str, segHeightOs: str }),
  lensRequest: obj({ lensType: str, design: str, material: str, option: str, coating: str }),
  instructions: str,
  uncertainFields: { type: "array", items: { type: "string", enum: [...OPTICAL_FIELDS] } },
});

export interface RawExtraction {
  patient?: { name?: unknown; reference?: unknown };
  prescription?: Record<"od" | "os", Record<string, unknown> | undefined>;
  pd?: Record<string, unknown>;
  frame?: Record<string, unknown>;
  lensRequest?: Record<string, unknown>;
  instructions?: unknown;
  uncertainFields?: unknown;
}

export interface DraftFlag { path: string; reason: string }
export interface DraftFromCapture { payload: Record<string, unknown>; flags: DraftFlag[] }

const text = (v: unknown, max = 200): string => (v === null || v === undefined ? "" : String(v).trim().slice(0, max));
/** A plain decimal, tolerating a leading sign and a trailing "°" or "mm". Null when it is not a number. */
const num = (v: unknown): number | null => {
  const t = text(v, 40).replace(/[°\s]|mm$/gi, "").replace(",", ".");
  if (!t || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t);
};

const MOUNT: Record<string, string> = { "1": "metal", "2": "plastic" };
const BASES = new Set(["IN", "OUT", "UP", "DOWN"]);

/** "GRANT, MARCUS" or "Marcus Grant" → { first, last } */
export function splitName(raw: string): { first: string; last: string } {
  const name = raw.trim();
  if (!name) return { first: "", last: "" };
  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    return { first: rest.join(" ").trim(), last: last.trim() };
  }
  const words = name.split(/\s+/);
  if (words.length < 2) return { first: "", last: name };
  const last = words.pop() as string;
  return { first: words.join(" "), last };
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, p, c) => p + c.toUpperCase());

/** Where each model field lives in the form (the `flags` path convention). */
const EYE_PATH: Record<string, string> = { sphere: "sph", cylinder: "cyl", axis: "axis", add: "add", prism: "prism", base: "base" };

function formPaths(field: string): string[] {
  const p = field.split(".");
  if (p[0] === "patient") return [p[1] === "name" ? "patient.first" : "reference"];
  if (p[0] === "prescription") return [`rx.${p[1]}.${EYE_PATH[p[2]]}`];
  if (p[0] === "pd") {
    if (p[1] === "binocular") return ["rx.od.pd", "rx.os.pd"];
    return [{ od: "rx.od.pd", os: "rx.os.pd", nearOd: "rx.od.npd", nearOs: "rx.os.npd" }[p[1]] as string];
  }
  if (p[0] === "frame") {
    const m: Record<string, string> = { model: "frame.name", color: "frame.name", a: "frame.a", b: "frame.b", dbl: "frame.dbl", ed: "frame.ed", mounting: "frame.mount", segHeightOd: "rx.od.ht", segHeightOs: "rx.os.ht" };
    return m[p[1]] ? [m[p[1]]] : [];
  }
  return [];
}

export function mapExtractionToDraft(raw: RawExtraction | null | undefined, now = new Date()): DraftFromCapture {
  const r = raw ?? {};
  const flags: DraftFlag[] = [];
  const flag = (path: string, reason: string) => { if (path && !flags.some((f) => f.path === path)) flags.push({ path, reason }); };

  const uncertain = Array.isArray(r.uncertainFields) ? r.uncertainFields.map(String).filter((f) => (OPTICAL_FIELDS as readonly string[]).includes(f)) : [];
  for (const f of uncertain) for (const path of formPaths(f)) flag(path, "Hard to read on the original — check it");

  const name = splitName(text(r.patient?.name));
  const patientName = { first: titleCase(name.first), last: titleCase(name.last) };

  const pd = r.pd ?? {};
  const bino = num(pd.binocular);
  const eyeOf = (side: "od" | "os") => {
    const e = r.prescription?.[side] ?? {};
    const out: Record<string, unknown> = {};
    for (const f of ["sphere", "cylinder", "axis", "add", "prism"] as const) {
      const given = text(e[f], 40);
      const n = num(given);
      out[EYE_PATH[f]] = n;
      // something was read but it is not a number: say so rather than dropping it silently
      if (given && n === null) flag(`rx.${side}.${EYE_PATH[f]}`, `Read as "${given}" — not a number`);
    }
    const axis = out.axis as number | null;
    if (axis !== null && !(Number.isInteger(axis) && axis >= 1 && axis <= 180)) {
      flag(`rx.${side}.axis`, `Read as ${axis} — axis must be 1 to 180`);
      out.axis = null;
    }
    const base = text(e.base, 10).toUpperCase();
    out.base = BASES.has(base) ? base : "";
    const dist = num(side === "od" ? pd.od : pd.os);
    out.pd = dist ?? (bino !== null ? bino / 2 : null);
    if (dist === null && bino !== null) flag(`rx.${side}.pd`, `Binocular PD ${bino} split evenly between the eyes`);
    out.npd = num(side === "od" ? pd.nearOd : pd.nearOs);
    out.ht = num(side === "od" ? r.frame?.segHeightOd : r.frame?.segHeightOs);
    return out;
  };
  const od = eyeOf("od");
  const os = eyeOf("os");

  const hasEye = (e: Record<string, unknown>) => e.sph !== null || e.cyl !== null;
  const eyes: "pair" | "od" | "os" = hasEye(od) && !hasEye(os) ? "od" : hasEye(os) && !hasEye(od) ? "os" : "pair";
  const mf = od.add !== null || os.add !== null;

  const frame = r.frame ?? {};
  const mounting = text(frame.mounting, 4);
  if (mounting === "3") flag("frame.mount", "Rimless or grooved? — choose the mount");
  const frameName = [text(frame.model, 120), text(frame.color, 60)].filter(Boolean).join(" ");

  const lr = r.lensRequest ?? {};
  const lensText = [["Type", lr.lensType], ["Design", lr.design], ["Material", lr.material], ["Option", lr.option], ["Coating", lr.coating]]
    .map(([k, v]) => [k, text(v, 160)]).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ");
  const notes = [lensText && `As written on the sheet — ${lensText}`, text(r.instructions, 2000)].filter(Boolean).join("\n");
  // The lens has to be picked from the pricelist; the sheet's wording is a hint, not a choice.
  if (lensText) flag("lens.od.d", "Choose the lens from the pricelist — the sheet's wording is in the notes");

  const payload = {
    schema: "cv.rxorder/1",
    orderNo: null,
    createdAt: now.toISOString(),
    account: null,
    reference: text(r.patient?.reference, 160) || null,
    patient: patientName,
    job: { scope: "uncut", eyes, vision: mf ? "mf" : "sv", purpose: "dist" },
    frame: { name: frameName, mount: MOUNT[mounting] ?? "", source: "", a: num(frame.a), b: num(frame.b), ed: num(frame.ed), dbl: num(frame.dbl) },
    shape: null,
    lens: { material: "", design: "", colour: "" },
    split: false,
    rx: { od, os },
    treatments: [],
    delivery: { service: "std", method: "", notes },
    flags,
  };
  return { payload, flags };
}

/** What optilens-local's reviewer chose, on top of what the sheet said. */
export interface LocalResolution {
  customerNumber?: string;
  lensAlias?: string;
  coatingSku?: string | null;
  addonSkus?: string[];
  frameMode?: string;
  frameMounting?: string;
  instructions?: string;
}

/**
 * An order captured and reviewed at the office (optilens-local) arrives already
 * checked: its lens is an exact Innovations alias, the mount and frame mode were
 * chosen by the reviewer, so the "hard to read" flags are dropped. The 13-digit
 * alias rides on the payload (`lens.innovationsAlias`) for the form to resolve
 * against the account's catalogue; coating / add-on SKUs and the reviewer's
 * instructions go in the lab notes, since they have no field of their own.
 */
export function applyLocalResolution(draft: DraftFromCapture, resolution: LocalResolution | null | undefined): DraftFromCapture {
  const r = resolution ?? {};
  const payload = { ...draft.payload } as Record<string, any>;
  const alias = text(r.lensAlias, 13).replace(/\D/g, "");
  payload.lens = { ...payload.lens, ...(alias ? { innovationsAlias: alias } : {}) };
  if (r.frameMounting !== undefined) payload.frame = { ...payload.frame, mount: MOUNT[text(r.frameMounting, 4)] ?? "" };
  const mode = text(r.frameMode, 10).toLowerCase();
  payload.job = { ...payload.job, scope: mode === "edged" ? "glaze" : "uncut" };
  const skus = [text(r.coatingSku, 80), ...(Array.isArray(r.addonSkus) ? r.addonSkus.map((s) => text(s, 80)) : [])].filter(Boolean);
  const notes = [payload.delivery?.notes, skus.length ? `Office-selected coating / add-on SKUs: ${skus.join(", ")}` : "", text(r.instructions, 500)]
    .filter(Boolean).join("\n");
  payload.delivery = { ...payload.delivery, notes };
  payload.flags = [];
  return { payload, flags: [] };
}
