// Selected coatings are verified against the live catalogue.
//
// The selected set (S.treat) and the catalogue the adapter feeds in can
// disagree, and each way they can disagree used to fail silently:
//
//   · a treatment selected before the catalogue re-scoped (switching account
//     re-scopes to that account's pricelist) was skipped by price() AND by
//     persistPayload's addon lookup — but stayed in payload.treatments, so the
//     lab was told to apply a coating that nothing quoted and nothing recorded.
//   · a treatment with no price on the account resolved to 0 and was quoted as
//     free lab work.
//   · toggleTreat() blocks an incompatible pair at click time, but a restored
//     draft writes S.treat wholesale with no such check.
//
// Each now blocks submit and says what to do about it.
import { beforeEach, describe, expect, it } from "vitest";
import { RX_TEST_DATA, TREATMENTS, mountRxOrder } from "@/tests/support/rxOrderHarness";

const issueText = (h: ReturnType<typeof mountRxOrder>) =>
  Array.from(h.host.querySelectorAll("#treatIssues .callout")).map(
    (c) => c.querySelectorAll("span")[1]?.textContent?.trim() ?? "",
  );

const treatmentsWithout = (id: string) => ({
  ...RX_TEST_DATA,
  treatments: RX_TEST_DATA.treatments.filter((t) => t.id !== id),
});

const treatmentsUnpriced = (id: string) => ({
  ...RX_TEST_DATA,
  treatments: RX_TEST_DATA.treatments.map((t) => (t.id === id ? { ...t, p: 0, unpriced: true } : t)),
});

describe("add-on verification against the catalogue", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("raises nothing for a normal, available coating", () => {
    const h = mountRxOrder().fillValidOrder();
    h.toggleTreatment(TREATMENTS.superAr);

    expect(issueText(h)).toEqual([]);
    expect(h.field("#treatIssues")?.classList.contains("hide")).toBe(true);
    expect(h.submitEnabled()).toBe(true);
    expect(h.quoteText()).toContain("Super AR");

    h.destroy();
  });

  describe("withdrawn from the catalogue", () => {
    it("reports a selected coating the catalogue no longer offers and blocks submit", () => {
      // The account switched and the new pricelist does not carry Super AR,
      // but the order still holds it — exactly what RxOrderEmbed's refreshData
      // produces when the scope query resolves to a different pricelist.
      const h = mountRxOrder({ data: treatmentsWithout(TREATMENTS.superAr) }).fillValidOrder();
      h.state.treat.add(TREATMENTS.superAr);
      h.engine.refreshData();

      expect(issueText(h)).toEqual([
        "A coating on this order is no longer available on this account and cannot be quoted.",
      ]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("names the blocked treatments step in the submit checklist", () => {
      const h = mountRxOrder({ data: treatmentsWithout(TREATMENTS.superAr) }).fillValidOrder();
      h.state.treat.add(TREATMENTS.superAr);
      h.engine.refreshData();

      expect(h.checklist().map((c) => c.label)).toContain("Coatings & treatments");
      expect(h.checklist().find((c) => c.label === "Coatings & treatments")?.ok).toBe(false);

      h.destroy();
    });

    it("clears the block when the coating is removed", () => {
      const h = mountRxOrder({ data: treatmentsWithout(TREATMENTS.superAr) }).fillValidOrder();
      h.state.treat.add(TREATMENTS.superAr);
      h.engine.refreshData();
      expect(h.submitEnabled()).toBe(false);

      h.host.querySelector<HTMLButtonElement>(`#treatIssues [data-drop="${TREATMENTS.superAr}"]`)?.click();

      expect(issueText(h)).toEqual([]);
      expect(h.state.treat.has(TREATMENTS.superAr)).toBe(false);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });
  });

  describe("no price on this account", () => {
    it("refuses to quote a coating that resolves to no charge", () => {
      const h = mountRxOrder({ data: treatmentsUnpriced(TREATMENTS.superAr) }).fillValidOrder();
      h.toggleTreatment(TREATMENTS.superAr);

      expect(issueText(h)).toEqual([
        "Super AR has no price on this account — it cannot be added at no charge.",
      ]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("leaves a properly priced coating alone", () => {
      const h = mountRxOrder({ data: treatmentsUnpriced(TREATMENTS.superAr) }).fillValidOrder();
      h.toggleTreatment(TREATMENTS.hardCoat);

      expect(issueText(h)).toEqual([]);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });
  });

  describe("the browse-all drawer", () => {
    const row = (h: ReturnType<typeof mountRxOrder>, name: string) =>
      Array.from(h.host.querySelectorAll<HTMLElement>("#treatDrawer .trow"))
        .find((r) => new RegExp(name, "i").test(r.textContent ?? ""));

    const chips = (h: ReturnType<typeof mountRxOrder>) =>
      Array.from(h.host.querySelectorAll("#treatChips .tchip")).map((c) => c.textContent?.replace("✕", "").trim());

    it("removes a treatment when its selected row is clicked again", () => {
      // "Already selected" used to be fed through the clash branch, which
      // marked the row .dis and disabled its checkbox — so clicking a selected
      // row did nothing. For any treatment outside the handful in "Popular
      // choices" this drawer is the only place it appears, which left the
      // chip's ✕ outside the drawer as the sole way to take it back off.
      const h = mountRxOrder().fillValidOrder();
      h.field<HTMLButtonElement>("#openTreat")?.click();

      row(h, "Solid Tint")?.click();
      expect(chips(h)).toEqual(["Solid Tint"]);

      row(h, "Solid Tint")?.click();
      expect(chips(h)).toEqual([]);

      h.destroy();
    });

    it("marks a selected row as removable rather than blocked", () => {
      const h = mountRxOrder().fillValidOrder();
      h.field<HTMLButtonElement>("#openTreat")?.click();
      row(h, "Solid Tint")?.click();

      const selected = row(h, "Solid Tint")!;
      expect(selected.classList.contains("sel")).toBe(true);
      expect(selected.classList.contains("dis")).toBe(false);
      expect(selected.querySelector(".tw")?.textContent).toBe("Selected — click to remove");

      h.destroy();
    });

    it("still blocks a genuine clash, with the reason visible before clicking", () => {
      const h = mountRxOrder().fillValidOrder();
      h.field<HTMLButtonElement>("#openTreat")?.click();
      row(h, "Solid Tint")?.click();

      const mirror = row(h, "Silver Mirror")!;
      expect(mirror.classList.contains("dis")).toBe(true);
      expect(mirror.querySelector(".tw")?.textContent).toBe("A mirror finish cannot go over a solid tint");

      mirror.click();
      expect(chips(h)).toEqual(["Solid Tint"]);

      h.destroy();
    });
  });

  describe("incompatible pairs restored from a draft", () => {
    it("catches a clashing pair that never went through the toggle", () => {
      const h = mountRxOrder().fillValidOrder();
      // A restored draft writes the set wholesale — no clash check runs.
      h.state.treat.add(TREATMENTS.tintSolid);
      h.state.treat.add(TREATMENTS.mirror);
      h.engine.refreshData();

      expect(issueText(h)).toEqual([
        "Silver Mirror and Solid Tint cannot go on the same lens — A mirror finish cannot go over a solid tint.",
      ]);
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("still blocks the pair at click time", () => {
      const h = mountRxOrder().fillValidOrder();
      h.toggleTreatment(TREATMENTS.tintSolid);
      h.toggleTreatment(TREATMENTS.mirror);

      // The second click is refused outright, so no issue is ever raised.
      expect(h.state.treat.has(TREATMENTS.mirror)).toBe(false);
      expect(issueText(h)).toEqual([]);
      expect(h.submitEnabled()).toBe(true);

      h.destroy();
    });

    it("reports each clashing pair once, not once per side", () => {
      const h = mountRxOrder().fillValidOrder();
      h.state.treat.add(TREATMENTS.tintSolid);
      h.state.treat.add(TREATMENTS.mirror);
      h.engine.refreshData();

      expect(issueText(h)).toHaveLength(1);

      h.destroy();
    });
  });
});
