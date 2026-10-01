// domain/chemistrie.ts against the engine's own Chemistrie configurator: the same
// clips drive both, and the lab notes block, the completeness gate, the defaults
// for a new clip, the type switch and the restore tidy-up must agree exactly.
import { beforeEach, describe, expect, it } from "vitest";
import { mountRxOrder } from "@/tests/support/rxOrderHarness";
import {
  CHEM_BLUE_POWERS, CHEM_MAX_CLIPS, CHEM_READER_POWERS, clipComplete, clipIssues, clipParts, duplicateClipIds,
  newClip, normaliseSavedClip, notesWithChemistrie, setClipField, setClipType, stripChemNotes, type ChemClip,
} from "@/features/rx-order/domain/chemistrie";

const strip = ({ id, ...rest }: ChemClip) => rest;

const clip = (over: Partial<ChemClip> = {}): ChemClip => ({
  ...newClip([]), id: "x", type: "sun", polarised: true, colour: "Grey", ...over,
});

describe("chemistrie rules", () => {
  it("a sun clip needs exactly one of solid, mirror or gradient", () => {
    expect(clipComplete(clip())).toBe(true);
    expect(clipComplete(clip({ colour: "" }))).toBe(false);
    expect(clipComplete(clip({ colour: "Grey", mirror: "gold" }))).toBe(false);
    expect(clipComplete(clip({ colour: "", gradient: "Rouge" }))).toBe(true);
  });

  it("readers and blue need a power from their own list; drive needs nothing", () => {
    expect(clipComplete(clip({ type: "readers", colour: "", add: "1.50" }))).toBe(true);
    expect(clipComplete(clip({ type: "readers", colour: "", add: "0.00" }))).toBe(false); // plano is a blue-light power, not a reader
    expect(clipComplete(clip({ type: "blue", colour: "", add: "0.00" }))).toBe(true);
    expect(clipComplete(clip({ type: "blue", colour: "", add: "" }))).toBe(false);
    expect(clipComplete(clip({ type: "drive", colour: "" }))).toBe(true);
    expect(CHEM_READER_POWERS[0]).toBe("0.50");
    expect(CHEM_BLUE_POWERS[0]).toBe("0.00");
  });

  it("picking solid, mirror or gradient clears the other two", () => {
    let c = clip({ colour: "" });
    c = setClipField(c, "mirror", "silver");
    c = setClipField(c, "colour", "Brown");
    expect(c).toMatchObject({ colour: "Brown", mirror: "", gradient: "" });
    c = setClipField(c, "gradient", "Amber");
    expect(c).toMatchObject({ colour: "", mirror: "", gradient: "Amber" });
    // clearing one leaves the rest alone
    expect(setClipField(c, "gradient", "")).toMatchObject({ gradient: "" });
  });

  it("changing the layer type restarts the type-specific options", () => {
    const c = setClipType(clip({ colour: "Grey" }), "readers");
    expect(c).toMatchObject({ type: "readers", colour: "", mirror: "", gradient: "", add: "", polarised: false });
    expect(setClipType(c, "sun").polarised).toBe(true);
    expect(setClipType(c, "readers")).toBe(c);
  });

  it("flags identical clips and incomplete ones", () => {
    const a = clip({ id: "a" }), b = clip({ id: "b" });
    expect([...duplicateClipIds([a, b])].sort()).toEqual(["a", "b"]);
    expect(duplicateClipIds([a, clip({ id: "c", colour: "Brown" })]).size).toBe(0);
    expect(clipIssues([a, b])).toEqual(["Two Chemistrie clips are identical — change one or remove it."]);
    expect(clipIssues([clip({ colour: "" })])).toEqual(["Chemistrie clip 1 is not complete."]);
    expect(clipIssues([])).toEqual([]);
  });

  it("a new clip takes a layer type the order does not use yet", () => {
    const first = newClip([]);
    expect(first.type).toBe("sun");
    expect(newClip([first]).type).toBe("blue");
    const all = (["sun", "blue", "readers", "drive"] as const).map((type) => ({ ...newClip([]), type }));
    expect(newClip(all).type).toBe("sun"); // all used: back to the first
    expect(CHEM_MAX_CLIPS).toBe(3);
  });

  it("the notes block is regenerated, never duplicated, and the person's own text is kept", () => {
    const clips = [clip({ id: "1" }), clip({ id: "2", type: "readers", colour: "", add: "1.25" })];
    const once = notesWithChemistrie("Rush please", clips);
    expect(once).toContain("[Chemistrie specifications]");
    expect(once.startsWith("Rush please")).toBe(true);
    const twice = notesWithChemistrie(once, clips);
    expect(twice).toBe(once);
    expect(stripChemNotes(once)).toBe("Rush please");
    expect(notesWithChemistrie("Just notes", [])).toBe("Just notes");
    expect(notesWithChemistrie("", clips).startsWith("[Chemistrie specifications]")).toBe(true);
  });

  it("tidies a saved clip: type-specific fields only, old Black magnet to Silver, power to two decimals", () => {
    expect(normaliseSavedClip({ id: "s", type: "readers", colour: "Grey", add: 1.5, magnet: "Black", polarised: true }))
      .toMatchObject({ type: "readers", colour: "", add: "1.50", magnet: "Silver", polarised: false });
    expect(normaliseSavedClip({ type: "sun", mirror: "none", colour: "Blue" })).toMatchObject({ colour: "Blue", mirror: "", polarised: true });
    expect(normaliseSavedClip(null).type).toBe("sun");
  });
});

describe("chemistrie matches the engine", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("the same clips produce the same lab-notes block and the same completeness verdict", () => {
    const cases: { clips: Partial<ChemClip>[]; complete: boolean }[] = [
      { clips: [{ type: "sun", colour: "Grey", polarised: true }], complete: true },
      { clips: [{ type: "sun", mirror: "gold", polarised: true }, { type: "readers", add: "1.50", polarised: false }], complete: true },
      { clips: [{ type: "blue", add: "0.00", polarised: false, crystal: "emerald", bridge: "Gold", magnet: "Gunmetal" }, { type: "drive", polarised: false }], complete: true },
      { clips: [{ type: "sun", polarised: true }], complete: false },
      { clips: [{ type: "readers", add: "", polarised: false }], complete: false },
      { clips: [{ type: "sun", colour: "Grey", polarised: true }, { type: "sun", colour: "Grey", polarised: true }], complete: false },
    ];
    const mismatches: string[] = [];
    cases.forEach((c, n) => {
      const h = mountRxOrder();
      h.fillValidOrder();
      const clips = c.clips.map((p, i) => ({ ...newClip([]), id: `c${i}`, colour: "", mirror: "", gradient: "", add: "", ...p })) as ChemClip[];
      h.state.chemClips = clips.map((x) => ({ ...x }));
      h.engine.refreshData();
      const engineNotes = h.engine.getPayload().delivery.notes;
      const domainNotes = notesWithChemistrie("", clips);
      if (engineNotes !== domainNotes) mismatches.push(`#${n} NOTES\n  engine: ${JSON.stringify(engineNotes)}\n  domain: ${JSON.stringify(domainNotes)}`);
      const engineOk = h.submitEnabled();
      const domainOk = clipIssues(clips).length === 0;
      if (engineOk !== domainOk || domainOk !== c.complete) mismatches.push(`#${n} COMPLETE engine ${engineOk} domain ${domainOk} expected ${c.complete}`);
      // the engine's own readout of each clip's parts
      clips.forEach((x, i) => {
        const line = `Chemistrie clip ${i + 1} — ${clipParts(x).join(" · ")}`;
        if (!engineNotes.includes(line)) mismatches.push(`#${n} clip ${i + 1} line missing: ${line}`);
      });
      h.destroy();
    });
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  }, 60_000);

  it("switching the layer on, adding a clip and changing its type behave like the engine", () => {
    const h = mountRxOrder();
    h.field<HTMLInputElement>("#chemOn")!.click();
    expect(h.state.chemClips).toHaveLength(1);
    expect(strip(h.state.chemClips[0])).toEqual(strip(newClip([])));

    h.field<HTMLElement>("#chemAddClip")!.click();
    expect(h.state.chemClips).toHaveLength(2);
    expect(h.state.chemClips[1].type).toBe(newClip([h.state.chemClips[0]]).type);

    // a type change restarts that clip's options
    h.state.chemClips[0].colour = "Grey";
    h.engine.refreshData();
    h.field<HTMLElement>(`[data-clip="${h.state.chemClips[0].id}"][data-chem="readers"]`)!.click();
    expect(strip(h.state.chemClips[0])).toEqual(strip(setClipType({ ...newClip([]), colour: "Grey" }, "readers")));
    h.destroy();
  });

  it("restoring a saved order tidies clips exactly as the domain does", () => {
    const saved = [
      { id: "a", type: "readers", colour: "Grey", mirror: "none", gradient: "x", add: 1.5, magnet: "Black", bridge: "Gold", crystal: "emerald", polarised: true },
      { id: "b", type: "sun", colour: "Blue", mirror: "none", add: "", magnet: "", bridge: "", crystal: "" },
    ];
    const h = mountRxOrder();
    h.fillValidOrder();
    const payload = h.engine.getPayload();
    h.engine.restorePayload({ ...payload, chemistrie: saved });
    saved.forEach((raw, i) => {
      const engine = h.state.chemClips[i];
      const domain = normaliseSavedClip(raw);
      // The engine leaves an unset bridge / crystal blank where the domain defaults them
      // (Black / none); both print identically, so compare the printed specification
      // and every other field.
      const { bridge: _b1, crystal: _c1, ...e } = strip(engine);
      const { bridge: _b2, crystal: _c2, ...d } = strip(domain);
      expect(e, `clip ${i}`).toEqual(d);
      expect(clipParts(engine), `clip ${i} printed`).toEqual(clipParts(domain));
    });
    h.destroy();
  });
});
