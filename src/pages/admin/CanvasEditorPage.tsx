import { lazy, Suspense } from "react";

const CanvasEditorShell = lazy(() => import("@/features/admin/catalog-editor-v2/components/CanvasEditorShell"));

const CanvasEditorPage = () => (
  <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-muted-foreground">Loading editor…</div>}>
    <CanvasEditorShell />
  </Suspense>
);

export default CanvasEditorPage;
