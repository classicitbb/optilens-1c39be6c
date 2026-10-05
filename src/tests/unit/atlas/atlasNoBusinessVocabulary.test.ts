import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src/features/atlas");
const BANNED = /classic\s*visions|optic|\blens(es)?\b|\brx\b|coating|prescription|chemistrie|innovations|barbados/i;

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(ts|tsx|css|md|json|webmanifest)$/.test(entry.name) ? [full] : [];
  });

describe("atlas survives a business pivot", () => {
  it("has no business vocabulary in src/features/atlas", () => {
    const offenders = walk(ROOT).flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((line, index) => ({ file: path.relative(process.cwd(), file), line: index + 1, text: line }))
        .filter(({ text }) => BANNED.test(text)),
    );
    expect(offenders).toEqual([]);
  });

  it("has no business vocabulary in the install manifest or its icons' names", () => {
    const manifest = path.resolve(process.cwd(), "public/atlas.webmanifest");
    if (fs.existsSync(manifest)) expect(fs.readFileSync(manifest, "utf8")).not.toMatch(BANNED);
  });

  it("keeps storage behind the source adapter: only source/ imports the database client", () => {
    const offenders = walk(ROOT)
      .filter((file) => !file.includes(`${path.sep}source${path.sep}`))
      .filter((file) => /@\/integrations\/supabase|from\("help_articles"\)/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });
});
