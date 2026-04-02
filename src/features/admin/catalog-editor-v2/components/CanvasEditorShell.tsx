import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCatalogTemplates } from "@/hooks/useCatalogTemplates";
import { useToast } from "@/hooks/use-toast";
import { useCanvasEditor } from "../hooks/useCanvasEditor";
import CanvasToolbar from "./CanvasToolbar";
import PageThumbnailsSidebar from "./PageThumbnailsSidebar";
import EditorCanvas from "./EditorCanvas";
import PropertiesPanel from "./PropertiesPanel";
import { supabase } from "@/integrations/supabase/client";

const CanvasEditorShell = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const templateId = Number(id);
  const { data: templates = [] } = useCatalogTemplates();
  const template = templates.find((t) => t.id === templateId);

  const {
    editorState,
    pages,
    pagesLoading,
    objects,
    selectObject,
    setZoom,
    setActiveTab,
    setActivePage,
    insertObject,
    updateObject,
    deleteObject,
    addPage,
  } = useCanvasEditor(templateId);

  // Create initial page if none exist
  useEffect(() => {
    if (!pagesLoading && pages.length === 0 && templateId) {
      addPage();
    }
  }, [pagesLoading, pages.length, templateId, addPage]);

  if (!template) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading editor…</p>
      </div>
    );
  }

  const selectedObject = objects.find((o) => o.id === editorState.selectedObjectId) ?? null;

  const handleSave = async () => {
    toast({ title: "Template saved" });
  };

  const handlePublish = async () => {
    try {
      await supabase
        .from("catalog_templates")
        .update({ status: "published", updated_at: new Date().toISOString() } as any)
        .eq("id", templateId);
      toast({ title: "Catalog published successfully" });
    } catch {
      toast({ title: "Failed to publish", variant: "destructive" });
    }
  };

  const handleDuplicate = (obj: typeof objects[0]) => {
    insertObject(obj.object_type, {
      ...obj,
      x: obj.x + 20,
      y: obj.y + 20,
      label: obj.label ? `${obj.label} (copy)` : null,
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <CanvasToolbar
        templateName={template.name}
        status={(template as any).status ?? "draft"}
        zoom={editorState.zoom}
        onZoomChange={setZoom}
        onInsert={insertObject}
        onSave={handleSave}
        onPublish={handlePublish}
      />
      <div className="flex flex-1 overflow-hidden">
        <PageThumbnailsSidebar
          pages={pages}
          activePageId={editorState.activePageId}
          onSelectPage={setActivePage}
          onAddPage={() => addPage()}
        />
        <EditorCanvas
          objects={objects}
          selectedObjectId={editorState.selectedObjectId}
          zoom={editorState.zoom}
          onSelectObject={selectObject}
          onUpdateObject={updateObject}
        />
        <PropertiesPanel
          selectedObject={selectedObject}
          activeTab={editorState.activeTab}
          onTabChange={setActiveTab}
          onUpdate={updateObject}
          onDelete={deleteObject}
          onDuplicate={handleDuplicate}
        />
      </div>
    </div>
  );
};

export default CanvasEditorShell;
