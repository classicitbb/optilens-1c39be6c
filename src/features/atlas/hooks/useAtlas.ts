import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminRoleSafe } from "@/contexts/AdminRoleContext";
import { useRolePermissions, type Feature } from "@/hooks/useRolePermissions";
import { canViewContextSlug } from "@/lib/wikiPermissions";
import { useToast } from "@/hooks/use-toast";
import { resolveCapabilities, NO_CAPABILITIES, type AtlasCapabilities, type AtlasPermissionContext } from "../capabilities";
import { getAtlasSpace, listAtlasSpaces, pageInSpace, type AtlasSpaceDef } from "../spaces";
import { createHelpArticlesSource } from "../source/helpArticlesSource";
import type { AtlasPage, AtlasSource, AtlasVersion, AutosaveInput, NewPageInput, PlacementMove, PublishInput } from "../source/types";

const EMPTY_PAGES: AtlasPage[] = [];

/** Query keys other parts of the app (public site, help panel) still read; an Atlas write refreshes them too. */
const SHARED_KEYS = [["help_articles"], ["help_articles_all"], ["content_articles"], ["public_knowledge"], ["sop_articles"], ["wiki_headings"], ["help_article_versions"]];

/** The user's capabilities in every registered space, from the host's permission system. */
export const useAtlasCapabilities = () => {
  const { canView, canEditFeature, isLoading } = useRolePermissions();
  const adminRole = useAdminRoleSafe();
  const context = useMemo<AtlasPermissionContext>(
    () => ({
      canViewFeature: (feature) => canView(feature as Feature),
      canEditFeature: (feature) => canEditFeature(feature as Feature),
      adminRole: { hasAccess: adminRole.hasAccess, canEdit: adminRole.canEdit, isAdmin: adminRole.isAdmin },
    }),
    [adminRole.canEdit, adminRole.hasAccess, adminRole.isAdmin, canEditFeature, canView],
  );
  const bySpace = useMemo(() => {
    const map: Record<string, AtlasCapabilities> = {};
    for (const space of listAtlasSpaces()) map[space.id] = resolveCapabilities(space, context);
    return map;
  }, [context]);
  const permissionsReady = !isLoading && !adminRole.isLoading;
  return { bySpace, permissionsReady, forSpace: (id: string) => bySpace[id] ?? NO_CAPABILITIES };
};

export const useAtlasSource = (): AtlasSource => {
  const { canView } = useRolePermissions();
  return useMemo(
    () => createHelpArticlesSource({ canViewContext: (slug) => canViewContextSlug(slug, canView) }),
    [canView],
  );
};

export const useAtlasData = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const source = useAtlasSource();
  const { permissionsReady, bySpace } = useAtlasCapabilities();
  const visibleSpaceKey = Object.entries(bySpace)
    .filter(([, caps]) => caps.view)
    .map(([id]) => id)
    .join(",");

  const pagesQuery = useQuery({
    queryKey: ["atlas", source.id, "pages", visibleSpaceKey],
    queryFn: () => source.listPages(),
    enabled: permissionsReady && visibleSpaceKey.length > 0,
  });
  const sectionsQuery = useQuery({
    queryKey: ["atlas", source.id, "sections"],
    queryFn: () => source.listSections(),
    enabled: permissionsReady && visibleSpaceKey.length > 0,
  });

  const refresh = useCallback(async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["atlas"] }), ...SHARED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))]);
  }, [queryClient]);

  const failure = (title: string) => (error: unknown) =>
    toast({ title, description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });

  const createPage = useMutation({ mutationFn: (input: NewPageInput) => source.createPage(input), onSuccess: refresh });
  const renameSection = useMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => source.renameSection(id, title), onSuccess: refresh, onError: failure("Could not rename the section") });
  const deleteSection = useMutation({ mutationFn: (id: string) => source.deleteSection(id), onSuccess: refresh, onError: failure("Could not delete the section") });
  const createSection = useMutation({ mutationFn: (title: string) => source.createSection(title), onSuccess: refresh });
  const autosave = useMutation({ mutationFn: (input: AutosaveInput) => source.autosave(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["atlas", source.id, "pages"] }) });
  const saveVersion = useMutation({ mutationFn: (input: PublishInput) => source.saveVersion(input), onSuccess: refresh });
  const discardDraft = useMutation({ mutationFn: (id: string) => source.discardDraft(id), onSuccess: refresh });
  const movePages = useMutation({ mutationFn: (updates: PlacementMove[]) => source.movePages(updates), onSettled: refresh, onError: failure("Move failed") });
  const patchPage = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Parameters<AtlasSource["patchPage"]>[1]) => source.patchPage(id, patch),
    onSuccess: refresh,
    onError: failure("Update failed"),
  });
  const setContexts = useMutation({ mutationFn: ({ id, slugs }: { id: string; slugs: string[] }) => source.setContexts(id, slugs), onSuccess: refresh });
  const removePage = useMutation({ mutationFn: (id: string) => source.removePage(id), onSuccess: refresh });
  const restoreVersion = useMutation({
    mutationFn: ({ id, version }: { id: string; version: AtlasVersion }) => source.restoreVersion(id, version),
    onSuccess: refresh,
  });

  return {
    source,
    pages: pagesQuery.data?.pages ?? EMPTY_PAGES,
    supportsDrafts: pagesQuery.data?.supportsDrafts ?? false,
    sections: sectionsQuery.data ?? [],
    isLoading: pagesQuery.isLoading,
    /** True once the first listing has returned (queries wait for permissions, so `isLoading` alone can read false early). */
    isLoaded: pagesQuery.isSuccess,
    isFetching: pagesQuery.isFetching,
    refresh,
    createPage: createPage.mutateAsync,
    createSection: createSection.mutateAsync,
    renameSection: renameSection.mutateAsync,
    deleteSection: deleteSection.mutateAsync,
    autosave: autosave.mutateAsync,
    saveVersion: saveVersion.mutateAsync,
    discardDraft: discardDraft.mutateAsync,
    movePages: movePages.mutateAsync,
    patchPage: patchPage.mutateAsync,
    setContexts: setContexts.mutateAsync,
    removePage: removePage.mutateAsync,
    restoreVersion: restoreVersion.mutateAsync,
  };
};

/** Pages a space shows, honouring its scope. */
export const usePagesInSpace = (space: AtlasSpaceDef | undefined, pages: AtlasPage[]) =>
  useMemo(() => (space ? pages.filter((page) => pageInSpace(space, page)) : EMPTY_PAGES), [pages, space]);

export const spaceFor = getAtlasSpace;
