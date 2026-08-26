import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Doc Studio file manager", () => {
  it("loads the icon font required by native-mounted Studio controls", () => {
    expect(read("src/features/admin/doc-studio/DocStudioEmbed.tsx")).toContain("MATERIAL_SYMBOLS_CSS");
  });

  it("supports durable file-content search, without retaining the duplicate file-manager header", () => {
    const template = read("public/ds/studio.html");
    const logic = read("public/ds/studio-logic.js");
    const api = read("supabase/functions/docstudio-api/index.ts");

    expect(template).toContain('placeholder="Search saved files and content"');
    expect(template).toContain('value="{{ showPreviewHeader }}"');
    expect(logic).toContain("fileSearch: ''");
    expect(logic).toContain("item.searchText");
    expect(api).toContain("function fileSearchText");
  });

  it("keeps distinct template, Save As, Save, and blank-compose workflows", () => {
    const template = read("public/ds/studio.html");
    const logic = read("public/ds/studio-logic.js");

    expect(template).toContain("+ Save current");
    expect(template).toContain('title="Start a blank email"');
    expect(logic).toContain("composeNewEmail = () =>");
    expect(logic).toContain("scheduleFileAutosave = () =>");
    expect(logic).toContain("/autosave");
  });
});
