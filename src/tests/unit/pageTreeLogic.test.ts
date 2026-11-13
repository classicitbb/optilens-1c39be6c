import { describe, expect, it } from "vitest";
import { ancestorsOf, descendantsOf, planPageMove, planSectionMove, sectionAncestorsOf, type TreePage, type TreeSection } from "@/features/atlas/components/pageTreeLogic";

const page = (id: string, over: Partial<TreePage> = {}): TreePage => ({
  id,
  title: id,
  parent_id: null,
  section_id: "s1",
  sort_order: 0,
  status: "published",
  ...over,
});

// s1: a(0), b(1), c(2)    b has child b1 -> b1a
const pages: TreePage[] = [
  page("a", { sort_order: 0 }),
  page("b", { sort_order: 1 }),
  page("c", { sort_order: 2 }),
  page("b1", { parent_id: "b" }),
  page("b1a", { parent_id: "b1" }),
  page("x", { section_id: "s2" }),
];

describe("planPageMove", () => {
  it("reorders siblings and renumbers them", () => {
    const updates = planPageMove(pages, "c", "a", "before");
    expect(updates).toEqual(
      expect.arrayContaining([
        { id: "c", parent_id: null, section_id: "s1", sort_order: 0 },
        { id: "a", parent_id: null, section_id: "s1", sort_order: 1 },
        { id: "b", parent_id: null, section_id: "s1", sort_order: 2 },
      ]),
    );
    expect(updates).toHaveLength(3);
  });

  it("nests a page inside another and puts it last", () => {
    const updates = planPageMove(pages, "a", "c", "inside");
    expect(updates).toEqual(
      expect.arrayContaining([{ id: "a", parent_id: "c", section_id: "s1", sort_order: 0 }]),
    );
  });

  it("blocks dropping a page onto itself or into its own subtree", () => {
    expect(planPageMove(pages, "b", "b", "inside")).toBeNull();
    expect(planPageMove(pages, "b", "b1", "inside")).toBeNull();
    expect(planPageMove(pages, "b", "b1a", "after")).toBeNull();
  });

  it("moves onto a section row and carries descendants into the new section", () => {
    const updates = planPageMove(pages, "b", "heading:s2", "inside") ?? [];
    expect(updates).toContainEqual({ id: "b", parent_id: null, section_id: "s2", sort_order: 1 });
    expect(updates).toContainEqual({ id: "b1", parent_id: "b", section_id: "s2", sort_order: 0 });
    expect(updates).toContainEqual({ id: "b1a", parent_id: "b1", section_id: "s2", sort_order: 0 });
  });

  it("does not allow before/after a section row", () => {
    expect(planPageMove(pages, "a", "heading:s2", "before")).toBeNull();
  });

  it("returns no updates when the order is unchanged", () => {
    expect(planPageMove(pages, "b", "a", "after")).toEqual([]);
  });

  it("can move a nested page back to the top level next to its former parent", () => {
    const updates = planPageMove(pages, "b1", "b", "after") ?? [];
    expect(updates).toContainEqual({ id: "b1", parent_id: null, section_id: "s1", sort_order: 2 });
    expect(updates).toContainEqual({ id: "c", parent_id: null, section_id: "s1", sort_order: 3 });
  });
});

describe("planSectionMove", () => {
  const section = (id: string, over: Partial<TreeSection> = {}): TreeSection => ({ id, title: id, parent_id: null, sort_order: 0, ...over });
  // top level: s1(0), s2(1), s3(2)    s2 holds s2a -> s2a1
  const sections: TreeSection[] = [
    section("s1", { sort_order: 0 }),
    section("s2", { sort_order: 1 }),
    section("s3", { sort_order: 2 }),
    section("s2a", { parent_id: "s2" }),
    section("s2a1", { parent_id: "s2a" }),
  ];

  it("nests a section inside another", () => {
    expect(planSectionMove(sections, "s3", "s1", "inside")).toEqual([{ id: "s3", parent_id: "s1", sort_order: 0 }]);
  });

  it("puts a nested section last among the subsections already there", () => {
    expect(planSectionMove(sections, "s1", "s2", "inside")).toContainEqual({ id: "s1", parent_id: "s2", sort_order: 1 });
  });

  it("reorders top-level sections and renumbers them", () => {
    const updates = planSectionMove(sections, "s3", "s1", "before") ?? [];
    expect(updates).toEqual(
      expect.arrayContaining([
        { id: "s3", parent_id: null, sort_order: 0 },
        { id: "s1", parent_id: null, sort_order: 1 },
        { id: "s2", parent_id: null, sort_order: 2 },
      ]),
    );
  });

  it("moves a subsection back out beside a top-level section", () => {
    const updates = planSectionMove(sections, "s2a", "s2", "after") ?? [];
    expect(updates).toContainEqual({ id: "s2a", parent_id: null, sort_order: 2 });
    expect(updates).toContainEqual({ id: "s3", parent_id: null, sort_order: 3 });
  });

  it("blocks dropping a section onto itself or into its own subsections", () => {
    expect(planSectionMove(sections, "s2", "s2", "inside")).toBeNull();
    expect(planSectionMove(sections, "s2", "s2a", "inside")).toBeNull();
    expect(planSectionMove(sections, "s2", "s2a1", "inside")).toBeNull();
    expect(planSectionMove(sections, "s2", "s2a1", "before")).toBeNull();
  });

  it("treats a subsection of a deleted section as top level", () => {
    const orphaned = [section("a", { sort_order: 0 }), section("b", { parent_id: "gone", sort_order: 1 })];
    expect(planSectionMove(orphaned, "a", "b", "after")).toEqual(
      expect.arrayContaining([{ id: "b", parent_id: "gone", sort_order: 0 }, { id: "a", parent_id: null, sort_order: 1 }]),
    );
  });

  it("lists the sections above a subsection, outermost first", () => {
    expect(sectionAncestorsOf(sections, "s2a1").map((s) => s.id)).toEqual(["s2", "s2a"]);
    expect(sectionAncestorsOf(sections, "s1")).toEqual([]);
  });
});

describe("tree helpers", () => {
  it("lists descendants", () => {
    expect(descendantsOf(pages, "b").map((p) => p.id).sort()).toEqual(["b1", "b1a"]);
  });

  it("returns the ancestor chain root-first", () => {
    expect(ancestorsOf(pages, "b1a").map((p) => p.id)).toEqual(["b", "b1"]);
    expect(ancestorsOf(pages, "a")).toEqual([]);
  });

  it("survives a corrupt parent cycle", () => {
    const cyclic = [page("p", { parent_id: "q" }), page("q", { parent_id: "p" })];
    expect(ancestorsOf(cyclic, "p").map((x) => x.id)).toEqual(["q"]);
    expect(descendantsOf(cyclic, "p").map((x) => x.id)).toEqual(["q"]);
  });
});
