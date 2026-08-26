// Per-eye lens selection ("split eyes").
//
// A dispenser regularly needs two different lenses in one job — a thinner
// index on the stronger eye, a tint on one side only, a replacement for a
// single broken lens of a mismatched pair. The form previously carried ONE
// material/design/colour triple for the whole order, so those jobs had to be
// ordered as two separate orders or corrected by hand at the lab.
//
// The rules being pinned here:
//   · split is a pair-only concept and collapses if the job stops being a pair
//   · each side narrows its own lists — the left eye's choice must never
//     constrain the right eye's options
//   · a split pair of two identical lenses costs exactly what the same
//     unsplit pair costs (see the `share` constant in price())
//   · an unpriced lens on EITHER side blocks the cart, same as before
//   · the payload keeps `lens` as the right/shared lens so every existing
//     reader still works, and adds `lensOs` + `split` for the new case
import { beforeEach, describe, expect, it } from "vitest";
import { COLOURS, DESIGNS, MATERIALS, mountRxOrder } from "@/tests/support/rxOrderHarness";

const OD_LENS = { m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.clear };
const OS_LENS = { m: MATERIALS.hi167, d: DESIGNS.sv, c: COLOURS.clear };

describe("split eyes — a different lens per side", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  describe("availability", () => {
    it("offers the split on a pair and hides it on a single-eye job", () => {
      const h = mountRxOrder().fillValidOrder();
      expect(h.field("#splitRow")?.classList.contains("hide")).toBe(false);

      h.segment("eyeSeg", "eyes", "od");
      expect(h.field("#splitRow")?.classList.contains("hide")).toBe(true);

      h.destroy();
    });

    it("collapses an active split when the job stops being a pair", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs(OS_LENS);
      expect(h.state.split).toBe(true);

      h.segment("eyeSeg", "eyes", "os");

      // The second lens must not survive as a hidden extra charge.
      expect(h.state.split).toBe(false);
      expect(h.state.m2).toBe("");
      expect(h.field("#lensSplitB")?.classList.contains("hide")).toBe(true);

      h.destroy();
    });

    it("seeds the left eye from the right when the split is switched on", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);

      expect(h.state.m2).toBe(OD_LENS.m);
      expect(h.state.d2).toBe(OD_LENS.d);
      expect(h.state.c2).toBe(OD_LENS.c);

      h.destroy();
    });

    it("clears the left eye again when the split is switched off", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs(OS_LENS);
      h.setSplit(false);

      expect(h.state.split).toBe(false);
      expect(h.state.m2).toBe("");
      // The right eye keeps the lens it always had.
      expect(h.state.m).toBe(OD_LENS.m);

      h.destroy();
    });
  });

  describe("independent selection", () => {
    it("lets each eye hold a different lens", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs(OS_LENS);

      expect(h.state.m).toBe(MATERIALS.plastic);
      expect(h.state.m2).toBe(MATERIALS.hi167);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });

    it("does not let the left eye narrow the right eye's options", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      // Polycarbonate has no amber colour; plastic does. Choosing poly on the
      // left must not strip amber from the right eye's list.
      h.selectLensOs({ m: MATERIALS.poly, d: DESIGNS.sv, c: COLOURS.clear });
      h.selectLens({ m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.amber });

      expect(h.state.c).toBe(COLOURS.amber);
      expect(h.state.c2).toBe(COLOURS.clear);

      h.destroy();
    });

    it("matches the left lens to the right on request", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs(OS_LENS);
      expect(h.state.m2).toBe(MATERIALS.hi167);

      h.field<HTMLButtonElement>("#copyLensToOs")?.click();

      expect(h.state.m2).toBe(h.state.m);
      expect(h.state.d2).toBe(h.state.d);
      expect(h.state.c2).toBe(h.state.c);

      h.destroy();
    });

    it("holds submit shut until the left eye has its own lens too", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.state.m2 = "";
      h.state.d2 = "";
      h.state.c2 = "";
      h.engine.refreshData();

      expect(h.checklist().find((c) => c.label === "Material, design & colour")?.ok).toBe(false);
      expect(h.submitEnabled()).toBe(false);

      h.selectLensOs(OS_LENS);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });
  });

  describe("pricing", () => {
    it("charges a split pair of identical lenses exactly what the unsplit pair costs", () => {
      const plain = mountRxOrder().fillValidOrder();
      const plainTotal = plain.field("#qTotal")?.textContent;
      plain.destroy();

      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs(OD_LENS);

      expect(h.field("#qTotal")?.textContent).toBe(plainTotal);

      h.destroy();
    });

    it("quotes each eye on its own line", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs(OS_LENS);

      const quote = h.quoteText();
      expect(quote).toContain("OD");
      expect(quote).toContain("OS");
      // Each side is half of its own pair price; both sides are priced at
      // 278.25 a pair by the harness, so each line reads 139.13-ish.
      expect(quote).toContain("139.1");

      h.destroy();
    });

    it("blocks the cart when only the left eye is unpriced", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs({ m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.amber });

      expect(h.quoteText()).toContain("on request");
      expect(h.assistFlags()).toEqual(["Lens not priced on this account — quote requested"]);
      expect(h.checklist().every((c) => c.ok)).toBe(true);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });
  });

  describe("payload", () => {
    it("carries both lenses and round-trips them back into the form", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      h.selectLensOs(OS_LENS);

      const payload = h.engine.getPayload();
      expect(payload.split).toBe(true);
      expect(payload.lens.material).toBe(MATERIALS.plastic);
      expect(payload.lensOs.material).toBe(MATERIALS.hi167);

      h.engine.clearAll();
      expect(h.state.m2).toBe("");

      h.engine.restorePayload(payload);
      expect(h.state.split).toBe(true);
      expect(h.state.m).toBe(MATERIALS.plastic);
      expect(h.state.m2).toBe(MATERIALS.hi167);

      h.destroy();
    });

    it("leaves an unsplit order's payload shaped exactly as before", () => {
      const h = mountRxOrder().fillValidOrder();

      const payload = h.engine.getPayload();
      expect(payload.split).toBe(false);
      expect(payload.lensOs).toBeNull();
      expect(payload.lens.material).toBe(MATERIALS.plastic);

      h.destroy();
    });

    it("reads an older payload that predates the split as unsplit", () => {
      const h = mountRxOrder().fillValidOrder();
      const payload = h.engine.getPayload();
      delete payload.split;
      delete payload.lensOs;

      h.engine.restorePayload(payload);

      expect(h.state.split).toBe(false);
      expect(h.state.m2).toBe("");
      expect(h.state.m).toBe(MATERIALS.plastic);

      h.destroy();
    });
  });
});
