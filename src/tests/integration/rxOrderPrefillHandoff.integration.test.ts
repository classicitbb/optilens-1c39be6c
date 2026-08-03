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
  const engine = createRxOrderEngine(host, { orderNo: () => "Q-1001", ...adapter });
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

  it("keeps the quote's own order number instead of stamping a rebuild", () => {
    const { engine } = mount({ prefill: buildRxPrefillPayload(draft()) });

    expect(engine.state.orderNo).toBe("Q-1001");
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
    expect(section?.querySelector(".section-summary")?.textContent).toBe("Marcus Grant");
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

  it("keeps the admin toolbar settings menu open after clicking its proxy gear", () => {
    const { host, engine } = mount();

    host.querySelector<HTMLButtonElement>('[data-step-action="settings"]')?.click();

    expect(host.querySelector("#gearMenu")?.classList.contains("on")).toBe(true);
    expect(host.querySelector("#gearBtn")?.getAttribute("aria-expanded")).toBe("true");

    engine.destroy();
  });
});
