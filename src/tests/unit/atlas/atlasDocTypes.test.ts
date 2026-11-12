import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATLAS_DOC_TYPES, getAtlasSpace, pageInSpace } from "@/features/atlas/spaces";
import { makePage } from "./fixtures";

const sops = getAtlasSpace("sops")!;
const wiki = getAtlasSpace("wiki")!;
const withType = (docType: string) => makePage({ props: { ...makePage().props, docType } });

describe("atlas doc types", () => {
  it("offers Doc, Wiki and SOP on wiki docs", () => {
    expect(ATLAS_DOC_TYPES.map((type) => type.value)).toEqual(["doc", "wiki", "sop"]);
    expect(wiki.properties.find((property) => property.key === "docType")?.options?.map((option) => option.value)).toEqual(["doc", "wiki", "sop"]);
  });

  it("lists only SOPs in the SOPs space once docs carry a type", () => {
    expect(pageInSpace(sops, withType("sop"))).toBe(true);
    expect(pageInSpace(sops, withType("wiki"))).toBe(false);
    expect(pageInSpace(sops, withType("doc"))).toBe(false);
  });

  it("keeps the old SOPs view while storage has no type yet", () => {
    expect(pageInSpace(sops, makePage())).toBe(true);
  });

  it("keeps every doc type in the wiki space", () => {
    for (const type of ["doc", "wiki", "sop"]) expect(pageInSpace(wiki, withType(type))).toBe(true);
  });

  it("adds a nullable, checked column with no policy change", () => {
    const sql = readFileSync("supabase/migrations/20261111200000_atlas_doc_type.sql", "utf8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS doc_type text;/);
    expect(sql).toMatch(/doc_type IN \('doc', 'wiki', 'sop'\)/);
    expect(sql).not.toMatch(/(CREATE|DROP|ALTER) POLICY/i);
  });
});
