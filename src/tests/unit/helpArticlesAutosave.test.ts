import { describe, expect, it } from "vitest";
import { buildAutosaveUpdate, uniqueSlug } from "@/hooks/useHelpArticles";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";

const doc: BlogCanonicalContent = { blocks: [{ type: "paragraph", children: [{ type: "text", text: "Body" }] }] };
const NOW = "2026-10-05T12:00:00.000Z";

describe("buildAutosaveUpdate", () => {
  it("writes a published page's body to the draft copy only", () => {
    const update = buildAutosaveUpdate({ id: "a", title: "New title", doc, asDraft: true, supportsDrafts: true, now: NOW });
    expect(update).toEqual({ draft_title: "New title", draft_body_json: doc, draft_saved_at: NOW });
    for (const live of ["title", "body_json", "content", "body_html", "status", "version_number", "published_at"]) {
      expect(update).not.toHaveProperty(live);
    }
  });

  it("writes a page that is not published to the live columns and clears a stale draft copy", () => {
    const update = buildAutosaveUpdate({ id: "a", title: "T", doc, supportsDrafts: true });
    expect(update).toMatchObject({ title: "T", body_json: doc, draft_title: null, draft_body_json: null, draft_saved_at: null });
    expect(String(update.content)).toContain("<p>Body</p>");
    expect(update.body_html).toBe(update.content);
    expect(update).not.toHaveProperty("status");
    expect(update).not.toHaveProperty("version_number");
  });

  it("does not mention draft columns when the project does not have them", () => {
    const update = buildAutosaveUpdate({ id: "a", title: "T", doc, supportsDrafts: false });
    expect(Object.keys(update).some((key) => key.startsWith("draft_"))).toBe(false);
  });

  it("applies settings to the live row without touching the body", () => {
    const update = buildAutosaveUpdate({ id: "a", meta: { summary: "s", section_id: "sec", parent_id: null, sort_order: 3 } });
    expect(update).toEqual({ summary: "s", section_id: "sec", parent_id: null, sort_order: 3 });
  });

  it("combines settings with a draft body write", () => {
    const update = buildAutosaveUpdate({ id: "a", title: "T", doc, asDraft: true, supportsDrafts: true, meta: { sort_order: 1 }, now: NOW });
    expect(update).toEqual({ sort_order: 1, draft_title: "T", draft_body_json: doc, draft_saved_at: NOW });
  });
});

describe("uniqueSlug", () => {
  it("keeps a free slug, and numbers a taken one", () => {
    expect(uniqueSlug("returns", ["other", null])).toBe("returns");
    expect(uniqueSlug("returns", ["returns", "returns-2"])).toBe("returns-3");
    expect(uniqueSlug("", [])).toBe("untitled");
  });
});
