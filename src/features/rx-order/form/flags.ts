// Fields a capture or prefill could not read with confidence (`flags` on the
// order). The form highlights them, and a flag goes away when the person edits
// the field or says it looks right — never silently.
import type { RxFlag } from "../domain/schema";

export const FLAG_RING = "border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40 dark:bg-amber-950/20";

export const flagOf = (flags: readonly RxFlag[], path: string) => flags.find((f) => f.path === path);

/** Props for an input at `path`: a hook for "go to field" and the reason on hover. */
export const flagAttrs = (flags: readonly RxFlag[], path: string) => {
  const f = flagOf(flags, path);
  return f
    ? { "data-flag-path": path, title: f.reason, "aria-invalid": true as const }
    : { "data-flag-path": path };
};

const EYE = { od: "Right", os: "Left" } as const;
const FIELD: Record<string, string> = {
  sph: "sphere", cyl: "cylinder", axis: "axis", add: "add", pd: "distance PD", npd: "near PD", ht: "height", prism: "prism", base: "prism base",
  first: "first name", last: "last name", name: "name", mount: "mount", a: "A", b: "B", ed: "ED", dbl: "DBL",
  m: "material", d: "design", c: "colour",
};

/** "rx.od.sph" → "Right sphere" */
export function flagLabel(path: string): string {
  const p = path.split(".");
  if (p[0] === "rx" && p.length === 3) return `${EYE[p[1] as "od" | "os"] ?? p[1]} ${FIELD[p[2]] ?? p[2]}`;
  if (p[0] === "lens" && p.length === 3) return `${EYE[p[1] as "od" | "os"] ?? p[1]} lens ${FIELD[p[2]] ?? p[2]}`;
  if (p[0] === "patient") return `Patient ${FIELD[p[1]] ?? p[1]}`;
  if (p[0] === "frame") return `Frame ${FIELD[p[1]] ?? p[1]}`;
  if (p[0] === "reference") return "Reference";
  return path;
}
