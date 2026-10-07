import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { sameJson } from "@/lib/stableJson";
import { slugifyHelpValue } from "@/lib/helpCenter";
import { uniqueSlug } from "@/hooks/useHelpArticles";
import { validateForSave } from "../publishValidation";
import { toPageSlug } from "../pageTree";
import type { useAtlasData } from "./useAtlas";
import type { AtlasDoc, AtlasPage, AtlasProps, AtlasStatus } from "../source/types";

/**
 * The editing session for one page: draft state, autosave, publish. The full-page editor and the
 * database peek both use it, which is what makes "one editor, one write path" true.
 */
export interface DraftForm {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  entryKind: "article" | "link";
  href: string;
  doc: AtlasDoc;
  sectionId: string;
  parentId: string;
  sortOrder: string;
  status: AtlasStatus;
  contexts: string[];
  props: AtlasProps;
}

export const EMPTY_DRAFT: DraftForm = {
  title: "",
  slug: "",
  summary: "",
  entryKind: "article",
  href: "",
  doc: { blocks: [] },
  sectionId: "",
  parentId: "none",
  sortOrder: "0",
  status: "draft",
  contexts: [],
  props: {},
};

export const buildDraftFromPage = (page: AtlasPage): DraftForm => ({
  id: page.id,
  title: page.draftTitle ?? page.title,
  // A legacy row without a stored slug keeps an empty one: its URL is derived and never backfilled.
  slug: page.slug ?? "",
  summary: page.summary,
  entryKind: page.entryKind,
  href: page.href,
  doc: page.draftDoc ?? page.doc,
  sectionId: page.sectionId ?? "",
  parentId: page.parentId ?? "none",
  sortOrder: String(page.sortOrder ?? 0),
  status: page.status,
  contexts: page.contexts,
  props: page.props,
});

type Data = ReturnType<typeof useAtlasData>;
export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

interface Options {
  page: AtlasPage | null;
  pages: AtlasPage[];
  data: Pick<Data, "autosave" | "saveVersion" | "discardDraft" | "setContexts" | "refresh" | "supportsDrafts">;
  canEdit: boolean;
  canPublish: boolean;
  /** Called when autosave settles a new slug for an unpublished page. */
  onSlugChanged?: (slug: string) => void | Promise<void>;
  /** Called after a successful Publish/Update/Save with the page's final slug. */
  onSaved?: (slug: string) => void;
  initialMode?: "view" | "edit";
  /** The current URL slug is being edited: keep the route and a changed slug in step. */
  routeSlug?: string;
}

export const usePageEditor = ({ page, pages, data, canEdit, canPublish, onSlugChanged, onSaved, initialMode = "view", routeSlug }: Options) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // Bumped whenever the draft is (re)loaded from the server so the block editor remounts with it.
  const [editorEpoch, setEditorEpoch] = useState(0);
  const loadedRef = useRef<{ id?: string; version?: number; title?: string; status?: string; section?: string | null; parent?: string | null; sort?: number }>({});
  const pendingAutosave = useRef<null | (() => Promise<void>)>(null);

  // Load the draft when the page or its saved version changes. When the server copy changes under
  // the same version (autosave, rename, status, move) only the metadata that changed is merged in,
  // so a background refetch never wipes unsaved edits.
  useEffect(() => {
    if (!page) {
      loadedRef.current = {};
      if (!routeSlug) {
        setMode(initialMode);
        setDraft(EMPTY_DRAFT);
      }
      return;
    }
    const prev = loadedRef.current;
    const samePage = prev.id === page.id;
    loadedRef.current = {
      id: page.id,
      version: page.version,
      title: page.draftTitle ?? page.title,
      status: page.status,
      section: page.sectionId,
      parent: page.parentId,
      sort: page.sortOrder,
    };

    if (!samePage || prev.version !== page.version) {
      setDraft(buildDraftFromPage(page));
      if (!samePage) setMode(initialMode);
      setEditorEpoch((epoch) => epoch + 1);
      setSaveState("idle");
      return;
    }

    setDraft((current) => ({
      ...current,
      title: current.title === prev.title ? (page.draftTitle ?? page.title) : current.title,
      status: prev.status !== page.status ? page.status : current.status,
      sectionId: prev.section !== page.sectionId ? (page.sectionId ?? "") : current.sectionId,
      parentId: prev.parent !== page.parentId ? (page.parentId ?? "none") : current.parentId,
      sortOrder: prev.sort !== page.sortOrder ? String(page.sortOrder) : current.sortOrder,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSlug, page?.id, page?.version, page?.updatedAt, page?.title, page?.draftTitle, page?.status, page?.sectionId, page?.parentId, page?.sortOrder]);

  const saved = useMemo(() => (page ? buildDraftFromPage(page) : null), [page]);
  const dirty = useMemo(() => Boolean(saved) && !sameJson(draft, saved), [draft, saved]);

  // Autosave, 800 ms after the last change. What it writes depends on the page:
  //  - settings (summary, link target, placement, properties, contexts) apply to the live page
  //    straight away, like a tree move; the slug too while the page is not published;
  //  - the body and title go to the live page for pages that are not published, and to the
  //    draft copy for published pages (so the public page only changes on Update);
  //  - a published page whose project has no draft-copy columns keeps body edits local.
  const isPublished = page?.status === "published";
  const bodyRoute: "live" | "draft" | "local" = isPublished ? (data.supportsDrafts ? "draft" : "local") : "live";
  const draftLoaded = draft.id !== undefined && draft.id === page?.id;
  const bodyChanged = Boolean(saved) && draftLoaded && (draft.title !== saved!.title || !sameJson(draft.doc, saved!.doc));
  const metaChanged =
    Boolean(saved) &&
    draftLoaded &&
    (draft.summary !== saved!.summary ||
      draft.entryKind !== saved!.entryKind ||
      draft.href !== saved!.href ||
      draft.sectionId !== saved!.sectionId ||
      draft.parentId !== saved!.parentId ||
      draft.sortOrder !== saved!.sortOrder ||
      !sameJson(draft.props, saved!.props) ||
      (!isPublished && draft.slug !== saved!.slug));
  const contextsChanged = Boolean(saved) && draftLoaded && !sameJson(draft.contexts, saved!.contexts);
  const writable = canEdit && draftLoaded && ((bodyChanged && bodyRoute !== "local") || metaChanged || contextsChanged);

  useEffect(() => {
    if (!page || !writable) {
      pendingAutosave.current = null;
      setSaveState((state) => (state === "pending" ? "idle" : state));
      return;
    }
    const { id } = page;
    const run = async () => {
      setSaveState("saving");
      try {
        const writeBody = bodyChanged && bodyRoute !== "local";
        let nextSlug: string | undefined;
        let meta: Parameters<Data["autosave"]>[0]["meta"];
        if (metaChanged) {
          meta = {
            summary: draft.summary,
            entryKind: draft.entryKind,
            href: draft.href,
            sectionId: draft.sectionId || null,
            parentId: draft.parentId === "none" ? null : draft.parentId,
            sortOrder: Number.parseInt(draft.sortOrder || "0", 10) || 0,
            props: draft.props,
          };
          if (!isPublished && draft.slug !== saved?.slug) {
            nextSlug = uniqueSlug(
              slugifyHelpValue(draft.slug) || slugifyHelpValue(draft.title),
              pages.filter((other) => other.id !== id).map((other) => other.slug),
            );
            meta.slug = nextSlug;
          }
        }
        await data.autosave({
          id,
          ...(writeBody ? { title: draft.title.trim() || "Untitled", doc: draft.doc, asDraft: bodyRoute === "draft" } : {}),
          meta,
        });
        if (contextsChanged) await data.setContexts({ id, slugs: draft.contexts });
        setSaveState("saved");
        if (nextSlug && nextSlug !== draft.slug) setDraft((current) => ({ ...current, slug: nextSlug as string }));
        if (nextSlug && routeSlug && routeSlug !== nextSlug) await onSlugChanged?.(nextSlug);
      } catch {
        setSaveState("error");
      }
    };
    setSaveState("pending");
    pendingAutosave.current = run;
    const timer = window.setTimeout(() => {
      pendingAutosave.current = null;
      void run();
    }, 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, writable, page?.id]);

  // Leaving the page (or this screen) with a change still waiting out its 800 ms writes it now.
  useEffect(
    () => () => {
      const flush = pendingAutosave.current;
      pendingAutosave.current = null;
      if (flush) void flush();
    },
    [page?.id],
  );

  // Body edits that cannot be saved anywhere yet (published page, no draft copy): warn before leaving.
  const localOnlyEdits = bodyChanged && bodyRoute === "local";
  useEffect(() => {
    if (!localOnlyEdits) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [localOnlyEdits]);

  const hasUnpublishedDraft = Boolean(page && isPublished && page.draftDoc);
  const saveLabel = !page
    ? null
    : saveState === "saving" || saveState === "pending"
      ? "Saving…"
      : saveState === "error"
        ? "Autosave failed"
        : dirty
          ? "Unsaved changes"
          : hasUnpublishedDraft
            ? "Unpublished changes"
            : saveState === "saved"
              ? "Saved"
              : null;

  const discardUnpublished = useCallback(async () => {
    if (!page) return;
    try {
      await data.discardDraft(page.id);
      setDraft(buildDraftFromPage({ ...page, draftTitle: null, draftDoc: null }));
      setEditorEpoch((epoch) => epoch + 1);
      setSaveState("idle");
      toast({ title: "Unpublished changes discarded" });
    } catch (error) {
      toast({ title: "Could not discard changes", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }, [data, page, toast]);

  /** Save as a new version. Publishing is blocked unless both validators pass. */
  const saveAs = useCallback(
    async (nextStatus: AtlasStatus) => {
      if (!page) return;
      if (!draft.title.trim()) {
        toast({ title: "Title required", description: "Add a title before saving.", variant: "destructive" });
        return;
      }
      if (draft.entryKind === "link" && !draft.href.trim()) {
        toast({ title: "Link target required", description: "Linked entries need a target URL.", variant: "destructive" });
        return;
      }
      const check = validateForSave(draft.entryKind, draft.doc, nextStatus, draft.props.visibility);
      if (!check.valid) {
        toast({ title: nextStatus === "published" ? "Cannot publish" : "Cannot save", description: check.message, variant: "destructive" });
        return;
      }
      if (nextStatus === "published" && !canPublish) {
        toast({ title: "Publishing permission required", variant: "destructive" });
        return;
      }
      setIsSaving(true);
      try {
        const slug = draft.slug.trim() || null;
        const result = await data.saveVersion({
          id: page.id,
          version: page.version,
          spaceId: page.spaceId,
          title: draft.title.trim(),
          slug,
          summary: draft.summary,
          entryKind: draft.entryKind,
          href: draft.href,
          doc: draft.doc,
          sectionId: draft.sectionId || null,
          parentId: draft.parentId === "none" ? null : draft.parentId,
          sortOrder: Number.parseInt(draft.sortOrder || "0", 10) || 0,
          status: nextStatus,
          contexts: draft.contexts,
          props: draft.props,
        });
        toast({ title: nextStatus === "published" ? "Published" : "Saved" });
        if (result && result.historyRecorded === false) {
          toast({
            title: "Saved, but no version was recorded",
            description: "The version history table is missing on this project, so this change cannot be restored later.",
            variant: "destructive",
          });
        }
        setMode("view");
        onSaved?.(slug ?? toPageSlug({ id: page.id, title: draft.title, slug: page.slug }));
      } catch (error) {
        toast({ title: "Save failed", description: error instanceof Error ? error.message : "Something went wrong while saving. Please try again.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    },
    [canPublish, data, draft, onSaved, page, toast],
  );

  /** Replace the document (an accepted Iris proposal): the editor remounts with it and autosave takes over. */
  const applyDoc = useCallback((doc: AtlasDoc) => {
    setDraft((current) => ({ ...current, doc: current.doc.lock ? { ...doc, lock: current.doc.lock } : doc }));
    setEditorEpoch((epoch) => epoch + 1);
  }, []);

  return {
    mode,
    setMode,
    applyDoc,
    draft,
    setDraft,
    isSaving,
    saveState,
    saveLabel,
    dirty,
    editorEpoch,
    isPublished,
    bodyChanged,
    bodyRoute,
    hasUnpublishedDraft,
    localOnlyEdits,
    discardUnpublished,
    saveAs,
  };
};
