import { atlasPath } from "@/features/atlas/config";
import { homeSpaceFor } from "@/features/atlas/spaces";
import { toPageSlug } from "@/features/atlas/pageTree";
import type { AtlasPage } from "@/features/atlas/source/types";

const PREFIX = "/admin/knowledge/wiki?articleId=";
export const atlasLauncherRoute = (id: string) => PREFIX + encodeURIComponent(id);
export const atlasLauncherPageId = (route: string) => {
  if (!route.startsWith(PREFIX)) return null;
  try { return decodeURIComponent(route.slice(PREFIX.length)); } catch { return null; }
};

export function resolveAtlasLauncherPins(routes: string[], pages: AtlasPage[], canView: (space: string) => boolean) {
  return routes.flatMap((route) => {
    const page = pages.find((candidate) => candidate.id === atlasLauncherPageId(route));
    const space = page && homeSpaceFor(page.spaceId);
    if (!page || !space || !canView(space.id)) return [];
    return [{ route, title: page.title || "Untitled", href: atlasPath(space.id, toPageSlug(page)) + `?articleId=${encodeURIComponent(page.id)}` }];
  });
}
