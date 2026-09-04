// Drives the real prototype engine against the real markup to prove the
// Lens Assistant → Rx form handoff actually lands in the DOM. Guards the
// ADAPTER.prefill seam and the field-name mapping together, which is where
// the two vocabularies (assistant vs engine) can silently drift apart.
import { beforeEach, describe, expect, it } from "vitest";
import markup from "@/features/rx-order/embed/rx-order-markup.html?raw";
import { createRxOrderEngine } from "@/features/rx-order/embed/rx-order-engine.js";
import { buildPrefillBanner, buildRxPrefillPayload } from "@/features/rx-order/prefill/rxOrderPrefill";
import type { LensRecommendationInput, RxOrderDraft } from "@/features/lens-assistant/types";

const draft = (overrides: Partial<LensRecommendationInput> = {}): RxOrderDraft => ({
  id: "draft-1",
  user_id: "user-1",
  status: "ready_for_lablink",
  name: "Rx — TEST-001",
  patient_reference: "TEST-001",
  input_payload: {
    audience: "professional",
    patientReference: "TEST-001",
    ageBand: "40-59",
    occupation: "Office work",
    primaryUse: "computer",
    visualPriority: "Intermediate comfort",
    frameType: "semi-rimless",
    frameA: 54,
    frameB: 38,
    frameDbl: 18,
    priceLevel: "better",
    lightPreference: "clear",
    adaptationIssues: true,
    right: { sphere: -2, cylinder: -0.75, axis: 90, add: 1.5, prism: 1, prismBase: "in" },
    left: { sphere: -1.75, cylinder: -0.5, axis: 85, add: 1.5, prism: null, prismBase: "" },
    ...overrides,
  },
  recommendation_snapshot: null,
  rule_set_id: null,
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-01T10:00:00.000Z",
});

const mount = (adapter: Record<string, unknown> = {}) => {
  const host = document.createElement("div");
  host.className = "cv-rx-embed";
  host.innerHTML = markup;
  document.body.appendChild(host);
  const engine = createRxOrderEngine(host, { orderNo: () => "80019001", ...adapter });
  const field = (selector: string) => host.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  const rxCell = (eye: "od" | "os", f: string) => field(`tr[data-eye="${eye}"] [data-f="${f}"]`);
  return { host, engine, field, rxCell };
};

describe("lens assistant → rx order handoff", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("lands the prescription in the form's own Rx row inputs", () => {
    const { rxCell, engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    expect(rxCell("od", "sph")?.value).toBe("-2");
    expect(rxCell("od", "cyl")?.value).toBe("-0.75");
    expect(rxCell("od", "axis")?.value).toBe("90");
    expect(rxCell("od", "add")?.value).toBe("1.5");
    expect(rxCell("od", "prism")?.value).toBe("1");
    expect(rxCell("od", "base")?.value).toBe("IN");
    expect(rxCell("os", "sph")?.value).toBe("-1.75");

    engine.destroy();
  });

  it("leaves the dispensing measurements empty rather than guessing them", () => {
    const { rxCell, field, engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    expect(rxCell("od", "pd")?.value).toBe("");
    expect(rxCell("od", "ht")?.value).toBe("");
    expect(field("#pfirst")?.value).toBe("");
    expect(field("#ftemple")?.value).toBe("");

    engine.destroy();
  });

  it("carries the frame box, mount and reference", () => {
    const { field, engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    expect(field("#fa")?.value).toBe("54");
    expect(field("#fb")?.value).toBe("38");
    expect(field("#fdbl")?.value).toBe("18");
    expect(field("#mount")?.value).toBe("supra");
    expect(field("#ref")?.value).toBe("TEST-001");

    engine.destroy();
  });

  it("sets the vision segment from the reading addition", () => {
    const { host, engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    expect(host.querySelector('#visionSeg button[data-vision="mf"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(engine.state.vision).toBe("mf");

    engine.destroy();
  });

  it("carries lifestyle answers into the lab notes", () => {
    const { field, engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    const notes = (field("#notes") as unknown as HTMLTextAreaElement).value;
    expect(notes).toContain("Occupation: Office work");
    expect(notes).toContain("adaptation difficulty");

    engine.destroy();
  });

  it("shows the handoff banner and flags the form as prefilled", () => {
    const d = draft();
    const { host, engine } = mount({ prefill: buildRxPrefillPayload(d), prefillBanner: buildPrefillBanner(d) });

    const banner = host.querySelector("#draftBanner");
    expect(banner?.classList.contains("hide")).toBe(false);
    expect(banner?.textContent).toContain("Prefilled from the Lens Assistant");
    // revealAll drives the "required fields still to fill" beacon.
    expect(engine.state.revealAll).toBe(true);
    expect(engine.state.fromDraft).toBe(true);

    engine.destroy();
  });

  it("keeps an incomplete restored prescription open for continued entry", () => {
    const { host, rxCell, engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    // The saved Rx is deliberately incomplete because the assistant does not
    // collect dispensing PDs or fitting heights. Restoring it must leave the
    // editable table open; collapsing partial Rx data strands the customer on
    // the prescription step and makes the draft appear not to have loaded.
    expect(rxCell("od", "sph")?.value).toBe("-2");
    expect(rxCell("od", "pd")?.value).toBe("");
    expect(host.querySelector("#sec-rx")?.classList.contains("section-collapsed")).toBe(false);

    engine.destroy();
  });

  it("keeps the quote's own order number instead of stamping a rebuild", () => {
    const { engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    expect(engine.state.orderNo).toBe("80019001");
    expect(engine.state.rebuiltFrom).toBeNull();

    engine.destroy();
  });

  it("mounts an empty form with no banner when no prefill is supplied", () => {
    const { host, rxCell, engine } = mount();

    expect(rxCell("od", "sph")?.value).toBe("");
    expect(host.querySelector("#draftBanner")?.classList.contains("hide")).toBe(true);
    expect(engine.state.revealAll).toBe(false);

    engine.destroy();
  });

  it("collapses completed patient details into an editable summary", () => {
    const { host, field, engine } = mount();
    const first = field("#pfirst") as HTMLInputElement;
    const last = field("#plast") as HTMLInputElement;

    first.value = "Marcus";
    first.dispatchEvent(new Event("input", { bubbles: true }));
    last.value = "Grant";
    last.dispatchEvent(new Event("input", { bubbles: true }));

    const section = host.querySelector<HTMLElement>("#sec-patient");
    expect(section?.classList.contains("section-collapsed")).toBe(true);
    expect(section?.querySelector(".section-summary")?.textContent).toBe("MARCUS GRANT");
    expect(section?.querySelector<HTMLButtonElement>("[data-edit-section='sec-patient']")).toBeTruthy();

    section?.querySelector<HTMLButtonElement>("[data-edit-section='sec-patient']")?.click();
    expect(section?.classList.contains("section-collapsed")).toBe(false);

    engine.destroy();
  });

  it("does not render the removed inline patient assistance control", () => {
    const { host, engine } = mount();

    expect(host.querySelector("#sec-patient [data-assist='Patient details']")).toBeNull();

    engine.destroy();
  });

  it("keeps admin settings in the page header instead of duplicating them in the sticky toolbar", () => {
    const { host, engine } = mount();

    expect(host.querySelector('[data-step-action="settings"]')).toBeNull();
    host.querySelector<HTMLButtonElement>("#gearBtn")?.click();

    expect(host.querySelector("#gearMenu")?.classList.contains("on")).toBe(true);
    expect(host.querySelector("#gearBtn")?.getAttribute("aria-expanded")).toBe("true");

    engine.destroy();
  });

  it("renders a completed prescription summary as the same labelled value grid used for entry", () => {
    const prefill = buildRxPrefillPayload(draft({
      right: { sphere: 6, cylinder: -3.75, axis: 120, add: 2, prism: 0, prismBase: "" },
      left: { sphere: 7, cylinder: -4.5, axis: 50, add: 2, prism: 0, prismBase: "" },
    }));
    prefill.rx.od.pd = 32;
    prefill.rx.os.pd = 32;
    prefill.rx.od.ht = 22;
    prefill.rx.os.ht = 22;
    prefill.lens.design = "pg-std";

    const { host, engine } = mount({ prefill });
    const summary = host.querySelector("#sec-rx .section-summary");

    expect(host.querySelector("#sec-rx")?.classList.contains("section-collapsed")).toBe(true);
    expect(summary?.querySelector(".rx-summary-grid")).toBeTruthy();
    expect(summary?.querySelectorAll(".rx-summary-head")).toHaveLength(9);
    expect(summary?.textContent?.toUpperCase()).toContain("SPHERE");
    expect(summary?.textContent).toContain("+6.00");
    expect(summary?.textContent).toContain("-3.75");
    expect(summary?.textContent?.toUpperCase()).toContain("FITTING HT");

    engine.destroy();
  });

  it("keeps coatings exclusive and lets the full list take the selection back off", () => {
    const treatments = [
      { id: "back", c: "Anti-reflective", n: "BACK AR (For Polarised)", d: "1 Year Warranty", p: 10, grp: "ar", pop: false },
      { id: "blue", c: "Anti-reflective", n: "BLUE DEFENSE AR+", d: "2 Year Warranty", p: 20, grp: "ar", pop: true },
      { id: "super", c: "Anti-reflective", n: "SUPER AR", d: "Premium coating", p: 30, grp: "ar", pop: true },
    ];
    const { host, engine } = mount({ data: { treatments } });

    host.querySelector<HTMLElement>('#popOpts [data-tid="blue"]')?.click();
    host.querySelector<HTMLElement>('#popOpts [data-tid="super"]')?.click();

    expect(engine.state.treat.has("blue")).toBe(false);
    expect(engine.state.treat.has("super")).toBe(true);
    host.querySelector<HTMLButtonElement>("#openTreat")?.click();
    const selected = host.querySelector<HTMLInputElement>('#treatList [data-tid="super"] input');
    expect(selected?.checked).toBe(true);
    // This assertion used to read `disabled: true`. That fell out of routing
    // "Already selected" through the clash branch, which is what disabled the
    // row — and it made the drawer a dead end: BACK AR here is pop:false, so
    // the drawer is the ONLY place it appears, and a selected treatment could
    // never be taken back off from there. Group exclusivity (blue replaced by
    // super, asserted above) is unaffected and is what this test is really for.
    expect(selected?.disabled).toBe(false);

    host.querySelector<HTMLElement>('#treatList [data-tid="super"]')?.click();
    expect(engine.state.treat.has("super")).toBe(false);

    engine.destroy();
  });

  it("only promotes Back AR after more than five submitted uses", () => {
    localStorage.setItem("cv-rx-history", JSON.stringify(Array.from({ length: 6 }, () => ({
      kind: "submitted", payload: { treatments: ["back"] },
    }))));
    const { host, engine } = mount({ data: { treatments: [
      { id: "back", c: "Anti-reflective", n: "BACK AR (For Polarised)", d: "1 Year Warranty", p: 10, grp: "ar", pop: false },
      { id: "blue", c: "Anti-reflective", n: "BLUE DEFENSE AR+", d: "2 Year Warranty", p: 20, grp: "ar", pop: true },
      { id: "super", c: "Anti-reflective", n: "SUPER AR", d: "Premium coating", p: 30, grp: "ar", pop: true },
    ] } });

    expect(Array.from(host.querySelectorAll("#popOpts .on")).map((node) => node.textContent)).toEqual([
      "BACK AR (For Polarised)", "BLUE DEFENSE AR+", "SUPER AR",
    ]);

    engine.destroy();
  });

  it("uses an accessible search icon in the treatments drawer", () => {
    const { host, engine } = mount();

    expect(host.querySelector("#treatDrawer .searchbox svg")).toBeTruthy();
    expect(host.querySelector("#treatSearch")?.getAttribute("aria-label")).toBe("Search treatments");

    engine.destroy();
  });

  it("keeps Chemistrie open until every clip has one complete solid or mirror choice", () => {
    const { host, engine } = mount();
    const chemOn = host.querySelector<HTMLInputElement>("#chemOn")!;
    chemOn.click();

    const polarised = host.querySelector<HTMLSelectElement>('[data-field="polarised"]');
    const solidOptions = host.querySelectorAll<HTMLButtonElement>('[data-swatch-field="colour"]');
    expect(host.querySelector("#sec-treat")?.classList.contains("section-collapsed")).toBe(false);
    expect(host.querySelector("#chemBlock")?.classList.contains("chem-incomplete")).toBe(true);
    expect(polarised?.value).toBe("yes");
    expect(polarised?.disabled).toBe(true);
    expect(Array.from(solidOptions).map((option) => option.textContent)).toEqual([
      "Select a colour", "Grey", "Brown", "G-15", "Blue", "Copper", "Amber", "Pink", "Purple",
    ]);
    expect(host.querySelectorAll('[data-swatch-field="colour"] .chem-swatch-dot')).toHaveLength(8);

    host.querySelector<HTMLButtonElement>('[data-swatch-field="colour"][data-swatch-value="Grey"]')?.click();
    expect(engine.state.chemClips[0].colour).toBe("Grey");
    expect(engine.state.chemClips[0].mirror).toBe("");

    host.querySelector<HTMLButtonElement>("#chemAddClip")?.click();
    expect(engine.state.chemClips).toHaveLength(2);
    expect(host.querySelector("#sec-treat")?.classList.contains("section-collapsed")).toBe(false);

    engine.destroy();
  });

  it("offers the supplied mirror-polarised colours and excludes a simultaneous solid choice", () => {
    const { host, engine } = mount();
    host.querySelector<HTMLInputElement>("#chemOn")?.click();
    const mirrorOptions = host.querySelectorAll<HTMLButtonElement>('[data-swatch-field="mirror"]');

    expect(Array.from(mirrorOptions).map((option) => option.textContent)).toEqual([
      "Select a mirror finish", "Silver Mirror", "Gold Mirror", "Blue Mirror", "Green Mirror",
      "Rose Gold Mirror", "Red Mirror", "Orange Mirror", "Purple Mirror",
    ]);
    expect(host.querySelectorAll('[data-swatch-field="mirror"] .chem-swatch-dot')).toHaveLength(8);
    host.querySelector<HTMLButtonElement>('[data-swatch-field="mirror"][data-swatch-value="gold"]')?.click();

    expect(engine.state.chemClips[0].mirror).toBe("gold");
    expect(engine.state.chemClips[0].colour).toBe("");
    expect(host.querySelector('[data-chem-field="colour"]')?.classList.contains("disabled")).toBe(true);

    expect(host.querySelectorAll('[data-swatch-field="magnet"] .chem-swatch-dot')).toHaveLength(4);
    expect(Array.from(host.querySelectorAll('[data-swatch-field="bridge"]')).map((node) => node.textContent)).toEqual([
      "Select a bridge colour", "Bronze", "Gunmetal", "Gold", "Silver", "Black",
    ]);
    expect(host.querySelectorAll('[data-swatch-field="bridge"] .chem-swatch-dot')).toHaveLength(5);
    expect(Array.from(host.querySelectorAll('[data-swatch-field="crystal"]')).map((node) => node.textContent)).toEqual([
      "None", "Hematite Crystals", "Hyacinth Crystals", "Crystal Gold Crystals", "Cobalt Crystals",
      "Aquamarine Crystals", "Emerald Crystals", "Olivine Crystals", "Amethyst Crystals", "Fireopal Crystals",
      "Rose Crystals", "Topaz Crystals", "Diamond Crystals",
    ]);
    expect(host.querySelectorAll('[data-swatch-field="crystal"] .chem-swatch-dot')).toHaveLength(12);

    engine.destroy();
  });

  it("summarizes every Chemistrie clip part and adds it to the lab notes once", () => {
    const { host, engine } = mount();
    host.querySelector<HTMLInputElement>("#chemOn")?.click();
    host.querySelector<HTMLButtonElement>('[data-swatch-field="colour"][data-swatch-value="Grey"]')?.click();
    host.querySelector<HTMLButtonElement>("#treatConfirm")?.click();

    const summary = host.querySelector("#sec-treat .section-summary")?.textContent || "";
    expect(summary).toContain("Chemistrie clip 1");
    expect(summary).toContain("Chemistrie Sun");
    expect(summary).toContain("Solid polarised: Grey");
    expect(summary).toContain("Polarised: Yes");
    expect(summary).toContain("Magnet: Black");
    expect(summary).toContain("Bridge: Black");
    expect(summary).toContain("Crystal: None");

    const payload = engine.getPayload();
    expect(payload.delivery.notes).toContain("[Chemistrie specifications]");
    expect(payload.delivery.notes).toContain("Solid polarised: Grey");

    engine.restorePayload(payload);
    expect((engine.getPayload().delivery.notes.match(/\[Chemistrie specifications\]/g) || [])).toHaveLength(1);

    engine.destroy();
  });

  it("does not crash when a high-power Rx suggests treatments absent from the live catalogue", () => {
    const prefill = buildRxPrefillPayload(draft({
      right: { sphere: -8, cylinder: -4, axis: 90, add: 1.5, prism: null, prismBase: "" },
    }));

    expect(() => mount({
      data: {
        treatments: [{ id: "ar-std", c: "Anti-reflective", n: "Standard AR", d: "AR coating", p: 19 }],
      },
      prefill,
    })).not.toThrow();
  });
});
