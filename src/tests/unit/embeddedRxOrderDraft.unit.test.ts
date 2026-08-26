import { describe, expect, it } from "vitest";
import { buildEmbeddedRxOrderDraftFields, resolveResumedRxDraftId } from "@/features/lens-assistant/api";

describe("embedded Rx-order draft persistence", () => {
  it("retains the engine payload and labels the saved order by patient", () => {
    const payload = {
      schema: "cv.rxorder/1" as const,
      patient: { first: "Marcus", last: "Grant" },
      orderNo: "80000001",
      rx: { od: { sph: -2 }, os: { sph: -1.5 } },
    };

    expect(buildEmbeddedRxOrderDraftFields(payload)).toEqual({
      name: "Rx order — Marcus Grant · Order 80000001",
      patient_reference: "Marcus Grant",
      status: "draft",
      input_payload: payload,
      recommendation_snapshot: null,
      rule_set_id: null,
    });
  });

  it("keeps saving into the draft row that opened the order form", () => {
    const draftId = "draft-1";

    expect(resolveResumedRxDraftId(draftId, { schema: "cv.rxorder/1" })).toBe(draftId);
    expect(resolveResumedRxDraftId(draftId, { audience: "professional" })).toBe(draftId);
    expect(resolveResumedRxDraftId(draftId, undefined)).toBeUndefined();
  });
});
