// The Rx form's validation rules, pinned.
//
// The engine spreads its verdicts across four surfaces — the submit checklist,
// the blocking-error callout, the dismissible-warning callout and the submit
// button's own disabled state — and derives all four from secValid()/errors()/
// warnings() on every render. Nothing until now asserted what those rules
// actually ARE, so a UI or copy change could quietly widen a producible range
// or drop a gate and no test would notice.
//
// This is that net. It is intentionally a broad sweep rather than a deep dive:
// one case per rule, phrased against what a dispenser sees, so a rule that
// changes on purpose fails loudly here and gets re-pinned deliberately.
import { beforeEach, describe, expect, it } from "vitest";
import { COLOURS, DESIGNS, MATERIALS, mountRxOrder } from "@/tests/support/rxOrderHarness";

const CHECKLIST = [
  "Patient name",
  "Job type & frame measurements",
  "Material, design & colour",
  "Prescription complete & valid",
];

describe("Rx order validation rules", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  describe("submit gate", () => {
    it("starts with every check outstanding and submit disabled", () => {
      const h = mountRxOrder();

      expect(h.checklist()).toEqual(CHECKLIST.map((label) => ({ label, ok: false })));
      expect(h.submitEnabled()).toBe(false);
      expect(h.quoteText()).toContain("No lens chosen yet");

      h.destroy();
    });

    it("opens submit only once all four checks pass", () => {
      const h = mountRxOrder().fillValidOrder();

      expect(h.checklist()).toEqual(CHECKLIST.map((label) => ({ label, ok: true })));
      expect(h.rxErrors()).toEqual([]);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });

    it.each([
      ["patient surname", () => ({ patient: { last: "" } })],
      ["frame name", () => ({ frame: { name: "" } })],
      ["A measurement", () => ({ frame: { a: "" } })],
      ["DBL measurement", () => ({ frame: { dbl: "" } })],
    ])("holds submit shut when the %s is missing", (_label, override) => {
      const h = mountRxOrder().fillValidOrder(override() as never);

      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("holds submit shut until a lens is chosen", () => {
      const h = mountRxOrder().fillValidOrder();
      h.state.m = "";
      h.state.d = "";
      h.state.c = "";
      h.engine.refreshData();

      expect(h.checklist().find((c) => c.label === "Material, design & colour")?.ok).toBe(false);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });
  });

  describe("blocking prescription errors", () => {
    it("rejects a sphere beyond the producible range", () => {
      const h = mountRxOrder().fillValidOrder({ rx: { od: { sph: "-30" } } });

      expect(h.rxErrors()).toEqual(["OD sphere is outside the producible range (+18.00 to -25.00)."]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("rejects a cylinder that needs a lab consult", () => {
      const h = mountRxOrder().fillValidOrder({ rx: { os: { cyl: "-9.00" } } });

      expect(h.rxErrors()).toEqual(["OS cylinder beyond -8.00 needs a lab consult."]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("rejects prism entered without a base direction", () => {
      const h = mountRxOrder().fillValidOrder({ rx: { od: { prism: "2.00" } } });

      expect(h.rxErrors()).toEqual(["OD prism needs a base direction."]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("accepts prism once a base direction is supplied", () => {
      const h = mountRxOrder().fillValidOrder({ rx: { od: { prism: "2.00", base: "IN" } } });

      expect(h.rxErrors()).toEqual([]);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });

    it("rejects a near PD wider than the distance PD", () => {
      const h = mountRxOrder().fillValidOrder({
        vision: "sv",
        rx: { od: { pd: "32", npd: "34" }, os: { pd: "32", npd: "30" } },
      });
      h.segment("purposeSeg", "purpose", "read");

      expect(h.rxErrors()).toEqual(["OD near PD is wider than distance PD — check the measurement."]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("rejects a progressive fitting height below the 14 mm cut limit", () => {
      const h = mountRxOrder().fillValidOrder({
        vision: "mf",
        lens: { m: MATERIALS.plastic, d: DESIGNS.prog, c: COLOURS.clear },
        rx: { od: { add: "2.00", ht: "12" }, os: { add: "2.00", ht: "22" } },
      });

      expect(h.rxErrors()).toEqual([
        "OD fitting height 12.0 mm — progressives cannot be cut below 14 mm.",
      ]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("rejects an add above the producible maximum", () => {
      const h = mountRxOrder().fillValidOrder({
        vision: "mf",
        lens: { m: MATERIALS.plastic, d: DESIGNS.prog, c: COLOURS.clear },
        rx: { od: { add: "5.00", ht: "22" }, os: { add: "2.00", ht: "22" } },
      });

      expect(h.rxErrors()).toContain("OD add above +4.50 is not producible.");
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });
  });

  describe("dismissible warnings", () => {
    it("flags opposing sphere signs without blocking submit", () => {
      const h = mountRxOrder().fillValidOrder({ rx: { od: { sph: "+2.00" }, os: { sph: "-2.00" } } });

      expect(h.rxWarnings()).toEqual([
        "Right eye is +2.00 and left is -2.00 — opposing signs. Unusual but not impossible; dismiss if intended.",
      ]);
      expect(h.rxErrors()).toEqual([]);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });

    it("does not raise the opposing-sign warning on a single-eye job", () => {
      const h = mountRxOrder().fillValidOrder({ eyes: "od", rx: { od: { sph: "+2.00" } } });

      expect(h.rxWarnings()).toEqual([]);

      h.destroy();
    });
  });

  describe("conditional field requirements", () => {
    it("does not ask a single-vision job for a reading addition", () => {
      const h = mountRxOrder().fillValidOrder();

      expect(h.rxCell("od", "add")?.value).toBe("");
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });

    it("requires an add on a multifocal before it will submit", () => {
      const h = mountRxOrder().fillValidOrder({
        vision: "mf",
        lens: { m: MATERIALS.plastic, d: DESIGNS.prog, c: COLOURS.clear },
        rx: { od: { ht: "22" }, os: { ht: "22" } },
      });
      expect(h.submitEnabled()).toBe(false);

      h.setRx("od", { add: "2.00" });
      h.setRx("os", { add: "2.00" });
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });

    it("collects a near PD instead of a height for a reading Rx", () => {
      const h = mountRxOrder().fillValidOrder();
      h.segment("purposeSeg", "purpose", "read");

      // Near PD is now required and absent, so the prescription check reopens.
      expect(h.checklist().find((c) => c.label === "Prescription complete & valid")?.ok).toBe(false);

      h.setRx("od", { npd: "30" });
      h.setRx("os", { npd: "30" });
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });
  });

  describe("frame measurement limits", () => {
    it.each([
      ["A", "#fa", "90"],
      ["B", "#fb", "70"],
      ["DBL", "#fdbl", "40"],
    ])("blocks an out-of-range %s measurement", (_label, selector, value) => {
      const h = mountRxOrder().fillValidOrder();
      h.set(selector, value);

      expect(h.checklist().find((c) => c.label === "Job type & frame measurements")?.ok).toBe(false);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });
  });

  describe("pricing gates", () => {
    it("prices a combination the matrix covers", () => {
      const h = mountRxOrder().fillValidOrder();

      // The default fixture frame (A 52 / B 38 / DBL 18) needs a 75 mm blank,
      // so the total is the 278.25 pair price plus the 22.00 oversize surcharge.
      expect(h.field("#qTotal")?.textContent).toContain("300.25");
      expect(h.quoteText()).not.toContain("on request");
      expect(h.assistFlags()).toEqual([]);

      h.destroy();
    });

    it("routes an unpriced combination to assistance and blocks the cart", () => {
      const h = mountRxOrder().fillValidOrder({
        lens: { m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.amber },
      });

      expect(h.quoteText()).toContain("on request");
      expect(h.quoteText()).not.toMatch(/\b0\.00\b/);
      expect(h.assistFlags()).toEqual(["Lens not priced on this account — quote requested"]);
      // Every checklist item passes; the price is the only thing holding it.
      expect(h.checklist().every((c) => c.ok)).toBe(true);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });
  });
});
