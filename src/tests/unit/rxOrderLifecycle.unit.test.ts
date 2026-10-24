import { describe, expect, it } from "vitest";
import { reorderPayload, rxActions, rxBrief, rxStage, rxTimeline, type RxOrderFacts } from "@/features/rx-order/orders/lifecycle";

const facts = (over: Partial<RxOrderFacts> = {}): RxOrderFacts => ({
  quote_id: "q1", rx_order_number: 1001, quote_status: "Draft", created_at: "2026-10-01T10:00:00Z", total: 100,
  order_id: "o1", order_status: "pending", submission_status: "pending_review", submitted_at: "2026-10-01T10:05:00Z",
  released_at: null, sent_at: null, lab_status: null, lab_status_at: null, order_item_count: 1, paid: false, ...over,
});

describe("rxStage", () => {
  it("walks the lifecycle", () => {
    expect(rxStage(facts({ order_id: null, submission_status: null }))).toBe("draft");
    expect(rxStage(facts())).toBe("submitted");
    expect(rxStage(facts({ submission_status: "approved", released_at: "x" }))).toBe("in_review");
    expect(rxStage(facts({ submission_status: "submitted", sent_at: "x" }))).toBe("sent_to_lab");
    expect(rxStage(facts({ submission_status: "submitted", lab_status: "In production" }))).toBe("in_production");
    expect(rxStage(facts({ submission_status: "submitted", lab_status: "Shipped" }))).toBe("shipped");
  });
  it("reads a failed hand-off as still in review, and never exposes the failure", () => {
    expect(rxStage(facts({ submission_status: "failed" }))).toBe("in_review");
  });
  it("cancelled wins over everything", () => {
    expect(rxStage(facts({ quote_status: "Void", lab_status: "Shipped" }))).toBe("cancelled");
    expect(rxStage(facts({ submission_status: "cancelled" }))).toBe("cancelled");
  });
});

describe("rxTimeline", () => {
  it("marks earlier steps done, the current one current, later ones todo", () => {
    const t = rxTimeline(facts({ submission_status: "submitted", sent_at: "2026-10-02T09:00:00Z" }));
    expect(t.map((s) => s.state)).toEqual(["done", "done", "current", "todo", "todo"]);
    expect(t[2].at).toBe("2026-10-02T09:00:00Z");
    expect(t[3].at).toBeNull();
  });
  it("shows shipped as done once the lab says so", () => {
    const t = rxTimeline(facts({ submission_status: "submitted", lab_status: "Shipped", lab_status_at: "2026-10-05T00:00:00Z" }));
    expect(t.every((s) => s.state === "done")).toBe(true);
  });
  it("has no progress for a draft or a cancelled order", () => {
    expect(rxTimeline(facts({ order_id: null, submission_status: null })).every((s) => s.state === "todo")).toBe(true);
    expect(rxTimeline(facts({ quote_status: "Void" })).every((s) => s.state === "todo")).toBe(true);
  });
});

describe("rxActions", () => {
  it("allows edit and cancel only before release", () => {
    expect(rxActions(facts())).toMatchObject({ edit: true, cancel: true, reorder: true, remake: false });
    expect(rxActions(facts({ submission_status: "approved" }))).toMatchObject({ edit: false, cancel: false });
    expect(rxActions(facts({ submission_status: "submitted", lab_status: "In production" }))).toMatchObject({ edit: false, cancel: false, remake: true });
  });
  it("lets a failed hand-off be cancelled but not edited", () => {
    expect(rxActions(facts({ submission_status: "failed" }))).toMatchObject({ edit: false, cancel: true });
  });
  it("refuses cancel for a paid order or one shared with other items, and says why", () => {
    const paid = rxActions(facts({ paid: true }));
    expect(paid.cancel).toBe(false);
    expect(paid.cancelBlocked).toMatch(/refund/);
    const shared = rxActions(facts({ order_item_count: 3 }));
    expect(shared.cancel).toBe(false);
    expect(shared.cancelBlocked).toMatch(/larger order/);
    expect(rxActions(facts()).cancelBlocked).toBeNull();
  });
  it("does not offer reorder on a bare draft", () => {
    expect(rxActions(facts({ order_id: null, submission_status: null })).reorder).toBe(false);
  });
});

describe("rxBrief / reorderPayload", () => {
  const payload = {
    schema: "cv.rxorder/1", orderNo: "1001", reference: "PO-7", patient: { first: "Ann", last: "Lee" },
    lens: { material: "1.67", design: "Free-form", colour: "Clear" }, split: false,
    frame: { name: "Ray-Ban", a: 50 }, shape: { source: "standard" }, rx: { od: { sph: "-1.00" } },
    treatments: ["ar"], delivery: { notes: "Rush please", service: "pri" }, quote: { total: 100 }, flags: [{ path: "x" }],
  };
  it("summarises patient, reference and lens", () => {
    expect(rxBrief(payload)).toEqual({ patient: "Ann Lee", reference: "PO-7", lens: "1.67 · Free-form · Clear" });
    expect(rxBrief({ ...payload, split: true, lensOs: { material: "1.5", design: "SV", colour: "" } }).lens).toBe("OD 1.67 · Free-form · Clear / OS 1.5 · SV");
    expect(rxBrief(null)).toEqual({ patient: "", reference: "", lens: "" });
  });
  it("keeps the Rx, lens and coatings but clears the frame, shape, reference and prices", () => {
    const p = reorderPayload(payload, "reorder", 1001);
    expect(p.rx).toEqual(payload.rx);
    expect(p.lens).toEqual(payload.lens);
    expect(p.treatments).toEqual(["ar"]);
    expect(p.frame).toEqual({});
    expect(p.shape).toBeNull();
    expect(p.reference).toBe("");
    expect(p.orderNo).toBeUndefined();
    expect(p.quote).toBeUndefined();
    expect(p.flags).toBeUndefined();
    expect(p.delivery.notes).toBe("Reorder of Rx order #1001 — new frame.\nRush please");
    expect(payload.frame.name).toBe("Ray-Ban"); // the original is untouched
  });
  it("labels a remake", () => {
    expect(reorderPayload(payload, "remake", null).delivery.notes).toMatch(/^REMAKE \/ warranty of Rx order the original order\./);
  });
});
