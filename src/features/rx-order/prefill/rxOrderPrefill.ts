// Lens Assistant → Rx order form handoff.
//
// Turns a saved rx_order_drafts row into a partial `cv.rxorder/1` payload that
// the prototype engine's restorePayload() can replay. Deliberately partial: the
// assistant collects a prescription and a frame box, not a dispensing job, so
// PD, near PD, fitting height, ED, temple and patient name stay empty and the
// engine's own markNeeded() beacon glows them for the dispenser to complete.
//
// The lens triple (material / design / colour) is also left empty. A
// recommendation names a catalogue product by id, while the engine keys lenses
// by a material|mftype|lenstype|finishtype triple — resolving one to the other
// is its own piece of work and is not attempted here.
import type { EyePrescription, LensRecommendationInput, RxOrderDraft } from "@/features/lens-assistant/types";

/** The subset of `cv.rxorder/1` that restorePayload() reads. */
export interface RxOrderPrefillPayload {
  schema: "cv.rxorder/1";
  orderNo: null;
  reference: string | null;
  patient: { first: string; last: string };
  job: { scope: "uncut" | "remote" | "glaze"; eyes: "pair" | "od" | "os"; vision: "sv" | "mf"; purpose: "dist" | "read" | "inter" };
  frame: { name: string; mount: string; source: string; a: number | null; b: number | null; ed: number | null; dbl: number | null; temple: number | null };
  shape: null;
  lens: { material: string; design: string; colour: string };
  rx: Record<"od" | "os", RxEyeRow>;
  treatments: string[];
  assistance: string[];
  delivery: { service: string; method: string; notes: string };
}

interface RxEyeRow {
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  prism: number | null;
  base: "IN" | "OUT" | "UP" | "DOWN" | "";
  pd: null;
  npd: null;
  ht: null;
}

// assistant frameType → the engine's #mount select values. "sports" has no
// mount of its own in the form; a wrap is still a full rim as far as the lab is
// concerned, and the frame name field carries the rest.
const MOUNT_BY_FRAME_TYPE: Record<LensRecommendationInput["frameType"], string> = {
  "full-rim": "full",
  "semi-rimless": "supra",
  rimless: "rimless",
  sports: "full",
  "": "full",
};

// assistant primaryUse → the engine's #purposeSeg values. Only reading and
// computer work name a non-distance purpose; driving and outdoor are distance.
const PURPOSE_BY_PRIMARY_USE: Record<LensRecommendationInput["primaryUse"], "dist" | "read" | "inter"> = {
  reading: "read",
  computer: "inter",
  general: "dist",
  driving: "dist",
  outdoor: "dist",
  "": "dist",
};

const PRISM_BASE: Record<EyePrescription["prismBase"], RxEyeRow["base"]> = {
  up: "UP",
  down: "DOWN",
  in: "IN",
  out: "OUT",
  "": "",
};

const hasAdd = (eye: EyePrescription) => eye.add !== null && eye.add !== 0;

const toRxRow = (eye: EyePrescription): RxEyeRow => ({
  sph: eye.sphere,
  cyl: eye.cylinder,
  axis: eye.axis,
  add: eye.add,
  prism: eye.prism,
  base: PRISM_BASE[eye.prismBase] ?? "",
  // Not collected by the assistant — the dispenser measures these.
  pd: null,
  npd: null,
  ht: null,
});

/** Lifestyle answers the payload has no field for, carried to the lab as notes. */
export const buildPrefillNotes = (input: LensRecommendationInput): string => [
  input.occupation.trim() ? `Occupation: ${input.occupation.trim()}` : null,
  input.visualPriority.trim() ? `Priority: ${input.visualPriority.trim()}` : null,
  input.lightPreference ? `Light/tint preference: ${input.lightPreference}` : null,
  input.priceLevel ? `Preferred price level: ${input.priceLevel}` : null,
  input.adaptationIssues ? "Previous progressive adaptation difficulty reported." : null,
].filter(Boolean).join("\n");

export const buildRxPrefillPayload = (draft: RxOrderDraft): RxOrderPrefillPayload => {
  const input = draft.input_payload;
  return {
    schema: "cv.rxorder/1",
    // Not a rebuild of a previous order — leaving this null keeps the engine
    // from stamping S.rebuiltFrom and keeps the quote's own number.
    orderNo: null,
    reference: input.patientReference.trim() || null,
    patient: { first: "", last: "" },
    job: {
      // The assistant never asks about glazing; uncut is the engine's own default.
      scope: "uncut",
      eyes: "pair",
      vision: hasAdd(input.right) || hasAdd(input.left) ? "mf" : "sv",
      purpose: PURPOSE_BY_PRIMARY_USE[input.primaryUse] ?? "dist",
    },
    frame: {
      name: "",
      mount: MOUNT_BY_FRAME_TYPE[input.frameType] ?? "full",
      source: "",
      a: input.frameA,
      b: input.frameB,
      dbl: input.frameDbl,
      // ED and temple are measurements, not assistant answers; the engine
      // derives a suggested ED from A and B once both are present.
      ed: null,
      temple: null,
    },
    shape: null,
    lens: { material: "", design: "", colour: "" },
    rx: { od: toRxRow(input.right), os: toRxRow(input.left) },
    treatments: [],
    assistance: [],
    delivery: { service: "std", method: "", notes: buildPrefillNotes(input) },
  };
};

/** Banner text shown above the prefilled form. */
export const buildPrefillBanner = (draft: RxOrderDraft): string => {
  const reference = draft.patient_reference?.trim();
  const saved = new Date(draft.updated_at).toLocaleString();
  return `<b>Prefilled from the Lens Assistant</b> — ${reference ? `${reference}, ` : ""}saved ${saved}. `
    + `The prescription and frame box carried over; the lens, PDs and fitting height are still to be chosen. `
    + `Everything below is editable and the quote prices from today's rates.`;
};
