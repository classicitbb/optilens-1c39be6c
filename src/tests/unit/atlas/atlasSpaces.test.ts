import { describe, expect, it } from "vitest";
import {
  BUILT_IN_SPACES,
  defaultPropsFor,
  getAtlasSpace,
  homeSpaceFor,
  listAtlasSpaces,
  pageInSavedView,
  pageInSpace,
  registerAtlasSpace,
} from "@/features/atlas/spaces";
import { deriveStoredSpace } from "@/features/atlas/source/helpArticlesSource";
import { makePage } from "./fixtures";

const wiki = getAtlasSpace("wiki")!;
const sops = getAtlasSpace("sops")!;
const website = getAtlasSpace("website")!;

describe("atlas spaces", () => {
  it("derives the stored space from content type when the column is missing or empty", () => {
    expect(deriveStoredSpace({ content_type: "wiki" })).toBe("wiki");
    expect(deriveStoredSpace({ content_type: "knowledge" })).toBe("website");
    expect(deriveStoredSpace({ content_type: "faq" })).toBe("website");
    expect(deriveStoredSpace({ content_type: "legal" })).toBe("website");
    expect(deriveStoredSpace({ content_type: "knowledge", space: null })).toBe("website");
    // A stored value wins, so a page can be moved between spaces without touching its type.
    expect(deriveStoredSpace({ content_type: "wiki", space: "website" })).toBe("website");
  });

  it("keeps wiki and website pages apart (the old wiki tree mixed them)", () => {
    const internal = makePage({ spaceId: "wiki" });
    const publicPage = makePage({ id: "w", spaceId: "website", props: { ...internal.props, contentType: "knowledge", visibility: "public" } });
    expect(pageInSpace(wiki, internal)).toBe(true);
    expect(pageInSpace(wiki, publicPage)).toBe(false);
    expect(pageInSpace(website, publicPage)).toBe(true);
    expect(pageInSpace(website, internal)).toBe(false);
  });

  it("SOPs is a published-only lens of the wiki, never stored on its own", () => {
    expect(sops.scope.storeSpace).toBe("wiki");
    expect(pageInSpace(sops, makePage({ status: "published" }))).toBe(true);
    expect(pageInSpace(sops, makePage({ status: "draft" }))).toBe(false);
    expect(pageInSpace(sops, makePage({ status: "archived" }))).toBe(false);
    expect(pageInSpace(sops, makePage({ props: { ...makePage().props, visibility: "public" } }))).toBe(false);
    expect(sops.allowCreate).toBe(false);
  });

  it("hides switched-off wiki pages but shows them in the website space as drafts", () => {
    const off = makePage({ props: { ...makePage().props, active: false } });
    expect(pageInSpace(wiki, off)).toBe(false);
    expect(pageInSpace(website, { ...off, spaceId: "website" })).toBe(true);
  });

  it("filters saved views by property", () => {
    const view = website.savedViews.find((candidate) => candidate.id === "faq");
    expect(pageInSavedView(view, makePage({ props: { ...makePage().props, contentType: "faq" } }))).toBe(true);
    expect(pageInSavedView(view, makePage({ props: { ...makePage().props, contentType: "legal" } }))).toBe(false);
    expect(pageInSavedView(website.savedViews[0], makePage())).toBe(true);
  });

  it("starts new pages from the saved view they are created in", () => {
    const view = (id: string) => website.savedViews.find((candidate) => candidate.id === id);
    expect(defaultPropsFor(website, view("all"))).toMatchObject({ contentType: "knowledge", visibility: "public", active: true });
    expect(defaultPropsFor(website, view("faq"))).toMatchObject({ contentType: "faq", category: "FAQ" });
    expect(defaultPropsFor(website, view("legal"))).toMatchObject({ contentType: "legal", pageSlug: "copyright" });
  });

  it("opens a stored page in the space that owns it, preferring the unfiltered one", () => {
    expect(homeSpaceFor("wiki")?.id).toBe("wiki");
    expect(homeSpaceFor("website")?.id).toBe("website");
    expect(homeSpaceFor("nope")).toBeUndefined();
  });

  it("adds a space by registration alone", () => {
    registerAtlasSpace({ ...BUILT_IN_SPACES[0], id: "imported", label: "Imported", scope: { storeSpace: "imported" } });
    expect(listAtlasSpaces().some((space) => space.id === "imported")).toBe(true);
    expect(pageInSpace(getAtlasSpace("imported")!, makePage({ spaceId: "imported" }))).toBe(true);
  });
});
