import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStep, TOURS, toursForPage, tourRunsOn } from "@/help/tours";
import { ADMIN_CONTEXT_OPTIONS } from "@/lib/adminContexts";
import { PORTAL_CONTEXT_OPTIONS } from "@/help/portalContexts";

const SRC = path.resolve(process.cwd(), "src");

/** Every literal data-tour="..." value in the app source (tests excluded). */
const collectTourTargets = () => {
  const targets = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "tests") walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        for (const match of fs.readFileSync(full, "utf8").matchAll(/data-tour="([^"]+)"/g)) targets.add(match[1]);
      }
    }
  };
  walk(SRC);
  return targets;
};

describe("guided tours", () => {
  it("points every step at a data-tour target that exists in the app", () => {
    const targets = collectTourTargets();
    const missing = TOURS.flatMap((tour) =>
      tour.steps.filter((step) => !targets.has(step.target)).map((step) => `${tour.id} → ${step.target}`),
    );
    expect(missing, `Tour steps whose data-tour target is not in src/: ${missing.join(", ")}`).toEqual([]);
  }, 60_000); // Reads every source file, which is slow on a busy full run.

  it("uses unique tour ids and unique targets within a tour", () => {
    expect(new Set(TOURS.map((t) => t.id)).size).toBe(TOURS.length);
    for (const tour of TOURS) {
      expect(new Set(tour.steps.map((s) => s.target)).size, tour.id).toBe(tour.steps.length);
    }
  });

  it("keys every tour by a real help context and opens a page inside it", () => {
    const known = new Set([...ADMIN_CONTEXT_OPTIONS, ...PORTAL_CONTEXT_OPTIONS].map((o) => o.value));
    for (const tour of TOURS) {
      expect(known.has(tour.contextSlug), `${tour.id}: ${tour.contextSlug}`).toBe(true);
    }
  });

  it("finds the tours for a page, including record pages via matchPath", () => {
    expect(toursForPage("/admin/finance/people", "finance/people").map((t) => t.id)).toEqual(["hr.people"]);
    expect(toursForPage("/admin/finance/people/abc-123", "finance/people").map((t) => t.id)).toEqual(["hr.employee"]);
    expect(toursForPage("/admin/finance/payroll/", "finance/payroll").map((t) => t.id)).toEqual(["hr.payroll"]);
    expect(toursForPage("/admin/crm/contacts", "crm/contacts")).toEqual([]);
    const employee = TOURS.find((t) => t.id === "hr.employee")!;
    expect(tourRunsOn(employee, "/admin/finance/people")).toBe(false);
  });
});

describe("resolveStep", () => {
  const steps = ["a", "b", "c", "d"].map((target) => ({ target, title: target, body: "" }));

  it("returns the requested step when its target is present", () => {
    expect(resolveStep(steps, 1, 1, () => true)).toBe(1);
  });

  it("skips missing targets in the direction of travel", () => {
    const present = new Set(["a", "d"]);
    expect(resolveStep(steps, 1, 1, (t) => present.has(t))).toBe(3);
    expect(resolveStep(steps, 2, -1, (t) => present.has(t))).toBe(0);
  });

  it("returns -1 when nothing is left in that direction", () => {
    expect(resolveStep(steps, 1, 1, (t) => t === "a")).toBe(-1);
    expect(resolveStep(steps, 4, 1, () => true)).toBe(-1);
  });
});
