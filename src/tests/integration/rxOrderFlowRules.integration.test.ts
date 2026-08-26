// Flow rules that came out of dispensing the form for real.
//
// Each of these is a case where the form let someone record something it had no
// business accepting, or made them correct the same wrong default every time:
//
//   · the traced shape could be confirmed before the frame box was measured,
//     even though ED is derived from A and B — confirming it verified the
//     outline against numbers that did not exist yet
//   · the coatings section folded shut the instant a coating was picked, so
//     mid-selection and finished looked identical
//   · an anti-reflective job was quoted the uncoated 5–7 day turnaround, which
//     it cannot make (AR is applied off-site)
//   · overseas accounts defaulted to the weekly courier run, which is the
//     Barbados road round and cannot serve them
import { beforeEach, describe, expect, it } from "vitest";
import { RX_TEST_DATA, TREATMENTS, mountRxOrder } from "@/tests/support/rxOrderHarness";

const accountsIn = (country: string | null) => ({
  ...RX_TEST_DATA,
  branches: RX_TEST_DATA.branches.map((b) => ({ ...b, country })),
});

const serviceOptions = (h: ReturnType<typeof mountRxOrder>) =>
  Array.from(h.host.querySelectorAll<HTMLOptionElement>("#service option")).map((o) => o.textContent);

describe("Rx order flow rules", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  describe("shape confirmation needs the frame box", () => {
    // A standard shape is the cheapest way to get the preview panel rendered.
    const withShape = (frame: Record<string, string> = {}) => {
      const h = mountRxOrder().fillValidOrder({ frame: { a: "", b: "", dbl: "", ...frame } });
      const pick = h.host.querySelector<HTMLElement>("#shapePick [data-sid]");
      expect(pick, "standard shape picker rendered no options").toBeTruthy();
      pick!.click();
      expect(h.state.shape, "clicking a standard shape set no outline").toBeTruthy();
      const btn = h.field<HTMLButtonElement>("#shapeConfirm");
      expect(btn, "shape preview rendered no confirm control").toBeTruthy();
      return { h, btn: btn! };
    };

    it("locks the confirm until A, B, ED and DBL are all present", () => {
      const { h, btn } = withShape({ a: "52" });

      expect(btn.disabled).toBe(true);
      expect(h.host.querySelector("#sec-frame .pv-note")?.textContent).toContain("before confirming");

      h.destroy();
    });

    it("refuses to record a confirmation while the box is incomplete", () => {
      const { h, btn } = withShape({ a: "52" });

      btn.click();

      expect(h.state.shapeOk).toBe(false);

      h.destroy();
    });

    it("unlocks once every measurement is in, and then records the confirmation", () => {
      const { h } = withShape({ a: "52", b: "38", dbl: "18" });

      const btn = h.field<HTMLButtonElement>("#shapeConfirm")!;
      expect(btn.disabled).toBe(false);

      btn.click();
      expect(h.state.shapeOk).toBe(true);

      h.destroy();
    });

    it("withdraws an existing confirmation if a measurement is cleared afterwards", () => {
      const { h } = withShape({ a: "52", b: "38", dbl: "18" });
      h.field<HTMLButtonElement>("#shapeConfirm")!.click();
      expect(h.state.shapeOk).toBe(true);

      // What was verified was the outline at that box. Remove part of the box
      // and the verification no longer refers to anything.
      h.set("#fb", "");

      expect(h.state.shapeOk).toBe(false);
      expect(h.checklist().find((c) => c.label === "Job type & frame measurements")?.ok).toBe(false);

      h.destroy();
    });
  });

  describe("coatings are confirmed before the section folds", () => {
    it("keeps the section open while a coating is selected but unconfirmed", () => {
      const h = mountRxOrder().fillValidOrder();
      h.toggleTreatment(TREATMENTS.superAr);

      expect(h.state.treatConfirmed).toBe(false);
      expect(h.field("#sec-treat")?.classList.contains("section-collapsed")).toBe(false);

      h.destroy();
    });

    it("folds once the dispenser says the selection is finished", () => {
      const h = mountRxOrder().fillValidOrder();
      h.toggleTreatment(TREATMENTS.superAr);
      h.field<HTMLButtonElement>("#treatConfirm")?.click();

      expect(h.state.treatConfirmed).toBe(true);
      expect(h.field("#sec-treat")?.classList.contains("section-collapsed")).toBe(true);

      h.destroy();
    });

    it("treats no coatings at all as a real answer that still needs confirming", () => {
      const h = mountRxOrder().fillValidOrder();

      expect(h.field("#treatConfirmLabel")?.textContent).toContain("no coatings needed");
      expect(h.field("#sec-treat")?.classList.contains("section-collapsed")).toBe(false);

      h.field<HTMLButtonElement>("#treatConfirm")?.click();
      expect(h.field("#sec-treat")?.classList.contains("section-collapsed")).toBe(true);

      h.destroy();
    });

    it("retracts the confirmation when the selection changes afterwards", () => {
      const h = mountRxOrder().fillValidOrder();
      h.toggleTreatment(TREATMENTS.superAr);
      h.field<HTMLButtonElement>("#treatConfirm")?.click();
      expect(h.state.treatConfirmed).toBe(true);

      h.toggleTreatment(TREATMENTS.hardCoat);

      expect(h.state.treatConfirmed).toBe(false);
      expect(h.field("#sec-treat")?.classList.contains("section-collapsed")).toBe(false);

      h.destroy();
    });
  });

  describe("anti-reflective turnaround", () => {
    it("quotes the plain lead time with no AR on the job", () => {
      const h = mountRxOrder().fillValidOrder();

      expect(serviceOptions(h)[0]).toBe("Standard — 5–7 working days");

      h.destroy();
    });

    it("extends the standard lead time once an AR coating is added", () => {
      const h = mountRxOrder().fillValidOrder();
      h.toggleTreatment(TREATMENTS.superAr);

      expect(serviceOptions(h)[0]).toBe("Standard — 9–14 working days");

      h.destroy();
    });

    it("does not extend it for a non-AR coating", () => {
      const h = mountRxOrder().fillValidOrder();
      h.toggleTreatment(TREATMENTS.hardCoat);

      expect(serviceOptions(h)[0]).toBe("Standard — 5–7 working days");

      h.destroy();
    });

    it("reverts when the AR coating is removed again", () => {
      const h = mountRxOrder().fillValidOrder();
      h.toggleTreatment(TREATMENTS.superAr);
      expect(serviceOptions(h)[0]).toBe("Standard — 9–14 working days");

      h.toggleTreatment(TREATMENTS.superAr);

      expect(serviceOptions(h)[0]).toBe("Standard — 5–7 working days");

      h.destroy();
    });
  });

  describe("delivery default follows the account's country", () => {
    it("keeps the courier run for a Barbados account", () => {
      const h = mountRxOrder({ data: accountsIn("BB") }).fillValidOrder();

      expect(h.field<HTMLSelectElement>("#delivery")?.value).toBe("Weekly courier run");
      expect(h.field("#deliveryHint")?.classList.contains("hide")).toBe(true);

      h.destroy();
    });

    it("defaults an overseas account to export", () => {
      const h = mountRxOrder({ data: accountsIn("TT") }).fillValidOrder();

      expect(h.field<HTMLSelectElement>("#delivery")?.value).toBe("Export — freight forwarder");
      expect(h.field("#deliveryHint")?.classList.contains("hide")).toBe(false);
      expect(h.field("#deliveryHint")?.textContent).toContain("outside Barbados");

      h.destroy();
    });

    it("leaves the courier run alone when the account has no country recorded", () => {
      const h = mountRxOrder({ data: accountsIn(null) }).fillValidOrder();

      expect(h.field<HTMLSelectElement>("#delivery")?.value).toBe("Weekly courier run");

      h.destroy();
    });

    it("never overrides a delivery the dispenser picked themselves", () => {
      const h = mountRxOrder({ data: accountsIn("TT") }).fillValidOrder();
      h.set("#delivery", "Collect from lab");

      // Re-selecting the account must not stamp the export default back over it.
      h.engine.refreshData();

      expect(h.field<HTMLSelectElement>("#delivery")?.value).toBe("Collect from lab");

      h.destroy();
    });
  });

  describe("delivery section copy", () => {
    it("asks for a review rather than announcing there is nothing to add", () => {
      const h = mountRxOrder();

      const label = h.field("#notesConfirmed")?.closest("label")?.textContent?.trim();
      expect(label).toBe("Form complete, review before sending");

      h.destroy();
    });
  });

  describe("reopening a filled combo", () => {
    // The list is a type-to-search box whose value doubles as its own query.
    // Reopening a combo that already held a choice therefore filtered the pool
    // by that choice's own name, so the list came back holding exactly one
    // item — the thing already picked — and every alternative looked
    // unavailable. Changing your mind meant clearing the field by hand.
    // An open list is portaled onto document.body (see comboPortalRoot), so it
    // is no longer a descendant of the host and has to be found from document.
    const optionsIn = (_h: ReturnType<typeof mountRxOrder>, listId: string) =>
      Array.from(document.querySelectorAll(`#${listId} .cbopt`)).map((o) => o.textContent?.trim());

    it("offers the whole pool again, not just the current choice", () => {
      const h = mountRxOrder().fillValidOrder();
      const input = h.field<HTMLInputElement>("#material")!;
      expect(input.value).toBe("Plastic 1.50");

      input.focus();
      input.click();

      expect(optionsIn(h, "materialList")).toEqual(["Plastic 1.50", "Polycarbonate", "Hi-Index 1.67"]);

      h.destroy();
    });

    it("still narrows once the user actually types", () => {
      const h = mountRxOrder().fillValidOrder();
      const input = h.field<HTMLInputElement>("#material")!;
      input.focus();
      input.click();
      input.value = "hi";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      expect(optionsIn(h, "materialList")).toEqual(["Hi-Index 1.67"]);

      h.destroy();
    });

    it("applies to the left eye's own combos too", () => {
      const h = mountRxOrder().fillValidOrder();
      h.setSplit(true);
      const input = h.field<HTMLInputElement>("#material2")!;
      expect(input.value).toBe("Plastic 1.50");

      input.focus();
      input.click();

      expect(optionsIn(h, "materialList2")).toEqual(["Plastic 1.50", "Polycarbonate", "Hi-Index 1.67"]);

      h.destroy();
    });
  });

  describe("split-eye toggle placement", () => {
    it("sits with the eye selector it qualifies, not down in the lens lists", () => {
      const h = mountRxOrder().fillValidOrder();

      const split = h.field("#splitRow");
      const eyeSeg = h.field("#eyeSeg");
      const combos = h.field("#lensSplitA");
      expect(split && eyeSeg && combos).toBeTruthy();
      // Same card body as the eye segment, and ahead of the combo columns.
      expect(eyeSeg?.closest(".card-b")).toBe(split?.closest(".card-b"));
      expect(split?.compareDocumentPosition(combos!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      h.destroy();
    });
  });
});
