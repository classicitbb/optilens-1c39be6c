import { describe, expect, it } from "vitest";
import { ancestorsOf, descendantsOf, planPageMove, type TreePage } from "@/features/atlas/components/pageTreeLogic";

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
