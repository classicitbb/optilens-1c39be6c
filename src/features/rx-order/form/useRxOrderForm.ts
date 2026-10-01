// Form state and actions for the React Rx form. State lives in react-hook-form;
// everything computed from it comes from the pure model (derive), and every rule
// that changes values — narrowing the lens catalogue, normalising a typed
// prescription, replacing a coating — is a domain function, so this hook is only
// the wiring. UI components never compute; they read `derived` and call actions.
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { repairTriple, type Triple } from "../domain/catalog";
import { normaliseRxField, transposePlusCyl, type RxField } from "../domain/normalise";
import { parseNum, roundQuarter, signed } from "../domain/parse";
import { activeEyesOf, defaultDelivery, derive, estimateED, toggleTreatment, type Derived, type SectionId } from "./model";
import {
  defaultValues, emptyEye, emptyTriple, type PlusCylText, type RxCatalog, type RxEyeText, type RxFormValues,
} from "./types";

type Eye = "od" | "os";

export interface RxFormApi {
  values: RxFormValues;
  derived: Derived;
  /** Raw react-hook-form handle for `register` on simple text inputs. */
  form: ReturnType<typeof useForm<RxFormValues>>;
  set: <P extends string>(path: P, value: unknown) => void;
  setJob: (key: keyof RxFormValues["job"], value: string) => string | null;
  setFrame: (key: "name" | "mount" | "source" | "a" | "b" | "ed" | "dbl", value: string) => void;
  pickLens: (side: "od" | "os", axis: keyof Triple, id: string) => string | null;
  setSplit: (on: boolean) => void;
  copyLensToOs: () => void;
  setRxText: (eye: Eye, field: keyof RxEyeText, value: string) => void;
  /** Normalise a prescription field when the person leaves it; returns a note to show, if any. */
  blurRx: (eye: Eye, field: keyof RxEyeText) => string | null;
  copyOdToOs: () => void;
  clearRx: () => void;
  setPlusText: (eye: Eye, field: keyof PlusCylText, value: string) => void;
  blurPlus: (eye: Eye, field: keyof PlusCylText) => void;
  togglePlusCyl: (on: boolean) => void;
  toggleCoating: (id: string) => string | null;
  removeCoating: (id: string) => void;
  setTint: (patch: Partial<RxFormValues["tint"]>) => void;
  setDelivery: (patch: Partial<RxFormValues["delivery"]>) => void;
  dismissWarning: (id: string) => void;
  removeAssistance: (text: string) => void;
  clearSection: (id: SectionId) => void;
  reset: (v?: RxFormValues) => void;
  /** Nothing has been entered: autosave skips it and "save draft" has nothing to save. */
  isEmpty: boolean;
}

const blank = (s: string) => s.trim() === "";

/** A pristine, never-touched form. */
export function isEmptyOrder(v: RxFormValues): boolean {
  const eyeBlank = (r: RxEyeText) => Object.entries(r).every(([k, x]) => k === "base" || blank(x)) && blank(r.base);
  return blank(v.patient.first) && blank(v.patient.last) && blank(v.reference)
    && blank(v.frame.name) && blank(v.frame.a) && blank(v.frame.b) && blank(v.frame.dbl)
    && !v.lens.od.m && !v.lens.od.d && !v.lens.od.c && !v.lens.os.m && !v.lens.os.d && !v.lens.os.c
    && eyeBlank(v.rx.od) && eyeBlank(v.rx.os)
    && v.treatments.length === 0 && blank(v.delivery.notes);
}

export function useRxOrderForm(args: { catalog: RxCatalog; initialValues?: RxFormValues; accountId: number | null }): RxFormApi {
  const { catalog } = args;
  const form = useForm<RxFormValues>({ defaultValues: args.initialValues ?? defaultValues(args.accountId) });
  const values = form.watch();
  const derived = useMemo(() => derive(values, catalog), [values, catalog]);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const get = useCallback(() => form.getValues(), [form]);

  const set = useCallback((path: string, value: unknown) => {
    form.setValue(path as any, value as any, { shouldDirty: true });
  }, [form]);

  // The account follows the host (staff switch it in the header).
  useEffect(() => {
    if (get().accountId !== args.accountId) set("accountId", args.accountId);
  }, [args.accountId, get, set]);

  // Until the person chooses, delivery follows the account's country.
  useEffect(() => {
    const d = get().delivery;
    if (d.methodTouched) return;
    const wanted = defaultDelivery(catalog.accountCountry);
    if (d.method !== wanted) set("delivery.method", wanted);
  }, [catalog.accountCountry, get, set, values.delivery.methodTouched]);

  /** Make both sides consistent with the catalogue; returns what was cleared. */
  const repairLens = useCallback((vision: "sv" | "mf"): string | null => {
    let note: string | null = null;
    for (const side of ["od", "os"] as const) {
      const t = get().lens[side];
      const r = repairTriple(catalogRef.current, vision, t);
      if (r.cleared) {
        set(`lens.${side}`, r.triple);
        note = r.cleared === "all"
          ? "Cleared the lens — that combination isn't on your pricelist"
          : `Cleared ${r.cleared} — that combination isn't on your pricelist`;
      }
    }
    return note;
  }, [get, set]);

  const setJob: RxFormApi["setJob"] = (key, value) => {
    set(`job.${key}`, value);
    let note: string | null = null;
    if (key === "vision") {
      // A design belongs to one vision type, so switching clears both designs.
      set("lens.od", { ...get().lens.od, d: "" });
      set("lens.os", { ...get().lens.os, d: "" });
      note = repairLens(value as "sv" | "mf");
    }
    if (key === "eyes" && value !== "pair" && get().lens.split) {
      set("lens.split", false);
      set("lens.os", emptyTriple());
    }
    return note;
  };

  const setFrame: RxFormApi["setFrame"] = (key, value) => {
    set(`frame.${key}`, value);
    if (key === "ed") set("frame.edTouched", value.trim() !== "");
    if ((key === "a" || key === "b") && !get().frame.edTouched) {
      const est = estimateED(parseNum(key === "a" ? value : get().frame.a), parseNum(key === "b" ? value : get().frame.b));
      set("frame.ed", est === null ? "" : est.toFixed(1));
    }
  };

  const pickLens: RxFormApi["pickLens"] = (side, axis, id) => {
    const next = { ...get().lens[side], [axis]: id };
    const r = repairTriple(catalogRef.current, get().job.vision, next);
    set(`lens.${side}`, r.triple);
    return r.cleared && r.cleared !== "all" ? `Cleared ${r.cleared} — that combination isn't on your pricelist` : null;
  };

  const setSplit: RxFormApi["setSplit"] = (on) => {
    set("lens.split", on);
    if (!on) set("lens.os", emptyTriple());
    // Turning split ON seeds the left eye from the right, so the common case —
    // the same lens with one property different — is one edit rather than three.
    else if (!get().lens.os.m && !get().lens.os.d && !get().lens.os.c) set("lens.os", { ...get().lens.od });
  };
  const copyLensToOs = () => set("lens.os", { ...get().lens.od });

  const setRxText: RxFormApi["setRxText"] = (eye, field, value) => set(`rx.${eye}.${field}`, value);

  const blurRx: RxFormApi["blurRx"] = (eye, field) => {
    if (field === "base") return null;
    const raw = get().rx[eye][field];
    const out = normaliseRxField(field as RxField, raw);
    if (!out) return null;
    set(`rx.${eye}.${field}`, out.value);
    if (out.splitBoth) {
      // A binocular PD is split between the eyes, and the person is told.
      for (const e of ["od", "os"] as const) set(`rx.${e}.${field}`, out.splitBoth.half);
      return `Binocular ${out.splitBoth.binocular.toFixed(1)} split to ${out.splitBoth.half} / ${out.splitBoth.half}`;
    }
    return null;
  };

  const copyOdToOs = () => set("rx.os", { ...get().rx.od });
  const clearRx = () => {
    set("rx.od", emptyEye());
    set("rx.os", emptyEye());
  };

  const setPlusText: RxFormApi["setPlusText"] = (eye, field, value) => set(`plusCyl.${eye}.${field}`, value);
  const syncPlus = () => {
    if (!get().plusCyl.on) return;
    for (const e of ["od", "os"] as const) {
      const p = get().plusCyl[e];
      const t = transposePlusCyl(parseNum(p.sph, true), parseNum(p.cyl, true), parseNum(p.axis));
      if (t) {
        set(`rx.${e}.sph`, t.sph);
        set(`rx.${e}.cyl`, t.cyl);
        set(`rx.${e}.axis`, t.axis);
      }
    }
  };
  const blurPlus: RxFormApi["blurPlus"] = (eye, field) => {
    const raw = get().plusCyl[eye][field];
    if (blank(raw)) return syncPlus();
    const v = parseNum(raw, field !== "axis");
    if (v === null) { set(`plusCyl.${eye}.${field}`, ""); return syncPlus(); }
    if (field === "sph") set(`plusCyl.${eye}.sph`, signed(roundQuarter(Math.max(-25, Math.min(18, v)))));
    else if (field === "cyl") set(`plusCyl.${eye}.cyl`, signed(Math.abs(roundQuarter(v))));
    else {
      let a = Math.round(v); a = ((a % 180) + 180) % 180; if (a === 0) a = 180;
      set(`plusCyl.${eye}.axis`, String(a));
    }
    syncPlus();
  };
  const togglePlusCyl = (on: boolean) => set("plusCyl.on", on);

  const sideColourNames = (): string[] => {
    const v = get();
    const sides = v.lens.split && v.job.eyes === "pair" ? [v.lens.od, v.lens.os] : [v.lens.od];
    return sides.map((t) => catalogRef.current.colours.find((c) => c.id === t.c)?.n ?? "");
  };
  const toggleCoating: RxFormApi["toggleCoating"] = (id) => {
    const r = toggleTreatment(get().treatments, id, catalogRef.current, sideColourNames());
    if ("blocked" in r) return r.blocked;
    set("treatments", r.treatments);
    return null;
  };
  const removeCoating = (id: string) => set("treatments", get().treatments.filter((x) => x !== id));
  const setTint: RxFormApi["setTint"] = (patch) => set("tint", { ...get().tint, ...patch });
  const setDelivery: RxFormApi["setDelivery"] = (patch) => set("delivery", { ...get().delivery, ...patch });
  const dismissWarning = (id: string) => set("dismissedWarnings", [...new Set([...get().dismissedWarnings, id])]);
  const removeAssistance = (text: string) => set("assistance", get().assistance.filter((a) => a !== text));

  const clearSection: RxFormApi["clearSection"] = (id) => {
    const d = defaultValues(get().accountId);
    switch (id) {
      case "patient": set("patient", d.patient); set("reference", ""); break;
      case "frame": set("frame", d.frame); set("job.scope", "uncut"); break;
      case "lens": set("lens", d.lens); break;
      case "rx": clearRx(); set("plusCyl", d.plusCyl); set("dismissedWarnings", []); break;
      case "treat": set("treatments", []); set("tint", d.tint); break;
      case "notes": set("delivery", { ...d.delivery, method: defaultDelivery(catalogRef.current.accountCountry) }); break;
    }
  };

  const reset = (v?: RxFormValues) => form.reset(v ?? defaultValues(get().accountId));

  return {
    values, derived, form, set, setJob, setFrame, pickLens, setSplit, copyLensToOs, setRxText, blurRx,
    copyOdToOs, clearRx, setPlusText, blurPlus, togglePlusCyl, toggleCoating, removeCoating, setTint,
    setDelivery, dismissWarning, removeAssistance, clearSection, reset,
    isEmpty: isEmptyOrder(values),
  };
}

export { activeEyesOf };
