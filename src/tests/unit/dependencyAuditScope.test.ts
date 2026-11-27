import { describe, expect, it } from "vitest";
import { deriveDependencyScope } from "../../../scripts/dependency-audit-scope.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

describe("dependency audit scope", () => {
  it.each([
    [{}, "runtime"],
    [{ dev: true }, "dev-only"],
    [{ optional: true }, "optional-runtime"],
    [{ devOptional: true }, "optional-or-dev"],
    [{ devOptional: true, optional: true }, "optional-or-dev"],
  ])("classifies lock metadata %j without asserting deployment", (meta, expected) => {
    expect(deriveDependencyScope(["package"], { package: meta })).toBe(expected);
  });

  it("preserves mixed and unknown installations rather than hiding them", () => {
    expect(deriveDependencyScope(["prod", "dev", "missing"], {
      prod: {}, dev: { dev: true },
    })).toBe("dev-only,runtime,unknown");
    expect(deriveDependencyScope([], {})).toBe("unknown");
  });

  it.each(["high", "critical"])("still blocks %s advisories on optional dependencies", (severity) => {
    const fixture = mkdtempSync(join(tmpdir(), "dependency-audit-"));
    try {
      mkdirSync(join(fixture, "security"));
      writeFileSync(join(fixture, "security/dependency-audit-exceptions.json"), JSON.stringify({ exceptions: [] }));
      writeFileSync(join(fixture, "package-lock.json"), JSON.stringify({ packages: {
        "node_modules/fixture": { devOptional: true },
      } }));
      const fakeNpm = join(fixture, "npm.cjs");
      writeFileSync(fakeNpm, `console.log(JSON.stringify(${JSON.stringify({ vulnerabilities: {
        fixture: { name: "fixture", nodes: ["node_modules/fixture"], via: [
          { source: 1, severity, title: "fixture advisory" },
        ] },
      } })})); process.exit(1);`);
      const result = spawnSync(process.execPath, [resolve("scripts/audit-policy.mjs")], {
        cwd: fixture, encoding: "utf8", env: {
          ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "npm_execpath")),
          npm_execpath: fakeNpm,
        },
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("scope=optional-or-dev");
      expect(result.stderr).toContain("High/Critical vulnerabilities found");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
