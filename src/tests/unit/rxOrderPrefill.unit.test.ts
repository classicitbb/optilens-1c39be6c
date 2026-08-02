import { describe, expect, it } from "vitest";
import type { LensRecommendationInput, RxOrderDraft } from "@/features/lens-assistant/types";
import { buildPrefillNotes, buildRxPrefillPayload } from "@/features/rx-order/prefill/rxOrderPrefill";

const input = (overrides: Partial<LensRecommendationInput> = {}): LensRecommendationInput => ({
  audience: "professional",
  patientReference: "TEST-001",
  ageBand: "40-59",
  occupation: "Office work",
  primaryUse: "computer",
  visualPriority: "Intermediate comfort",
  frameType: "full-rim",
  frameA: 54,
  frameB: 38,
  frameDbl: 18,
  priceLevel: "better",
  lightPreference: "clear",
  adaptationIssues: false,
  right: { sphere: -2, cylinder: -0.75, axis: 90, add: 1.5, prism: 1, prismBase: "in" },
  left: { sphere: -1.75, cylinder: -0.5, axis: 85, add: 1.5, prism: null, prismBase: "" },
  ...overrides,
});

const draft = (overrides: Partial<LensRecommendationInput> = {}): RxOrderDraft => ({
  id: "draft-1",
  user_id: "user-1",
  status: "ready_for_lablink",
  name: "Rx — TEST-001",
  patient_reference: "TEST-001",
  input_payload: input(overrides),
  recommendation_snapshot: null,
  rule_set_id: null,
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-01T10:00:00.000Z",
});

describe("rx order prefill", () => {
  it("carries the prescription across to the engine's own field names", () => {
    const { rx } = buildRxPrefillPayload(draft());
    expect(rx.od).toEqual({ sph: -2, cyl: -0.75, axis: 90, add: 1.5, prism: 1, base: "IN", pd: null, npd: null, ht: null });
    expect(rx.os.sph).toBe(-1.75);
    expect(rx.os.base).toBe("");
  });

  it("uppercases the prism base to match the form's select options", () => {
    expect(buildRxPrefillPayload(draft({ right: { sphere: -1, cylinder: null, axis: null, add: null, prism: 2, prismBase: "down" } })).rx.od.base)
      .toBe("DOWN");
  });

  it("leaves dispensing measurements empty for the dispenser to complete", () => {
    const payload = buildRxPrefillPayload(draft());
    expect(payload.rx.od.pd).toBeNull();
    expect(payload.rx.od.ht).toBeNull();
    expect(payload.frame.ed).toBeNull();
    expect(payload.frame.temple).toBeNull();
    expect(payload.patient).toEqual({ first: "", last: "" });
  });

  it("leaves the lens triple unresolved", () => {
    expect(buildRxPrefillPayload(draft()).lens).toEqual({ material: "", design: "", colour: "" });
  });

  it("infers multifocal from a reading addition and single vision without one", () => {
    expect(buildRxPrefillPayload(draft()).job.vision).toBe("mf");
    const noAdd = draft({
      right: { sphere: -2, cylinder: null, axis: null, add: null, prism: null, prismBase: "" },
      left: { sphere: -2, cylinder: null, axis: null, add: 0, prism: null, prismBase: "" },
    });
    expect(buildRxPrefillPayload(noAdd).job.vision).toBe("sv");
  });

  it("maps frame type to a mount and main use to a purpose", () => {
    expect(buildRxPrefillPayload(draft()).job.purpose).toBe("inter");
    expect(buildRxPrefillPayload(draft({ primaryUse: "reading" })).job.purpose).toBe("read");
    expect(buildRxPrefillPayload(draft({ primaryUse: "driving" })).job.purpose).toBe("dist");
    expect(buildRxPrefillPayload(draft({ frameType: "semi-rimless" })).frame.mount).toBe("supra");
    expect(buildRxPrefillPayload(draft({ frameType: "sports" })).frame.mount).toBe("full");
  });

  it("carries the frame box and the patient reference", () => {
    const payload = buildRxPrefillPayload(draft());
    expect(payload.frame.a).toBe(54);
    expect(payload.frame.b).toBe(38);
    expect(payload.frame.dbl).toBe(18);
    expect(payload.reference).toBe("TEST-001");
    expect(buildRxPrefillPayload(draft({ patientReference: "   " })).reference).toBeNull();
  });

  it("does not stamp an order number, so the form is not treated as a rebuild", () => {
    expect(buildRxPrefillPayload(draft()).orderNo).toBeNull();
  });

  it("carries lifestyle answers that have no payload field into the lab notes", () => {
    const notes = buildPrefillNotes(input({ adaptationIssues: true }));
    expect(notes).toContain("Occupation: Office work");
    expect(notes).toContain("Priority: Intermediate comfort");
    expect(notes).toContain("adaptation difficulty");
    expect(buildPrefillNotes(input({ occupation: "", visualPriority: "", lightPreference: "", priceLevel: "" }))).toBe("");
  });
});
