import { describe, expect, it } from "vitest";
import { atlasLauncherRoute, resolveAtlasLauncherPins } from "@/lib/atlasLauncherPins";
import { makePage } from "./fixtures";

describe("Atlas launcher favorites", () => {
  it("resolves saved page IDs to current labels and URLs after renames", () => {
    const route = atlasLauncherRoute("page-1");
    const page = makePage({ title: "Renamed page", slug: "renamed-page" });
    expect(resolveAtlasLauncherPins([route], [page], () => true)).toEqual([
      { route, title: "Renamed page", href: "/atlas/wiki/renamed-page?articleId=page-1" },
    ]);
  });
  it("hides missing pages and pages outside the user's readable spaces", () => {
    expect(resolveAtlasLauncherPins([atlasLauncherRoute("missing")], [makePage()], () => true)).toEqual([]);
    expect(resolveAtlasLauncherPins([atlasLauncherRoute("page-1")], [makePage()], () => false)).toEqual([]);
  });
});
