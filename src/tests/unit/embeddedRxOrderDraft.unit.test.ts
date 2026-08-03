import { describe, expect, it } from "vitest";
import { buildEmbeddedRxOrderDraftFields } from "@/features/lens-assistant/api";

describe("embedded Rx-order draft persistence", () => {
  it("retains the engine payload and labels the saved order by patient", () => {
    const payload = {
      schema: "cv.rxorder/1",
      patient: { first: "Marcus", last: "Grant" },
      orderNo: "80000001",
      rx: { od: { sph: -2 }, os: { sph: -1.5 } },
    };

    expect(buildEmbeddedRxOrderDraftFields(payload)).toEqual({
      name: "Rx order — Marcus Grant",
      patient_reference: "Marcus Grant",
      status: "draft",
      input_payload: payload,
      recommendation_snapshot: null,
      rule_set_id: null,
    });
  });
});
