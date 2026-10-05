import { describe, expect, it } from "vitest";
import { buildSpaceExport, zipFiles } from "@/features/atlas/exportSpace";
import { makePage } from "./fixtures";

const sections = [{ id: "s1", slug: "resources", title: "Resources", sortOrder: 0 }];
const parent = makePage({ id: "p1", title: "Checklist", slug: "checklist", sectionId: "s1" });
const child = makePage({ id: "p2", title: "Tips & tricks", slug: "tips", parentId: "p1", sectionId: "s1", status: "draft" });

describe("export space", () => {
  const files = buildSpaceExport("Wiki", [parent, child], sections);

  it("writes a manifest with slugs, statuses and hierarchy", () => {
    const manifest = JSON.parse(files[0].content);
    expect(files[0].path).toBe("manifest.json");
    expect(manifest.format).toBe("atlas-export/1");
    expect(manifest.pages.map((page: { slug: string; parentId: string | null; status: string }) => [page.slug, page.parentId, page.status])).toEqual([
      ["checklist", null, "published"],
      ["tips", "p1", "draft"],
    ]);
  });

  it("lays pages out by section and parent, as Markdown and canonical JSON", () => {
    const paths = files.map((file) => file.path);
    expect(paths).toContain("pages/resources/checklist.md");
    expect(paths).toContain("pages/resources/checklist/tips.md");
    expect(paths).toContain("pages/resources/checklist/tips.json");
    expect(files.find((file) => file.path.endsWith("tips.md"))?.content.startsWith("# Tips & tricks")).toBe(true);
    expect(JSON.parse(files.find((file) => file.path.endsWith("checklist.json"))!.content).doc.blocks[0].type).toBe("paragraph");
  });

  it("exports the unpublished draft copy when there is one", () => {
    const edited = makePage({ id: "p3", title: "Live", slug: "live", draftTitle: "Edited", draftDoc: { blocks: [{ type: "paragraph", children: [{ type: "text", text: "Draft body" }] }] } });
    const out = buildSpaceExport("Wiki", [edited], []);
    expect(out.find((file) => file.path.endsWith("live.md"))?.content).toContain("Draft body");
    expect(out.find((file) => file.path.endsWith("live.md"))?.content.startsWith("# Edited")).toBe(true);
  });

  it("zips every file with correct signatures, sizes and checksums", () => {
    const zip = zipFiles([{ path: "a.txt", content: "hello" }, { path: "dir/b.txt", content: "wörld" }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(2);
    // CRC-32 of "hello" is 0x3610a686.
    expect(view.getUint32(14, true)).toBe(0x3610a686);
    expect(new TextDecoder().decode(zip.slice(30 + 5, 30 + 5 + 5))).toBe("hello");
  });
});
