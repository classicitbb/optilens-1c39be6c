import { describe, expect, it } from "vitest";
import { buildTree } from "@/features/atlas/pageTree";
import { groupByStatus, parseSort, parseStatusFilter, selectRows } from "@/features/atlas/database/databaseModel";
import { publishPages } from "@/features/atlas/database/publishPages";
import { validatePagesForPublish } from "@/features/atlas/publishValidation";
import { getAtlasSpace } from "@/features/atlas/spaces";
import { makePage } from "./fixtures";

describe("atlas page tree", () => {
  it("builds the tree from sections and parent-child relationships", () => {
    const sections = [{ id: "s1", slug: "resources", title: "Resources", sortOrder: 0 }];
    const parent = makePage({ id: "p1", title: "Checklist", slug: "checklist", sectionId: "s1" });
    const child = makePage({ id: "p2", title: "Tips", slug: "tips", parentId: "p1", sectionId: "s1", sortOrder: 1 });
    const tree = buildTree(sections, [parent, child]);

    expect(tree.roots[0].title).toBe("Resources");
    expect(tree.roots[0].children[0].id).toBe("p1");
    expect(tree.nodeBySlug.get("checklist")?.children[0].slug).toBe("tips");
  });

  it("uses the stable ID for legacy rows without backfilling a slug", () => {
    const tree = buildTree([], [makePage({ id: "abcdef1234-xyz", title: "Old Page", slug: null })]);
    expect([...tree.nodeBySlug.keys()]).toEqual(["abcdef1234-xyz"]);
  });

  it("puts pages without a section after the sections", () => {
    const tree = buildTree([{ id: "s1", slug: "a", title: "A", sortOrder: 0 }], [makePage({ id: "loose", sectionId: null })]);
    expect(tree.roots.map((node) => node.id)).toEqual(["heading:s1", "loose"]);
  });
});

describe("database view model", () => {
  const website = getAtlasSpace("website")!;
  const faqView = website.savedViews.find((view) => view.id === "faq");
  const page = (id: string, title: string, status: "draft" | "published" | "archived", contentType: string, updatedAt: string) =>
    makePage({ id, title, status, spaceId: "website", updatedAt, props: { ...makePage().props, contentType } });
  const pages = [
    page("a", "Alpha", "published", "knowledge", "2026-01-03T00:00:00Z"),
    page("b", "Bravo", "draft", "faq", "2026-01-05T00:00:00Z"),
    page("c", "Charlie", "archived", "faq", "2026-01-04T00:00:00Z"),
  ];

  it("hides archived rows by default, filters by saved view and sorts by recency", () => {
    expect(selectRows(pages, { status: "active", q: "", sort: "updated" }).map((row) => row.id)).toEqual(["b", "a"]);
    expect(selectRows(pages, { view: faqView, status: "all", q: "", sort: "updated" }).map((row) => row.id)).toEqual(["b", "c"]);
  });

  it("searches titles and sorts by title or status", () => {
    expect(selectRows(pages, { status: "all", q: "brav", sort: "title" }).map((row) => row.id)).toEqual(["b"]);
    expect(selectRows(pages, { status: "all", q: "", sort: "title" }).map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(selectRows(pages, { status: "all", q: "", sort: "status" }).map((row) => row.id)).toEqual(["b", "a", "c"]);
  });

  it("groups the board by status and ignores the status filter there", () => {
    const groups = groupByStatus(selectRows(pages, { status: "published", q: "", sort: "updated" }, { ignoreStatus: true }));
    expect(groups.draft.map((row) => row.id)).toEqual(["b"]);
    expect(groups.published.map((row) => row.id)).toEqual(["a"]);
    expect(groups.archived.map((row) => row.id)).toEqual(["c"]);
  });

  it("parses URL state defensively", () => {
    expect(parseSort("bogus")).toBe("updated");
    expect(parseSort("title")).toBe("title");
    expect(parseStatusFilter(null)).toBe("active");
    expect(parseStatusFilter("archived")).toBe("archived");
  });
});

describe("publish validation", () => {
  const good = makePage({ id: "good", title: "Good" });
  const badDoc = makePage({ id: "bad", title: "Bad", doc: { blocks: [{ type: "paragraph", children: [{ type: "text", text: "- **Build version:** 0.0.0" }] }] } });

  it("reports failures by title and never blocks the valid rows", () => {
    const result = validatePagesForPublish([good, badDoc]);
    expect(result.ok).toEqual(["good"]);
    expect(result.failed.map((failure) => failure.title)).toEqual(["Bad"]);
  });

  it("validates the draft copy of a published page, not the live body", () => {
    const live = makePage({ id: "x", title: "X", draftTitle: "X (edited)", draftDoc: badDoc.doc });
    expect(validatePagesForPublish([live]).failed[0].title).toBe("X (edited)");
  });

  it("publishes only validated rows, one write each, with the draft copy as the body", async () => {
    const written: string[] = [];
    const withDraft = makePage({ id: "d", title: "D", draftTitle: "D2", draftDoc: { blocks: [{ type: "paragraph", children: [{ type: "text", text: "New" }] }] } });
    const result = await publishPages([good, badDoc, withDraft], async (input) => void written.push(`${input.id}:${input.title}`), "note");
    expect(written).toEqual(["good:Good", "d:D2"]);
    expect(result.ok).toEqual(["good", "d"]);
    expect(result.failed.map((failure) => failure.id)).toEqual(["bad"]);
  });

  it("keeps going when one write fails and reports it", async () => {
    const result = await publishPages([good, makePage({ id: "other", title: "Other" })], async (input) => {
      if (input.id === "good") throw new Error("boom");
    }, "note");
    expect(result.ok).toEqual(["other"]);
    expect(result.failed).toEqual([{ id: "good", title: "Good", message: "boom" }]);
  });
});
