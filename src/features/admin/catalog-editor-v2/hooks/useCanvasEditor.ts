import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CanvasObject, CanvasPage, EditorState, CanvasObjectType } from "../types";

const DEFAULT_EDITOR_STATE: EditorState = {
  selectedObjectId: null,
  zoom: 100,
  activePageId: null,
  activeTab: "style",
  isDragging: false,
  isResizing: false,
};

export const useCanvasEditor = (templateId: number) => {
  const qc = useQueryClient();
  const [editorState, setEditorState] = useState<EditorState>(DEFAULT_EDITOR_STATE);
  const undoStack = useRef<CanvasObject[][]>([]);
  const redoStack = useRef<CanvasObject[][]>([]);
  const objectsQueryKey = ["catalog-page-objects", editorState.activePageId];

  // Fetch pages
  const pagesQuery = useQuery({
    queryKey: ["catalog-pages", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_pages") as any)
        .select("*")
        .eq("catalog_template_id", templateId)
        .order("page_number");
      if (error) throw error;
      return (data ?? []) as unknown as CanvasPage[];
    },
    enabled: !!templateId,
  });

  // Fetch objects for active page
  const objectsQuery = useQuery({
    queryKey: ["catalog-page-objects", editorState.activePageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_page_objects") as any)
        .select("*")
        .eq("page_id", editorState.activePageId!)
        .order("z_index");
      if (error) throw error;
      return (data ?? []) as unknown as CanvasObject[];
    },
    enabled: !!editorState.activePageId,
  });

  // Auto-select first page
  const pages = pagesQuery.data ?? [];

  useEffect(() => {
    if (pages.length > 0 && !editorState.activePageId) {
      setEditorState((s) => ({ ...s, activePageId: pages[0].id }));
    }
  }, [pages, editorState.activePageId]);

  // Create initial page if none exist
  const createPageMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("catalog_pages") as any)
        .insert({ catalog_template_id: templateId, page_number: (pages.length || 0) + 1 } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CanvasPage;
    },
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ["catalog-pages", templateId] });
      setEditorState((s) => ({ ...s, activePageId: page.id }));
    },
  });

  // Update object position/size
  const updateObjectMutation = useMutation({
    mutationFn: async (obj: Partial<CanvasObject> & { id: string }) => {
      const { id, ...updates } = obj;
      const { error } = await supabase
        .from("catalog_page_objects") as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (obj) => {
      await qc.cancelQueries({ queryKey: objectsQueryKey });
      const previous = qc.getQueryData<CanvasObject[]>(objectsQueryKey) ?? [];
      qc.setQueryData<CanvasObject[]>(objectsQueryKey, previous.map((current) => (
        current.id === obj.id
          ? { ...current, ...obj }
          : current
      )));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(objectsQueryKey, context.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: objectsQueryKey });
    },
  });

  // Add new object
  const addObjectMutation = useMutation({
    mutationFn: async (obj: Omit<CanvasObject, "id">) => {
      const { data, error } = await supabase
        .from("catalog_page_objects") as any)
        .insert(obj as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CanvasObject;
    },
    onMutate: async (obj) => {
      await qc.cancelQueries({ queryKey: objectsQueryKey });
      const previous = qc.getQueryData<CanvasObject[]>(objectsQueryKey) ?? [];
      const optimisticId = `optimistic-${Date.now()}`;
      qc.setQueryData<CanvasObject[]>(objectsQueryKey, [
        ...previous,
        { ...obj, id: optimisticId },
      ]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(objectsQueryKey, context.previous);
      }
    },
    onSuccess: (obj) => {
      qc.invalidateQueries({ queryKey: objectsQueryKey });
      setEditorState((s) => ({ ...s, selectedObjectId: obj.id }));
    },
  });

  // Delete object
  const deleteObjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("catalog_page_objects") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: objectsQueryKey });
      const previous = qc.getQueryData<CanvasObject[]>(objectsQueryKey) ?? [];
      qc.setQueryData<CanvasObject[]>(objectsQueryKey, previous.filter((obj) => obj.id !== id));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(objectsQueryKey, context.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: objectsQueryKey });
      setEditorState((s) => ({ ...s, selectedObjectId: null }));
    },
  });

  const selectObject = useCallback((id: string | null) => {
    setEditorState((s) => ({ ...s, selectedObjectId: id }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setEditorState((s) => ({ ...s, zoom: Math.max(40, Math.min(200, zoom)) }));
  }, []);

  const setActiveTab = useCallback((tab: EditorState["activeTab"]) => {
    setEditorState((s) => ({ ...s, activeTab: tab }));
  }, []);

  const setActivePage = useCallback((pageId: string) => {
    setEditorState((s) => ({ ...s, activePageId: pageId, selectedObjectId: null }));
  }, []);

  const insertObject = useCallback(
    async (type: CanvasObjectType, overrides?: Partial<CanvasObject>) => {
      if (!editorState.activePageId) return;
      const objects = objectsQuery.data ?? [];
      const maxZ = objects.reduce((m, o) => Math.max(m, o.z_index), 0);
      const { id: _ignoredId, page_id: _ignoredPageId, ...safeOverrides } = overrides ?? {};

      const defaults: Record<string, Partial<CanvasObject>> = {
        text: { width: 288, height: null, content: { text: "Text block" }, style: { fontSize: 12, fontFamily: "Geist" } },
        image: { width: 200, height: 130, content: { src: "" }, style: { objectFit: "cover" } },
        shape_rect: { width: 200, height: 120, style: { fill: "hsl(var(--accent) / 0.1)", stroke: "hsl(var(--accent) / 0.3)", strokeWidth: 1.5, borderRadius: 4 } },
        shape_circle: { width: 160, height: 160, style: { fill: "hsl(var(--accent) / 0.1)", stroke: "hsl(var(--accent) / 0.3)", strokeWidth: 1.5 } },
        shape_line: { width: 300, height: 2, style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 } },
        pricing_block: { width: 504, height: null, content: { section_type: "rx_prices", pricelist_version_id: null, format: "list", custom_title: "" }, style: {} },
        article_block: { width: 504, height: null, content: { article_id: null, text_mode: "full" }, style: {} },
        table: { width: 504, height: null, content: { rows: 4, cols: 3, data: [] }, style: {} },
      };

      const base = defaults[type] ?? {};
      return addObjectMutation.mutateAsync({
        page_id: editorState.activePageId,
        object_type: type,
        x: 28,
        y: 100 + (objects.length * 20),
        width: 200,
        height: null,
        rotation: 0,
        z_index: maxZ + 1,
        content: {},
        style: {},
        is_locked: false,
        is_visible: true,
        label: null,
        ...base,
        ...safeOverrides,
      } as Omit<CanvasObject, "id">);
    },
    [editorState.activePageId, objectsQuery.data, addObjectMutation]
  );

  const updateObject = useCallback(
    async (obj: Partial<CanvasObject> & { id: string }) => updateObjectMutation.mutateAsync(obj),
    [updateObjectMutation],
  );

  const deleteObject = useCallback(
    async (id: string) => deleteObjectMutation.mutateAsync(id),
    [deleteObjectMutation],
  );

  const addPage = useCallback(
    async () => createPageMutation.mutateAsync(),
    [createPageMutation],
  );

  return {
    editorState,
    setEditorState,
    pages,
    pagesLoading: pagesQuery.isLoading,
    objects: objectsQuery.data ?? [],
    objectsLoading: objectsQuery.isLoading,
    selectObject,
    setZoom,
    setActiveTab,
    setActivePage,
    insertObject,
    updateObject,
    deleteObject,
    addPage,
    undoStack,
    redoStack,
  };
};
